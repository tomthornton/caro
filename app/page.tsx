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
    <div style={{ position: 'fixed', inset: 0, background: '#0e0c0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.3)', borderTop: '2px solid #c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0e0c0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
      overflow: 'hidden',
    }}>
      {/* Atmospheric glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 className="font-display" style={{
            fontSize: 80, fontWeight: 900, letterSpacing: '0.1em', lineHeight: 1,
            color: '#c9a84c',
            textShadow: '0 0 40px rgba(201,168,76,0.5), 0 0 80px rgba(201,168,76,0.2)',
            margin: 0,
          }}>CARO</h1>
          <p className="font-body" style={{ color: 'rgba(240,230,208,0.5)', fontSize: 17, fontStyle: 'italic', marginTop: 10 }}>
            A living town. An AI world.
          </p>
        </div>

        {mode === 'landing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('signup')}
              className="font-ui"
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14,
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                boxShadow: '0 0 30px rgba(201,168,76,0.35)',
                border: 'none', cursor: 'pointer',
                color: '#1a1408', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em',
              }}>
              Begin Your Story
            </button>
            <button onClick={() => setMode('login')}
              className="font-ui"
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14,
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.25)',
                cursor: 'pointer',
                color: 'rgba(201,168,76,0.75)', fontWeight: 600, fontSize: 14,
              }}>
              Continue Where You Left Off
            </button>
            <p className="font-ui" style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,230,208,0.2)', marginTop: 16, lineHeight: 1.7 }}>
              Your choices shape the town.<br />The town remembers everything.
            </p>
          </div>
        )}

        {(mode === 'signup' || mode === 'login') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label className="font-ui" style={{ display: 'block', fontSize: 10, color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Your Name</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="What shall people call you?"
                  className="font-ui"
                  style={{ width: '100%', background: '#1f1a15', border: '1px solid #3a3020', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#f0e6d0', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div>
              <label className="font-ui" style={{ display: 'block', fontSize: 10, color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="your@email.com"
                className="font-ui"
                style={{ width: '100%', background: '#1f1a15', border: '1px solid #3a3020', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#f0e6d0', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label className="font-ui" style={{ display: 'block', fontSize: 10, color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignup() : handleLogin())}
                className="font-ui"
                style={{ width: '100%', background: '#1f1a15', border: '1px solid #3a3020', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#f0e6d0', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {error && <p className="font-ui" style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{error}</p>}

            <button onClick={mode === 'signup' ? handleSignup : handleLogin} disabled={loading}
              className="font-ui"
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, marginTop: 4,
                background: loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                boxShadow: '0 0 20px rgba(201,168,76,0.25)',
                border: 'none', cursor: loading ? 'default' : 'pointer',
                color: '#1a1408', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em',
              }}>
              {loading ? 'One moment...' : mode === 'signup' ? 'Enter Caro' : 'Return to Caro'}
            </button>

            <button onClick={() => { setMode('landing'); setError('') }}
              className="font-ui"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,230,208,0.25)', fontSize: 12, padding: '8px 0' }}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
