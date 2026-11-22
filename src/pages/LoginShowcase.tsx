import { useState } from 'react'

const timeline: { name: string; team: string; active?: boolean }[][] = [
  [{ name: 'Torohachi', team: 'red', active: true }],
  [{ name: 'Gundam · ST01-U001', team: 'red' }, { name: 'Char’s Zaku II', team: 'blue' }, { name: 'Gundam Barbatos Lupus Rex', team: 'blue' }],
  [{ name: 'Unicorn Gundam (Destroy Mode)', team: 'red' }, { name: 'Wing Gundam Zero (EW)', team: 'blue' }],
]

function TimelinePreview() {
  return <>
    <b>Timeline</b>
    <div className="preview-box">Prossimo MS: Torohachi · Fase 1, TL 1</div>
    <div><span className="preview-control preview-current">Griglia</span> <span className="preview-control">Circolare</span></div>
    <div className="preview-timeline">
      {Array.from({ length: 10 }, (_, index) => <div key={index} className="preview-box" data-active={index === 0 || undefined}>
        <span>{index + 1}</span>
        {timeline[index]?.map(unit => <span className="preview-unit" data-team={unit.team} key={unit.name}>{unit.name}{unit.active && <small>Attiva</small>}</span>)}
      </div>)}
    </div>
  </>
}

function PresetsPreview() {
  return <div className="preview-presets">
    {[
      { title: 'Squadre salvate', create: 'Nuova squadra', count: 3 },
      { title: 'Mazzi salvati', create: 'Nuovo mazzo', count: 9 },
    ].map(panel => <div className="preview-box" key={panel.title}>
      <b>{panel.title}</b>
      <div><span className="preview-control">{panel.create}</span></div>
      <div className="preview-preset-row">
        <span><b>Zeon</b><small>{panel.count} carte</small></span>
        <span className="preview-control">Modifica</span>
        <span className="preview-control">Elimina</span>
      </div>
    </div>)}
  </div>
}

function LobbyPreview() {
  return <div className="preview-box preview-lobby">
    <b>Riprendi partita</b>
    <div className="preview-preset-row">
      <span><b>3v3 · Partita avviata</b><small>Ultima mossa · 16:37</small></span>
      <span className="preview-control preview-current">Riprendi</span>
    </div>
  </div>
}

const scenes = [
  { title: 'Prepara la squadra', description: 'Crea e gestisci squadre e mazzi tattici nel tuo Account, poi abbinali in lobby.', Preview: PresetsPreview },
  { title: 'Segui la Timeline', description: 'Vedi a chi tocca e tieni traccia degli spostamenti in TL, in griglia o in vista circolare.', Preview: TimelinePreview },
  { title: 'Riprendi la partita', description: 'Ritrova le partite ancora attive e controlla l’ora dell’ultima mossa prima di rientrare.', Preview: LobbyPreview },
] as const

export function LoginShowcase() {
  const [index, setIndex] = useState(0)
  const { title, description, Preview } = scenes[index]

  function step(direction: number) {
    setIndex(current => (current + direction + scenes.length) % scenes.length)
  }

  return <div className="login-showcase" aria-roledescription="carosello" aria-label="Funzioni dell’app">
      <figure key={title} className="showcase-scene" aria-live="polite" aria-atomic="true">
        <div className="showcase-illustration" aria-hidden="true"><Preview /></div>
        <figcaption>
          <strong>{title}</strong>
          <span>{description}</span>
        </figcaption>
      </figure>
      <div className="showcase-controls">
        <button type="button" onClick={() => step(-1)} aria-label="Anteprima precedente">←</button>
        <span aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
        <button type="button" onClick={() => step(1)} aria-label="Anteprima successiva">→</button>
      </div>
  </div>
}
