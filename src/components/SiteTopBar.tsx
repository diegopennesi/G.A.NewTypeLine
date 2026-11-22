import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function SiteTopBar({ children }: { children?: ReactNode }) {
  return <header className="site-header">
    <div className="topbar">
      <Link className="brand" to="/">Le tue partite</Link>
      {children}
    </div>
  </header>
}
