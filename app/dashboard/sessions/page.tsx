'use client'

import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'

interface Session {
  id: number; token: string; status: 'pending' | 'connected' | 'expired'
  wallet_address: string | null; expires_at: string
  account: { account_number: string; wallet_address: string } | null
}

const Icons = {
  qr: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 17h2m2 0h2M17 15v2M21 21v-2M17 21h2"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])

  const load = useCallback(async () => {
    try { setSessions((await api.get('/sessions')).data.data ?? []) } catch { /**/ }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Connect Sessions</h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium">
          {Icons.refresh} Refresh
        </button>
      </div>

      {sessions.length === 0
        ? <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4 text-violet-400">{Icons.qr}</div>
            <p className="text-slate-600 font-medium">No sessions yet</p>
          </div>
        : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-6 py-3 font-medium">Token</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Account</th>
                  <th className="text-left px-6 py-3 font-medium">Wallet</th>
                  <th className="text-left px-6 py-3 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{s.token.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        s.status === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'expired'   ? 'bg-slate-100 text-slate-500' :
                                                   'bg-amber-100 text-amber-700'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium text-xs">{s.account?.account_number ?? '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{s.wallet_address ? `${s.wallet_address.slice(0, 12)}...` : '—'}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(s.expires_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}
