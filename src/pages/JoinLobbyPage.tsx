import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { joinLobby } from '../services/lobbyService'

type QrDetector = new (options: { formats: string[] }) => { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }

export function JoinLobbyPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const video = useRef<HTMLVideoElement>(null)
  const [code, setCode] = useState(''); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); const [scanning, setScanning] = useState(false)
  async function scan() { const Detector = (window as unknown as { BarcodeDetector?: QrDetector }).BarcodeDetector; if (!Detector || !video.current) { setError('Scansione non supportata: inserisci il codice manualmente.'); return }; try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); video.current.srcObject = stream; await video.current.play(); setScanning(true); const detector = new Detector({ formats: ['qr_code'] }); const loop = async () => { const codes = await detector.detect(video.current!); if (codes[0]) { setCode(codes[0].rawValue.split('/').pop()!.toUpperCase()); stream.getTracks().forEach((track) => track.stop()); setScanning(false) } else requestAnimationFrame(() => void loop()) }; void loop() } catch { setError('Autorizza la fotocamera per scansionare il QR.') } }
  async function join(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!user) return; setPending(true); setError(null); try { navigate(`/games/${await joinLobby(code, user.uid, user.displayName || user.email?.split('@')[0] || 'Giocatore 2')}`) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Impossibile entrare nella partita.') } finally { setPending(false) } }
  return <section className="lobby-page"><p className="eyebrow">Entra in partita</p><h1>Hai ricevuto un codice?</h1><p className="lead">Inserisci il codice oppure scansiona il QR.</p><form className="join-form" onSubmit={join}><label className="field">Codice partita<input required value={code} maxLength={8} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD2345" /></label><button className="button" disabled={pending}>{pending ? 'Ingresso…' : 'Entra come Giocatore 2'}</button></form><button className="button secondary" type="button" onClick={() => void scan()} disabled={scanning}>{scanning ? 'Inquadra il QR…' : 'Scansiona QR'}</button>{scanning && <video ref={video} muted playsInline className="qr-camera" />}{error && <p className="message error">{error}</p>}</section>
}
