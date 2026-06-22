import { useState } from 'react'
import { useAuth } from '../context/AuthProvider'

type AuthMode = 'sign-in' | 'sign-up'

export default function Login() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    try {
      if (mode === 'sign-up') {
        const trimmedName = name.trim()
        if (!trimmedName) throw new Error('Choose a username first.')
        const { needsConfirmation } = await signUpWithPassword(trimmedName, email.trim(), password)
        if (needsConfirmation) {
          setNotice('Account created. Check your email to confirm it, then sign in here.')
        }
      } else {
        await signInWithPassword(email.trim(), password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="login">
      <div className="login-shell">
        <div className="login-art" aria-hidden>
          <img src="/CDC08322.jpg" alt="" />
          <div className="login-art-copy">
            <span className="login-kicker">quiet sky</span>
            <span className="login-art-title">focus below the noise</span>
          </div>
        </div>
        <div className="login-card">
          <div className="login-mark" aria-hidden>
            ✦
          </div>
          <h1>Focus</h1>
          <p className="login-sub">
            Notes &amp; to-dos, one group at a time. No noise — just what you’re
            working on right now.
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Login options">
            <button
              className={mode === 'sign-in' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => switchMode('sign-in')}
            >
              Sign in
            </button>
            <button
              className={mode === 'sign-up' ? 'auth-tab active' : 'auth-tab'}
              type="button"
              onClick={() => switchMode('sign-up')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'sign-up' && (
              <label className="auth-field">
                <span>Username</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  maxLength={80}
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </label>

            {error && <p className="auth-message error">{error}</p>}
            {notice && <p className="auth-message success">{notice}</p>}

            <button className="btn-primary block" type="submit" disabled={busy}>
              {busy ? 'Working…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <button className="btn-google" onClick={signInWithGoogle}>
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="login-fine">Your data is private to your account.</p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
