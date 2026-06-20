import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import ToastContainer from '../components/Toast'
import DireccionAutocomplete from '../components/DireccionAutocomplete'
import { useToast } from '../hooks/useToast'
import { etiquetaFecha } from '../utils/tiempo'
import { obtenerAlerta, enviarReporte, obtenerTrayectoria } from '../api'

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ2lhbm4wMiIsImEiOiJjbW5mMGRoOGowNTh2Mm5wcHMyanVtenl0In0.mnb1yi5TmJZJrDxIwBzQxA'

const crearIconoNumero = (n) => L.divIcon({
  className: '',
  html: `<div style="
    background:#e53e3e;color:#fff;width:26px;height:26px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:12px;font-weight:700;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.4);">${n}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

export default function Reporte() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [alerta, setAlerta]           = useState(null)
  const [notFound, setNotFound]       = useState(false)
  const [descripcion, setDesc]        = useState('')
  const [estado, setEstado]           = useState(null)
  const [anonimo, setAnonimo]         = useState(true)
  const [nombre, setNombre]           = useState('')
  const [modoUbic, setModoUbic]       = useState('ninguna') // 'ninguna' | 'gps' | 'manual'
  const [ubicacion, setUbicacion]     = useState(null)
  const [direccionGps, setDireccionGps] = useState(null)
  const [gpsError, setGpsError]       = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [trayectoria, setTrayectoria] = useState([])
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    obtenerAlerta(id)
      .then(res => setAlerta(res.data))
      .catch(() => setNotFound(true))
    obtenerTrayectoria(id)
      .then(res => setTrayectoria(res.data.filter(r => r.lat && r.lng)))
      .catch(() => {})
  }, [id])

  const obtenerGPS = () => {
    setGpsLoading(true)
    setGpsError(false)
    setDireccionGps(null)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUbicacion({ lat, lng })
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'es' } }
          )
          const data = await res.json()
          setDireccionGps(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          setDireccionGps(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
        setGpsLoading(false)
      },
      () => {
        setGpsError(true)
        setGpsLoading(false)
      }
    )
  }

  const handleModoUbic = (modo) => {
    setModoUbic(modo)
    setUbicacion(null)
    setDireccionGps(null)
    setGpsError(false)
    if (modo === 'gps') obtenerGPS()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEstado('cargando')
    try {
      await enviarReporte({
        alertaId: id,
        descripcion,
        reportadoPor: anonimo ? null : nombre || null,
        lat: ubicacion?.lat ?? null,
        lng: ubicacion?.lng ?? null,
      })
      setEstado('ok')
      addToast('Reporte enviado. ¡Gracias por ayudar!', 'success')
    } catch {
      setEstado(null)
      addToast('Error al enviar el reporte. Intentá de nuevo.', 'error')
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <Navbar />
        <div className="reporte-page" style={{ textAlign: 'center', paddingTop: '5rem' }}>
          <p className="form-box-eyebrow">Error 404</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            ALERTA NO ENCONTRADA
          </h1>
          <p style={{ color: 'var(--gray)', marginBottom: '2rem' }}>
            Esta alerta no existe o ya fue dada de baja.
          </p>
          <button className="btn-ghost" onClick={() => navigate('/')}>← Ver alertas activas</button>
        </div>
      </div>
    )
  }

  if (!alerta) return (
    <div className="page">
      <Navbar />
      <div className="reporte-page">
        <div className="skeleton-card" style={{ height: '120px', marginBottom: '1rem' }} />
        <div className="skeleton-card" style={{ height: '200px' }} />
      </div>
    </div>
  )

  return (
    <div className="page">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="reporte-page">

        <div className="alerta-banner">
          {alerta.fotoUrl && (
            <div style={{
              width: 'calc(100% + 3rem)',
              height: '260px',
              margin: '-1.5rem -1.5rem 1.5rem -1.5rem',
              background: '#0d0d0d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={alerta.fotoUrl.startsWith('http') ? alerta.fotoUrl : `http://localhost:8081${alerta.fotoUrl}`}
                alt={alerta.nombre}
                style={{ height: '100%', width: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
          <div className="alerta-banner-nombre">{alerta.nombre}</div>
          <div className="alerta-banner-meta">
            {alerta.edad} años
            {alerta.ultimaUbicacionConocida && ` · ${alerta.ultimaUbicacionConocida}`}
            <span style={{ color: 'var(--red)', marginLeft: '0.5rem' }}>
              · {etiquetaFecha(alerta)}
            </span>
          </div>
          <p className="alerta-banner-desc">{alerta.descripcion}</p>
        </div>

        {trayectoria.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="section-header" style={{ marginBottom: '0.8rem' }}>
              <h2 className="section-title">TRAYECTORIA DE AVISTAMIENTOS</h2>
              <span className="section-count">{trayectoria.length} punto{trayectoria.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="map-wrap" style={{ height: '280px', borderRadius: '8px', overflow: 'hidden' }}>
              <MapContainer
                {...(trayectoria.length === 1
                  ? { center: [trayectoria[0].lat, trayectoria[0].lng], zoom: 15 }
                  : { bounds: trayectoria.map(r => [r.lat, r.lng]), boundsOptions: { padding: [30, 30] } }
                )}
                style={{ height: '100%' }}
              >
                <TileLayer
                  url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
                  attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                  tileSize={256}
                  maxZoom={22}
                />
                <Polyline
                  positions={trayectoria.map(r => [r.lat, r.lng])}
                  color="#e53e3e"
                  weight={3}
                  dashArray="6 4"
                />
                {trayectoria.map((r, i) => (
                  <Marker key={r.mongoId} position={[r.lat, r.lng]} icon={crearIconoNumero(i + 1)}>
                    <Popup>
                      <b>#{i + 1}</b> {r.descripcion}<br />
                      <small>{new Date(r.timestamp).toLocaleString('es-AR')}</small>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {trayectoria.map((r, i) => (
                <div key={r.mongoId} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--gray)' }}>
                  <span style={{ color: 'var(--red)', fontWeight: 700, minWidth: '18px' }}>#{i + 1}</span>
                  <span>{r.descripcion} · <em>{new Date(r.timestamp).toLocaleString('es-AR')}</em></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {estado === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div style={{ fontSize: '3rem', color: 'var(--green)', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              REPORTE ENVIADO
            </h2>
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: '1.7', maxWidth: '320px', margin: '0 auto 2rem' }}>
              Gracias por ayudar. Cada reporte puede marcar la diferencia en los primeros momentos.
            </p>
            <button className="btn-ghost" onClick={() => navigate('/')}>← Ver más alertas</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', marginBottom: '1.5rem' }}>
              ¿VISTE ALGO?
            </h2>
            <form onSubmit={handleSubmit}>

              {/* ── Descripción ── */}
              <div className="field">
                <label>Descripción del avistamiento</label>
                <textarea
                  rows={5}
                  placeholder="¿Qué viste? ¿Cuándo? ¿Dónde exactamente? Cualquier detalle puede ayudar..."
                  value={descripcion}
                  onChange={e => setDesc(e.target.value)}
                  required
                />
              </div>

              {/* ── Identidad ── */}
              <div className="field">
                <label>¿Cómo querés identificarte?</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={anonimo ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => setAnonimo(true)}
                  >
                    Anónimo
                  </button>
                  <button
                    type="button"
                    className={!anonimo ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => setAnonimo(false)}
                  >
                    Con nombre
                  </button>
                </div>
                {!anonimo && (
                  <input
                    style={{ marginTop: '0.6rem' }}
                    type="text"
                    placeholder="Tu nombre"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                )}
              </div>

              {/* ── Ubicación ── */}
              <div className="field">
                <label>¿Querés indicar dónde lo viste?</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={modoUbic === 'ninguna' ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => handleModoUbic('ninguna')}
                  >
                    No indicar
                  </button>
                  <button
                    type="button"
                    className={modoUbic === 'gps' ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => handleModoUbic('gps')}
                  >
                    Usar GPS
                  </button>
                  <button
                    type="button"
                    className={modoUbic === 'manual' ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={() => handleModoUbic('manual')}
                  >
                    Ingresar dirección
                  </button>
                </div>

                {modoUbic === 'gps' && (
                  <div style={{ marginTop: '0.6rem' }}>
                    {gpsLoading && <p className="msg-info"><span>⊙</span> Obteniendo ubicación...</p>}
                    {gpsError && <p className="msg-error"><span>✕</span> No se pudo obtener el GPS. Verificá los permisos.</p>}
                    {ubicacion && !gpsLoading && (
                      <p className="msg-info"><span>↗</span> {direccionGps || `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`}</p>
                    )}
                  </div>
                )}

                {modoUbic === 'manual' && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <DireccionAutocomplete
                      onSeleccionar={({ lat, lng }) => setUbicacion({ lat, lng })}
                    />
                    {ubicacion && (
                      <p className="msg-info" style={{ marginTop: '0.4rem' }}><span>↗</span> {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}</p>
                    )}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-red" disabled={estado === 'cargando'}>
                {estado === 'cargando' ? 'Enviando...' : 'Enviar reporte →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
