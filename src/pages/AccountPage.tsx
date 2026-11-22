import { avatars, type AvatarId } from '../data/avatars'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CardSelectionList } from '../components/CardSelectionList'
import { tacticSelectionRows, unitSelectionRows } from '../data/cardSelectionRows'
import { useAuth } from '../features/auth/useAuth'
import { removePreset, saveAvatar, savePreset, watchAvatar, watchPresets, type Preset } from '../services/accountService'
import './AccountPage.css'

function draftPreset(kind: Preset['kind']): Preset {
  return { id: crypto.randomUUID(), kind, name: '', cards: [] }
}

export function AccountPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { state } = useLocation()
  const backTo = (state as { backTo?: string } | null)?.backTo
  const [avatar, setAvatar] = useState<AvatarId | null>(null)
  const [presets, setPresets] = useState<Preset[]>([])
  const [draft, setDraft] = useState<Preset | null>(null)
  const [size, setSize] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!uid) return
    const failed = () => setError('Impossibile caricare il tuo account.')
    const stopAvatar = watchAvatar(uid, setAvatar, failed)
    const stopPresets = watchPresets(uid, setPresets, failed)
    return () => { stopAvatar(); stopPresets() }
  }, [uid])

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile salvare le modifiche.')
    } finally {
      setBusy(false)
    }
  }

  function edit(preset: Preset) {
    setDraft(preset)
    setSize(preset.cards.length === 5 ? 5 : 3)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!uid || !draft || busy) return
    void run(async () => { await savePreset(uid, draft); setDraft(null) }, 'Preset salvato.')
  }

  const limit = draft?.kind === 'deck' ? 9 : size
  const person = user?.displayName || user?.email || 'Profilo'

  return <section className="account-page" aria-labelledby="account-title">
    {backTo && /^\/games\/[A-Z0-9]{8}$/.test(backTo) && <Link className="operations-back" to={backTo}>← Torna alla lobby</Link>}
    <h1 id="account-title">Account</h1>
    <section className="operation-panel account-profile" aria-labelledby="profile-title">
      <div>
        <h2 id="profile-title">Avatar profilo</h2>
        <p>{person}</p>
      </div>
      <div className="avatar-options" role="group" aria-label="Scegli un avatar">
        {[...avatars, { id: null, label: 'Nessun avatar' }].map(option =>
          <button key={option.id ?? 'none'} type="button" className="avatar-option"
            aria-pressed={avatar === option.id} disabled={busy || !uid}
            onClick={() => {
              if (uid && avatar !== option.id) {
                void run(() => saveAvatar(uid, option.id), option.id ? 'Avatar aggiornato.' : 'Avatar rimosso.')
              }
            }}>
            {'src' in option ? <img src={option.src} alt="" width="112" height="112" /> :
              <span className="avatar-symbol" aria-hidden="true">{option.id ? '?' : '—'}</span>}
            <span>{option.label}</span>
          </button>
        )}
      </div>
    </section>
    {notice && <p role="status">{notice}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="account-lists">
      {(['squad', 'deck'] as const).map(kind => <section className="operation-panel" key={kind}>
        <h2>{kind === 'squad' ? 'Squadre salvate' : 'Mazzi salvati'}</h2>
        <button type="button" className="button secondary" disabled={busy}
          onClick={() => edit(draftPreset(kind))}>{kind === 'squad' ? 'Nuova squadra' : 'Nuovo mazzo'}</button>
        <ul className="account-preset-list">
          {presets.filter(item => item.kind === kind).map(item => <li key={item.id}>
            <div><strong>{item.name}</strong><small>{item.cards.length} carte</small></div>
            <button type="button" className="button secondary" disabled={busy} onClick={() => edit(item)}>Modifica</button>
            <button type="button" className="button secondary" disabled={busy}
              onClick={() => {
                if (uid && window.confirm(`Eliminare «${item.name}»?`)) {
                  void run(async () => {
                    await removePreset(uid, item.id)
                    if (draft?.id === item.id) setDraft(null)
                  }, 'Preset eliminato.')
                }
              }}>Elimina</button>
          </li>)}
        </ul>
      </section>)}
    </div>
    {draft && <form className="operation-panel account-editor" onSubmit={submit}>
      <h2>{draft.kind === 'squad' ? 'Squadra' : 'Mazzo'} · {draft.cards.length}/{limit}</h2>
      <label className="field">Nome<input required maxLength={48} value={draft.name} disabled={busy}
        onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      {draft.kind === 'squad' && <label className="field">Formato
        <select value={size} disabled={busy} onChange={event => {
          const next = Number(event.target.value)
          setSize(next)
          setDraft({ ...draft, cards: draft.cards.slice(0, next) })
        }}><option value={3}>3v3</option><option value={5}>5v5</option></select>
      </label>}
      <CardSelectionList label={draft.kind === 'deck' ? 'Cerca Tactics Card' : 'Cerca Unit Card'}
        rows={draft.kind === 'deck' ? tacticSelectionRows(draft.cards, false) : unitSelectionRows}
        selected={draft.cards} limit={limit} disabled={busy}
        onToggle={id => setDraft({ ...draft, cards: draft.cards.includes(id)
          ? draft.cards.filter(card => card !== id) : [...draft.cards, id] })} />
      <div className="tactics-controls">
        <button className="button" disabled={busy || !draft.name.trim() || draft.cards.length !== limit}>Salva preset</button>
        <button className="button secondary" type="button" disabled={busy} onClick={() => setDraft(null)}>Annulla</button>
      </div>
    </form>}
  </section>
}
