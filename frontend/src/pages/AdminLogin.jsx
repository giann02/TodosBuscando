import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ToastContainer from '../components/Toast'
import { useToast } from '../hooks/useToast'

const USUARIO = 'usuario'
const PASSWORD = 'contraseña'

export default function AdminLogin() {
  const [form, setForm]     = useState({ usuario: '', password: '' })
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(false)
  const { toasts, addToast, removeToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    // Simular un pequeño delay para que no parezca instantáneo
    setTimeout(() => {
      if (form.usuario === USUARIO && form.password === PASSWORD) {
        localStorage.setItem('admin_auth', 'true')
        addToast('Bienvenido al panel de administración', 'success')
        setTimeout(() => navigate('/admin'), 500)
      } else {
        setError(true)
        addToast('Usuario o contraseña incorrectos', 'error')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="page">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="form-page">
        <div className="form-box">
          <p className="form-box-eyebrow">Acceso restringido</p>
          <h1 className="form-box-title">PANEL<br />ADMIN</h1>
          <p className="form-box-subtitle">
            Solo personal autorizado puede acceder al panel de administración.
          </p>
          <div className="form-divider" />

          {error && (
            <div className="msg-error">
              Usuario o contraseña incorrectos.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Usuario</label>
              <input
                type="text"
                placeholder="Ingresá tu usuario"
                value={form.usuario}
                onChange={e => setForm({ ...form, usuario: e.target.value })}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="mt-3">
              <button type="submit" className="btn-red" disabled={loading}>
                {loading ? 'Verificando...' : 'Ingresar →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
