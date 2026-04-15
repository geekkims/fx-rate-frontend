import { ethers } from 'ethers'
import { NextRequest, NextResponse } from 'next/server'

const ERC20_ABI = [
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transfer_id, from_address, to_address, amount, token_address, secret } = body

    if (secret !== process.env.BLOCKCHAIN_INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY!, provider)
    const token = new ethers.Contract(token_address, ERC20_ABI, operatorWallet)

    const decimals: number = await token.decimals()
    const parsedAmount = ethers.parseUnits(String(amount), decimals)

    const tx = await token.transferFrom(from_address, to_address, parsedAmount)

    return NextResponse.json({ tx_hash: tx.hash, transfer_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blockchain error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
