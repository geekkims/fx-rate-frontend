import { ethers } from 'ethers'
import { NextRequest, NextResponse } from 'next/server'

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

// RPC + USDT contract per chain
const CHAIN_CONFIG: Record<string, { rpc: string; token: string }> = {
  'eip155:1':  {
    rpc:   'https://ethereum.publicnode.com',
    token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Ethereum
  },
  'eip155:56': {
    rpc:   process.env.RPC_URL || 'https://bsc-dataseed.binance.org/',
    token: '0x55d398326f99059fF775485246999027B3197955', // USDT BSC
  },
}

export async function POST(req: NextRequest) {
  try {
    const { accounts, secret } = await req.json()
    // accounts = [{ address, chain_id }]

    if (secret !== process.env.BLOCKCHAIN_INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ balances: {} })
    }

    // Group by chain
    const byChain: Record<string, { address: string }[]> = {}
    for (const a of accounts) {
      const chain = a.chain_id || 'eip155:56'
      if (!byChain[chain]) byChain[chain] = []
      byChain[chain].push({ address: a.address })
    }

    const balances: Record<string, string> = {}

    await Promise.allSettled(
      Object.entries(byChain).map(async ([chainId, addrs]) => {
        const cfg = CHAIN_CONFIG[chainId] ?? CHAIN_CONFIG['eip155:56']
        const provider = new ethers.JsonRpcProvider(cfg.rpc)
        const token    = new ethers.Contract(cfg.token, ERC20_ABI, provider)
        const decimals: number = await token.decimals()

        await Promise.allSettled(
          addrs.map(async ({ address }) => {
            const raw: bigint = await token.balanceOf(address)
            balances[address.toLowerCase()] = ethers.formatUnits(raw, decimals)
          })
        )
      })
    )

    return NextResponse.json({ balances })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blockchain error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
