import { useState } from 'react'
import Navbar from '../components/Navbar'
import ToastContainer from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { registrarUsuario } from '../api'

export default function Register() {
  const [form, setForm]     = useState({ nombre: '', email: '' })
  const [estado, setEstado] = useState(null)
  const { toasts, addToast, removeToast } = useToast()

  const obtenerUbicacion = () => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => reject()
    )
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEstado('cargando')
    try {
      const { lat, lng } = await obtenerUbicacion()
      await registrarUsuario({ ...form, lat, lng })
      setEstado('ok')
      addToast('¡Registrado! Vas a recibir alertas cerca de tu zona', 'success')
    } catch (err) {
      setEstado(null)
      if (err?.response?.status === 409) {
        addToast('Este email ya está registrado.', 'error')
      } else {
        addToast('No se pudo obtener tu ubicación. Permitile el acceso al GPS.', 'error')
      }
    }
  }

  return (
    <div className="page">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="form-page">
        <div className="form-box">
          <p className="form-box-eyebrow">Red ciudadana</p>
          <h1 className="form-box-title">UNITE A<br />LA RED</h1>
          <p className="form-box-subtitle">
            Registrate con tu ubicación y recibís alertas directas cuando
            desaparece alguien cerca tuyo. Sin spam, solo lo que importa.
          </p>
          <div className="form-divider" />

          {estado === 'ok' ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                YA ESTÁS EN LA RED
              </h2>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Te enviaremos un email cuando haya una alerta dentro de 2km de tu ubicación.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="mt-3">
                <button type="submit" className="btn-red" disabled={estado === 'cargando'}>
                  {estado === 'cargando' ? 'Obteniendo ubicación...' : 'Registrarme →'}
                </button>
              </div>
              <p className="msg-info mt-2">
                <span>⊙</span>
                Tu ubicación se guarda una sola vez. No se rastrea.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
