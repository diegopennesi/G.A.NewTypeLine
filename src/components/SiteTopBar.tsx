import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function SiteTopBar({ children }: { children?: ReactNode }) {
  return <header className="site-header">
    <div className="topbar">
      <Link className="brand" to="/" aria-label="G.A. NewTypeLine, pagina iniziale">
        <span className="brand-plate" aria-hidden="true">GA</span>
        <span>NewTypeLine</span>
      </Link>
      {children}
    </div>
  </header>
}
