'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

interface User { id: number; username: string; role: string }

const Icons = {
  shield: <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white"><path d="M16 2L4 7v9c0 7.18 5.22 13.9 12 15.93C22.78 29.9 28 23.18 28 16V7L16 2z"/></svg>,
  grid: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  wallet: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a2 2 0 100 4 2 2 0 000-4z"/></svg>,
  qr: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 17h2m2 0h2M17 15v2M21 21v-2M17 21h2"/></svg>,
  transfer: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>,
  logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/></svg>,
  link: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.5-1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.5 1.5"/></svg>,
  copy: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  menu: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
}

const navItems = [
  { href: '/dashboard',           label: 'Overview',   icon: Icons.grid },
  { href: '/dashboard/accounts',  label: 'Accounts',   icon: Icons.wallet },
  { href: '/dashboard/sessions',  label: 'Sessions',   icon: Icons.qr },
  { href: '/dashboard/transfers', label: 'Transfers',  icon: Icons.transfer },
]

const pageTitles: Record<string, string> = {
  '/dashboard':           'Overview',
  '/dashboard/accounts':  'Accounts',
  '/dashboard/sessions':  'Sessions',
  '/dashboard/transfers': 'Transfers',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [user, setUser]               = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/login'); return }

    api.get('/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.replace('/login')
      })
  }, [router])

  async function handleLogout() {
    try { await api.post('/logout') } catch { /**/ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  async function generateLink() {
    setGenerating(true); setGeneratedUrl('')
    try {
      const r = await api.post('/sessions')
      setGeneratedUrl(r.data.connect_url)
    } catch { /**/ }
    finally { setGenerating(false) }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return null

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            {Icons.shield}
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">ConnectWallet</p>
            <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
            {user.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.username}</p>
            <p className="text-slate-400 text-xs capitalize">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors p-1" title="Logout">
            {Icons.logout}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 min-h-screen shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700">
            {Icons.menu}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{pageTitles[pathname] ?? 'Dashboard'}</h1>
          </div>
          <button onClick={generateLink} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all">
            {Icons.link}
            {generating ? 'Generating...' : 'New Connect Link'}
          </button>
        </header>

        {/* Generated URL bar */}
        {generatedUrl && (
          <div className="mx-6 mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">{Icons.link}</div>
            <p className="text-indigo-700 text-sm font-mono flex-1 truncate">{generatedUrl}</p>
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>
              {copied ? Icons.check : Icons.copy}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={generatedUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors">
              Open
            </a>
          </div>
        )}

        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
