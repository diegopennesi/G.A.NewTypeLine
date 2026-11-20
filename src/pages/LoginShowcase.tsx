import { useState } from 'react'

const scenes = [
  { title: 'Prepara la squadra', description: 'Scegli i tuoi MS e componi il mazzo tattico prima di iniziare.', kind: 'hangar' },
  { title: 'Segui la Timeline', description: 'Vedi a chi tocca e dove si sposta il segnalino quando paghi il costo TL.', kind: 'timeline' },
  { title: 'Apri una reazione', description: 'Dai all’avversario il tempo di giocare una Response o passare.', kind: 'reaction' },
] as const

export function LoginShowcase() {
  const [index, setIndex] = useState(0)
  const scene = scenes[index]

  function step(direction: number) {
    setIndex(current => (current + direction + scenes.length) % scenes.length)
  }

  return <div className="login-showcase" aria-roledescription="carosello" aria-label="Azioni di gioco">
      <figure key={scene.kind} className={`showcase-scene showcase-${scene.kind}`} aria-live="polite" aria-atomic="true">
        {scene.kind === 'hangar' && <div className="showcase-illustration showcase-hangar-art" aria-hidden="true" />}
        {scene.kind === 'timeline' && <div className="showcase-illustration showcase-track" aria-hidden="true">
          <div className="showcase-track-line">
            <span>02<i /></span><span>03<i /></span><span>04<i /></span><span>05<i /></span>
          </div>
        </div>}
        {scene.kind === 'reaction' && <div className="showcase-illustration showcase-signal" aria-hidden="true">
          <span>Prima del tiro</span><div><b>Response</b><span>Passa</span></div>
        </div>}
        <figcaption>
          <strong>{scene.title}</strong>
          <span>{scene.description}</span>
        </figcaption>
      </figure>
      <div className="showcase-controls">
        <button type="button" onClick={() => step(-1)} aria-label="Scena precedente">←</button>
        <span aria-hidden="true">{String(index + 1).padStart(2, '0')} / 03</span>
        <button type="button" onClick={() => step(1)} aria-label="Scena successiva">→</button>
      </div>
  </div>
}
