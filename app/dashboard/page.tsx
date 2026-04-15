'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

interface Account {
  id: number; account_number: string; wallet_address: string
  chain_id: string; approved: boolean; balance: string; balance_updated_at: string | null
}
interface Session {
  id: number; status: 'pending' | 'connected' | 'expired'
  account: { account_number: string } | null
}
interface Transfer {
  id: number
  from_account: { account_number: string } | null
  to_account:   { account_number: string } | null
  token_symbol: string; amount: string; tx_hash: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'; created_at: string
}

const Icons = {
  wallet: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a2 2 0 100 4 2 2 0 000-4z"/></svg>,
  coin: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  qr: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 17h2m2 0h2M17 15v2M21 21v-2M17 21h2"/></svg>,
  transfer: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>,
}

export default function OverviewPage() {
  const [accounts,  setAccounts]  = useState<Account[]>([])
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])

  const load = useCallback(async () => {
    try {
      const [a, s, t] = await Promise.all([
        api.get('/accounts'),
        api.get('/sessions'),
        api.get('/transfers'),
      ])
      setAccounts(a.data)
      setSessions(s.data.data ?? [])
      setTransfers(t.data.data ?? [])
    } catch { /**/ }
  }, [])

  useEffect(() => { load() }, [load])

  const tokenSymbol    = process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'USDT'
  const approvedCount  = accounts.filter(a => a.approved).length
  const totalBalance   = accounts.reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const activeCount    = sessions.filter(s => s.status === 'connected').length
  const submittedCount = transfers.filter(t => t.status === 'submitted').length

  const stats = [
    { label: 'Total Accounts', value: accounts.length,          sub: `${approvedCount} approved`,   color: 'from-indigo-500 to-indigo-600',   icon: Icons.wallet },
    { label: 'Total Balance',  value: totalBalance.toFixed(2),  sub: tokenSymbol,                    color: 'from-emerald-500 to-emerald-600', icon: Icons.coin },
    { label: 'Active Sessions',value: activeCount,              sub: `${sessions.length} total`,     color: 'from-violet-500 to-violet-600',   icon: Icons.qr },
    { label: 'Transfers',      value: transfers.length,         sub: `${submittedCount} submitted`,  color: 'from-rose-500 to-rose-600',       icon: Icons.transfer },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
                <p className="text-white/60 text-xs mt-1">{c.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent accounts + transfers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Recent Accounts</h2>
            <Link href="/dashboard/accounts" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          {accounts.length === 0
            ? <p className="text-slate-400 text-sm text-center py-8">No accounts yet</p>
            : <div className="space-y-3">
                {accounts.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-sm shrink-0">
                      {a.account_number.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium text-sm">{a.account_number}</p>
                      <p className="text-slate-400 text-xs font-mono truncate">{a.wallet_address.slice(0, 18)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold text-sm">{parseFloat(a.balance || '0').toFixed(2)}</p>
                      <p className="text-slate-400 text-xs">{tokenSymbol}</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Recent Transfers</h2>
            <Link href="/dashboard/transfers" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          {transfers.length === 0
            ? <p className="text-slate-400 text-sm text-center py-8">No transfers yet</p>
            : <div className="space-y-3">
                {transfers.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">{Icons.transfer}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-medium">
                        {t.from_account?.account_number ?? '—'} → {t.to_account?.account_number ?? '—'}
                      </p>
                      <p className="text-slate-400 text-xs">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-semibold text-sm">{parseFloat(t.amount).toFixed(2)} {t.token_symbol}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                        t.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                        t.status === 'failed'    ? 'bg-red-100 text-red-600' :
                                                   'bg-amber-100 text-amber-600'
                      }`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
