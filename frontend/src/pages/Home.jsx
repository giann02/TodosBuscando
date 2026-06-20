import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import ToastContainer from '../components/Toast'
import { SkeletonGrid } from '../components/Skeleton'
import { useToast } from '../hooks/useToast'
import { etiquetaFecha } from '../utils/tiempo'
import { obtenerAlertas, obtenerAlertasResueltas } from '../api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const iconoRojo = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

export default function Home() {
  const [alertas, setAlertas]           = useState([])
  const [resueltas, setResueltas]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [filtro, setFiltro]             = useState('')
  const { toasts, addToast, removeToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    obtenerAlertas()
      .then(res => {
        setAlertas(res.data)
        if (res.data.length > 0) {
          addToast(`${res.data.length} alerta${res.data.length !== 1 ? 's' : ''} activa${res.data.length !== 1 ? 's' : ''} en tu zona`, 'info')
        }
      })
      .catch(() => addToast('No se pudieron cargar las alertas', 'error'))
      .finally(() => setLoading(false))
    obtenerAlertasResueltas().then(res => setResueltas(res.data)).catch(() => {})
  }, [])

  const alertasFiltradas = useMemo(() => {
    if (!filtro.trim()) return alertas
    const q = filtro.toLowerCase()
    return alertas.filter(a =>
      a.nombre.toLowerCase().includes(q) ||
      a.ultimaUbicacionConocida?.toLowerCase().includes(q) ||
      a.descripcion?.toLowerCase().includes(q)
    )
  }, [alertas, filtro])

  const alertasConUbicacion = useMemo(() => alertas.filter(a => a.ubicacion), [alertas])

  return (
    <div className="page">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="container">
        <div className="hero">
          <div className="hero-text">
            <p className="hero-eyebrow">Sistema de alerta ciudadana</p>
            <h1 className="hero-title">
              TODOS<br />
              <span className="accent">BUSCANDO</span>
            </h1>
            <p className="hero-subtitle">
              Cuando alguien desaparece, el tiempo es crítico. Registrate y
              recibí alertas directas cuando haya una búsqueda cerca tuyo.
            </p>
          </div>

          <div className="hero-visual">
            <div className="radar">
              <div className="radar-ring radar-ring-1" />
              <div className="radar-ring radar-ring-2" />
              <div className="radar-ring radar-ring-3" />
              <div className="radar-ring radar-ring-4" />
              <div className="radar-axis radar-axis-h" />
              <div className="radar-axis radar-axis-v" />
              <div className="radar-sweep" />
              <div className="radar-center" />
              <div className="radar-blip" style={{ top: '28%', left: '62%', animationDelay: '0.8s' }} />
              <div className="radar-blip" style={{ top: '58%', left: '30%', animationDelay: '2.1s' }} />
              <div className="radar-blip" style={{ top: '72%', left: '66%', animationDelay: '3.4s' }} />
            </div>
          </div>
        </div>

        <div className="counter-bar">
          <div className="counter-item">
            <span className="counter-number">{alertas.length}</span>
            <span className="counter-label">Alertas activas</span>
          </div>
          <div className="counter-item">
            <span className="counter-number">2km</span>
            <span className="counter-label">Radio de alerta</span>
          </div>
          <div className="counter-item">
            <span className="counter-number">24/7</span>
            <span className="counter-label">Monitoreo</span>
          </div>
        </div>

        {/* ── Mapa general ── */}
        {alertasConUbicacion.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-header" style={{ marginBottom: '0.8rem' }}>
              <h2 className="section-title">MAPA DE ALERTAS</h2>
              <span className="section-count">{alertasConUbicacion.length} punto{alertasConUbicacion.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="map-wrap" style={{ height: '320px' }}>
              <MapContainer
                bounds={alertasConUbicacion.map(a => [a.ubicacion.y, a.ubicacion.x])}
                boundsOptions={{ padding: [40, 40] }}
                style={{ height: '100%' }}
              >
                <TileLayer
                    url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZ2lhbm4wMiIsImEiOiJjbW5mMGRoOGowNTh2Mm5wcHMyanVtenl0In0.mnb1yi5TmJZJrDxIwBzQxA"
                    attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                    tileSize={256}
                    maxZoom={22}
                  />
                {alertasConUbicacion.map(a => (
                  <Marker
                    key={a.id}
                    position={[a.ubicacion.y, a.ubicacion.x]}
                    icon={iconoRojo}
                    eventHandlers={{ click: () => navigate(`/reporte/${a.id}`) }}
                  >
                    <Popup>
                      <b>{a.nombre}</b><br />
                      {a.edad} años<br />
                      <small>{etiquetaFecha(a)}</small>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* ── Filtro ── */}
        <div className="section-header">
          <h2 className="section-title">ALERTAS ACTIVAS</h2>
          {alertas.length > 0 && (
            <span className="section-count">{alertasFiltradas.length} de {alertas.length}</span>
          )}
        </div>

        <div className="filtro-wrap">
          <input
            className="filtro-input"
            type="text"
            placeholder="Buscar por nombre, zona o descripción..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          {filtro && (
            <button className="filtro-clear" onClick={() => setFiltro('')}>✕</button>
          )}
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : alertasFiltradas.length === 0 ? (
          filtro ? (
            <div className="empty-state">
              <div className="empty-state-icon">⊘</div>
              <h3 className="empty-state-title">Sin resultados</h3>
              <p className="empty-state-text">No encontramos alertas para <strong>"{filtro}"</strong></p>
              <button className="btn-ghost" style={{ marginTop: '1.2rem' }} onClick={() => setFiltro('')}>Limpiar búsqueda</button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-pulse">
                <span className="empty-state-dot" />
              </div>
              <h3 className="empty-state-title">Todo tranquilo</h3>
              <p className="empty-state-text">No hay alertas activas en este momento.<br />El sistema está monitoreando la zona.</p>
            </div>
          )
        ) : (
          <div className="alertas-grid">
            {alertasFiltradas.map(alerta => (
              <div
                key={alerta.id}
                className="alerta-card"
                onClick={() => navigate(`/reporte/${alerta.id}`)}
              >
                <div style={{
                  width: 'calc(100% + 3rem)',
                  height: '200px',
                  margin: '-1.5rem -1.5rem 1.2rem -1.5rem',
                  background: '#0d0d0d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {alerta.fotoUrl
                    ? <img
                        src={alerta.fotoUrl.startsWith('http') ? alerta.fotoUrl : `http://localhost:8081${alerta.fotoUrl}`}
                        alt={alerta.nombre}
                        style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                      />
                    : <span style={{ fontSize: '3.5rem', opacity: 0.2 }}>?</span>
                  }
                </div>
                <div className="alerta-card-status">Activa</div>
                <h3>{alerta.nombre}</h3>
                <p className="edad">{alerta.edad} años</p>
                <p className="desc">{alerta.descripcion}</p>
                <p className="ubicacion">
                  <span>↗</span> {alerta.ultimaUbicacionConocida}
                </p>
                <p className="tiempo-transcurrido">{etiquetaFecha(alerta)}</p>
                <span className="alerta-card-arrow">↗</span>
              </div>
            ))}
          </div>
        )}

        {resueltas.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.05em', margin: 0 }}>
                RESUELTAS
              </h2>
              <span style={{ background: 'var(--green)', color: '#000', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '2px 10px', borderRadius: '2px', fontWeight: 700 }}>
                {resueltas.length}
              </span>
            </div>
            <div className="alertas-grid">
              {resueltas.map(alerta => (
                <div
                  key={alerta.id}
                  className="alerta-card"
                  style={{ opacity: 0.75, cursor: 'default', borderColor: 'var(--green)' }}
                >
                  <div style={{
                    width: 'calc(100% + 3rem)',
                    height: '200px',
                    margin: '-1.5rem -1.5rem 1.2rem -1.5rem',
                    background: '#0d0d0d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {alerta.fotoUrl
                      ? <img
                          src={alerta.fotoUrl.startsWith('http') ? alerta.fotoUrl : `http://localhost:8081${alerta.fotoUrl}`}
                          alt={alerta.nombre}
                          style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                        />
                      : <span style={{ fontSize: '3.5rem', opacity: 0.2 }}>?</span>
                    }
                  </div>
                  <div className="alerta-card-status resuelta">Encontrado/a</div>
                  <h3>{alerta.nombre}</h3>
                  <p className="edad">{alerta.edad} años</p>
                  <p className="ubicacion"><span>↗</span> {alerta.ultimaUbicacionConocida}</p>
                  <p className="tiempo-transcurrido">{etiquetaFecha(alerta)}</p>
                  {alerta.resueltaEn && (
                    <p className="tiempo-transcurrido" style={{ color: 'var(--green)' }}>
                      Fecha alerta resuelta: {new Date(alerta.resueltaEn).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: '4rem' }} />
      </div>
    </div>
  )
}
