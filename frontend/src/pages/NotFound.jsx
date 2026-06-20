import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  return (
    <div className="page">
      <Navbar />
      <div className="notfound-page">
        <p className="form-box-eyebrow">Error 404</p>
        <h1 className="notfound-title">NO<br />ENCONTRADO</h1>
        <p className="notfound-sub">
          La página o alerta que buscás no existe o fue dada de baja.
        </p>
        <Link to="/" className="btn-red" style={{ textDecoration: 'none', marginTop: '2rem', display: 'inline-flex' }}>
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
