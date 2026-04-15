'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api.get('/me')
      .then(() => router.replace('/dashboard'))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    console.log('[login] API base URL:', process.env.NEXT_PUBLIC_API_URL)
    console.log('[login] posting to /login with:', form)
    try {
      const res = await api.post('/login', form)
      console.log('[login] success:', res.status, res.data)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data: unknown }; message?: string }
      console.error('[login] error — status:', e?.response?.status, 'body:', e?.response?.data, 'msg:', e?.message)
      setError('Invalid username or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            <svg viewBox="0 0 32 32" className="w-9 h-9 fill-white"><path d="M16 2L4 7v9c0 7.18 5.22 13.9 12 15.93C22.78 29.9 28 23.18 28 16V7L16 2z"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ConnectWallet</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your admin panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input type="text" required value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                placeholder="Enter username"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" required value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
                placeholder="Enter password"/>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all text-sm">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
