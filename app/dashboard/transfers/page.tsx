'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'

interface Account {
  id: number; account_number: string; wallet_address: string
  approved: boolean; balance: string
}
interface Transfer {
  id: number
  from_account: { account_number: string } | null
  to_account:   { account_number: string } | null
  token_symbol: string; amount: string; tx_hash: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'; created_at: string
}

const Icons = {
  transfer: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
}

export default function TransfersPage() {
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [fromId,    setFromId]    = useState('')
  const [toAddress, setToAddress] = useState('')
  const [amount,    setAmount]    = useState('')
  const [sending,   setSending]   = useState(false)
  const [txError,   setTxError]   = useState('')
  const [txSuccess, setTxSuccess] = useState('')

  const loadAccounts  = useCallback(async () => { try { setAccounts((await api.get('/accounts')).data) } catch { /**/ } }, [])
  const loadTransfers = useCallback(async () => { try { setTransfers((await api.get('/transfers')).data.data ?? []) } catch { /**/ } }, [])

  useEffect(() => { loadAccounts(); loadTransfers() }, [loadAccounts, loadTransfers])

  const tokenSymbol = process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'USDT'

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault(); setTxError(''); setTxSuccess(''); setSending(true)
    try {
      const r = await api.post('/transfers', { from_account_id: fromId, to_address: toAddress, amount })
      setTxSuccess(`Submitted! TX: ${r.data.tx_hash ?? 'pending'}`)
      setFromId(''); setToAddress(''); setAmount('')
      loadTransfers(); setTimeout(loadAccounts, 5000)
    } catch (err: unknown) {
      setTxError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Transfer failed')
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-1">New Transfer</h2>
        <p className="text-slate-400 text-sm mb-5">
          Move {tokenSymbol} between approved accounts. No TrustWallet interaction required.
        </p>
        <form onSubmit={handleTransfer} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">From Account</label>
            <select required value={fromId} onChange={e => setFromId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
              <option value="">Select account</option>
              {accounts.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.account_number} — {parseFloat(a.balance || '0').toFixed(2)} {tokenSymbol}{a.approved ? '' : ' ⚠ not authorized'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              To Address
              <span className="ml-1 text-slate-400 font-normal">(paste or pick saved)</span>
            </label>
            <input
              required
              list="saved-accounts"
              value={toAddress}
              onChange={e => setToAddress(e.target.value)}
              placeholder="0x... or select saved account"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
            />
            <datalist id="saved-accounts">
              {accounts.filter(a => String(a.id) !== fromId).map(a => (
                <option key={a.id} value={a.wallet_address}>{a.account_number}</option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount ({tokenSymbol})</label>
            <input required type="number" min="0.000001" step="any" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"/>
          </div>
          <button type="submit" disabled={sending}
            className="py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all text-sm flex items-center justify-center gap-2">
            {Icons.transfer}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
        {txError   && <div className="mt-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{txError}</div>}
        {txSuccess && <div className="mt-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl px-4 py-3">{txSuccess}</div>}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Transfer History</h2>
          <button onClick={loadTransfers} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium">
            {Icons.refresh} Refresh
          </button>
        </div>
        {transfers.length === 0
          ? <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4 text-rose-400">{Icons.transfer}</div>
              <p className="text-slate-600 font-medium">No transfers yet</p>
            </div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 text-xs">
                    {['From', 'To', 'Amount', 'Status', 'TX Hash', 'Date'].map(h => (
                      <th key={h} className="text-left px-6 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">{t.from_account?.account_number ?? '—'}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">{t.to_account?.account_number ?? '—'}</td>
                      <td className="px-6 py-4 text-xs font-mono font-medium text-slate-800">{parseFloat(t.amount).toFixed(2)} {t.token_symbol}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          t.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'failed'    ? 'bg-red-100 text-red-700' :
                                                     'bg-amber-100 text-amber-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{t.tx_hash ? `${t.tx_hash.slice(0, 12)}...` : '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  )
}
