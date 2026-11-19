import { useEffect, useState, type FormEvent } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { joinLobby } from '../services/lobbyService'

export function JoinLobbyPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const [code, setCode] = useState(''); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); const [scanning, setScanning] = useState(false)
  useEffect(() => { if (!scanning) return; const scanner = new Html5Qrcode('qr-reader'); let active = true; void scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, async (value) => { if (!active) return; setCode(value.split('/').pop()!.toUpperCase()); await scanner.stop(); setScanning(false) }, () => undefined).catch((reason: unknown) => { setError(reason instanceof Error ? `Fotocamera non disponibile: ${reason.message}` : 'Fotocamera non disponibile.'); setScanning(false) }); return () => { active = false; if (scanner.isScanning) void scanner.stop() } }, [scanning])
  async function join(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!user) return; setPending(true); setError(null); try { navigate(`/games/${await joinLobby(code, user.uid, user.displayName || user.email?.split('@')[0] || 'Giocatore 2')}`) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Impossibile entrare nella partita.') } finally { setPending(false) } }
  return <section className="lobby-page"><p className="eyebrow">Entra in partita</p><h1>Hai ricevuto un codice?</h1><p className="lead">Inserisci il codice oppure scansiona il QR.</p><form className="join-form" onSubmit={join}><label className="field">Codice partita<input required value={code} maxLength={8} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD2345" /></label><button className="button" disabled={pending}>{pending ? 'Ingresso…' : 'Entra come Giocatore 2'}</button></form><button className="button secondary" type="button" onClick={() => { setError(null); setScanning(true) }} disabled={scanning}>{scanning ? 'Inquadra il QR…' : 'Scansiona QR'}</button>{scanning && <div id="qr-reader" />}{error && <p className="message error">{error}</p>}</section>
}
