import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <span className="dot" />
        TODOS<span style={{ color: 'var(--red)' }}>BUSCANDO</span>
      </Link>
      <div className="navbar-links">
        <Link to="/" className={pathname === '/' ? 'active' : ''}>Alertas</Link>
        <Link to="/registrar" className={pathname === '/registrar' ? 'active' : ''}>Registrarme</Link>
        <Link to="/admin" className="navbar-admin-btn">Admin</Link>

      </div>
    </nav>
  )
}
