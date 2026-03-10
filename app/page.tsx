'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthMode = 'landing' | 'login' | 'signup'

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard')
      else setChecking(false)
    })
  }, [router])

  const handleSignup = async () => {
    if (!email || !password || !username) { setError('Fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, username })
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!email || !password) { setError('Fill in all fields.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
    setLoading(false)
  }

  if (checking) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.06)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,0,0,0.8)_0%,_transparent_60%)]" />

      <div className="relative z-10 w-full max-w-sm">

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="font-display text-7xl font-black text-gold glow-gold tracking-widest">CARO</h1>
          <p className="font-body text-lg text-parchment/60 mt-2 italic">A living town. An AI world.</p>
        </div>

        {mode === 'landing' && (
          <div className="space-y-3">
            <button onClick={() => setMode('signup')}
              className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 30px rgba(201,168,76,0.3)' }}>
              Begin Your Story
            </button>
            <button onClick={() => setMode('login')}
              className="w-full py-4 rounded-xl font-ui font-semibold text-gold/80 text-sm tracking-wide border transition-all active:scale-[0.98]"
              style={{ borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}>
              Continue Where You Left Off
            </button>
            <p className="text-center text-xs text-parchment/20 font-ui mt-6 leading-relaxed">
              Your choices shape the town.<br />The town remembers everything.
            </p>
          </div>
        )}

        {(mode === 'signup' || mode === 'login') && (
          <div className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-1.5">Your Name</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="What shall people call you?"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/50" />
              </div>
            )}
            <div>
              <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-1.5">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="your@email.com"
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-1.5">Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignup() : handleLogin())}
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/50" />
            </div>

            {error && <p className="text-red-400 text-xs font-ui text-center">{error}</p>}

            <button
              onClick={mode === 'signup' ? handleSignup : handleLogin}
              disabled={loading}
              className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 20px rgba(201,168,76,0.25)' }}>
              {loading ? 'One moment...' : mode === 'signup' ? 'Enter Caro' : 'Return to Caro'}
            </button>

            <button onClick={() => { setMode('landing'); setError('') }}
              className="w-full py-2 text-xs font-ui text-parchment/30">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
