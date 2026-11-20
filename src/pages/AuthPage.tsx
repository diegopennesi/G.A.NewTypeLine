import './EntryPages.css'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
function formatError(error: unknown) { return error instanceof Error ? error.message.replace(/^Firebase: /, '') : 'Si è verificato un errore. Riprova.' }
export function AuthPage() { const { user, configured, signInWithEmail, signInWithGoogle, signUpWithEmail } = useAuth(); const location = useLocation(); const destination = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'; const [isRegistration, setIsRegistration] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); if (user) return <Navigate to={destination} replace />
  async function perform(action: () => Promise<void>) { setError(null); setPending(true); try { await action() } catch (reason) { setError(formatError(reason)) } finally { setPending(false) } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const email = String(data.get('email')); const password = String(data.get('password')); void perform(() => isRegistration ? signUpWithEmail(email, password) : signInWithEmail(email, password)) }
  return <main className="auth-page entry-surface">
    <div className="auth-layout">
      <section className="auth-intro" aria-labelledby="product-title">
        <p className="entry-label">Companion per Gundam Assemble</p>
        <h1 id="product-title">NewTypeLine</h1>
        <p className="lead">Prepara la squadra e condividi la Timeline con il tuo avversario mentre giocate al tavolo.</p>
      </section>
      <section className="auth-card entry-glass" aria-labelledby="auth-title">
        <h2 id="auth-title">{isRegistration ? 'Crea il tuo account' : 'Accedi'}</h2>
        {!configured && <p className="message notice">Configura Firebase in <code>.env.local</code> per attivare l’accesso.</p>}
        <form className="auth-form" onSubmit={submit} aria-busy={pending}>
          <label className="field">Email<input required name="email" type="email" autoComplete="email" /></label>
          <label className="field">Password<input required name="password" type="password" minLength={6}
            autoComplete={isRegistration ? 'new-password' : 'current-password'} /></label>
          {error && <p className="message error" role="alert">{error}</p>}
          <button className="button" disabled={pending || !configured}>
            {pending ? 'Attendi…' : isRegistration ? 'Crea account' : 'Accedi'}
          </button>
        </form>
        <div className="divider">oppure</div>
        <button className="button secondary auth-google" type="button" disabled={pending || !configured}
          onClick={() => void perform(signInWithGoogle)}>Continua con Google</button>
        <p className="auth-switch">{isRegistration ? 'Hai già un account?' : 'Non hai un account?'}{' '}
          <button className="text-button" type="button" disabled={pending}
            onClick={() => { setIsRegistration(!isRegistration); setError(null) }}>
            {isRegistration ? 'Accedi' : 'Registrati'}
          </button>
        </p>
      </section>
    </div>
  </main>
}
