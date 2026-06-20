import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import DireccionAutocomplete from '../components/DireccionAutocomplete'
import ToastContainer from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { crearAlerta, obtenerAlertas, obtenerAlertasResueltas, obtenerReportes, obtenerConteoReportes, resolverAlerta, subirFoto, buscarAlertasSimilares, obtenerEstadisticas, obtenerTrayectoria } from '../api'
import { formatearDireccion } from '../utils/direccion'

// Componente que vuela el mapa a nuevas coordenadas
function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo([coords.lat, coords.lng], 16, { duration: 1.2 })
  }, [coords])
  return null
}

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

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] })
  }, [bounds.length])
  return null
}

function ClickEnMapa({ onClickMapa }) {
  useMapEvents({ click: (e) => onClickMapa(e.latlng) })
  return null
}

function SectionLabel({ label }) {
  return (
    <div style={{ gridColumn: '1 / -1', background: 'var(--bg2)', padding: '0.7rem 1.2rem', borderLeft: '3px solid var(--red)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--white)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function StatCard({ label, value, suffix = '', color, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}`, background: 'var(--bg2)', padding: '1.2rem 1.5rem' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '2rem', fontWeight: 700, color: color || 'var(--white)', margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
        {value}{suffix}
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const [alertas, setAlertas]             = useState([])
  const [alertaSelec, setAlertaSelec]     = useState(null)
  const [reportes, setReportes]           = useState([])
  const [conteoReportes, setConteoReportes] = useState({})
  const [puntoSelec, setPuntoSelec]       = useState(null)
  const [flyCoords, setFlyCoords]         = useState(null)
  const [direccionExterna, setDireccionExterna] = useState(undefined)
  const [form, setForm]                   = useState({ nombre: '', edad: '', descripcion: '', ultimaUbicacionConocida: '' })
  const [fotoFile, setFotoFile]           = useState(null)
  const [fotoPreview, setFotoPreview]     = useState(null)
  const [fotoDragOver, setFotoDragOver]   = useState(false)
  const fotoInputRef                      = useRef(null)
  const [alertasSimilares, setAlertasSimilares] = useState([])
  const [estadisticas, setEstadisticas]   = useState(null)
  const [trayectoria, setTrayectoria]     = useState([])
  const [alertasResueltas, setAlertasResueltas] = useState([])
  const [tabAlertas, setTabAlertas]       = useState('activas')
  const [vista, setVista]                 = useState('lista')
  const [publicando, setPublicando]       = useState(false)
  const { toasts, addToast, removeToast } = useToast()
  const navigate = useNavigate()

  // Cuando el usuario escribe y selecciona del autocomplete
  const handleDireccionSeleccionada = ({ direccion, lat, lng }) => {
    setForm(f => ({ ...f, ultimaUbicacionConocida: direccion }))
    setPuntoSelec({ lat, lng })
    setFlyCoords({ lat, lng })
  }

  // Cuando hace click en el mapa → reverse geocoding para obtener la dirección
  const handleClickMapa = async (latlng) => {
    setPuntoSelec(latlng)
    setFlyCoords(latlng)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`,
        { headers: { 'Accept-Language': 'es' } }
      )
      const data = await res.json()
      const direccion = formatearDireccion(data.address, data.display_name) || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`
      setDireccionExterna(direccion)
      setForm(f => ({ ...f, ultimaUbicacionConocida: direccion }))
    } catch {
      const direccion = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`
      setDireccionExterna(direccion)
      setForm(f => ({ ...f, ultimaUbicacionConocida: direccion }))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    navigate('/admin/login')
  }

  useEffect(() => { cargarAlertas() }, [])

  const handleNombreBlur = () => {
    const nombre = form.nombre.trim()
    if (nombre.length < 3) { setAlertasSimilares([]); return }
    buscarAlertasSimilares(nombre)
      .then(res => setAlertasSimilares(res.data))
      .catch(() => {})
  }

  const cargarAlertas = () => {
    obtenerAlertas().then(res => setAlertas(res.data))
    obtenerConteoReportes().then(res => setConteoReportes(res.data))
    obtenerAlertasResueltas().then(res => setAlertasResueltas(res.data))
  }

  const handleVerEstadisticas = () => {
    setVista('estadisticas')
    obtenerEstadisticas().then(res => setEstadisticas(res.data)).catch(() => {})
  }

  const verReportes = (alerta) => {
    setAlertaSelec(alerta)
    setReportes([])
    setTrayectoria([])
    obtenerReportes(alerta.id).then(res => setReportes(res.data))
    obtenerTrayectoria(alerta.id).then(res => setTrayectoria(res.data.filter(r => r.lat && r.lng))).catch(() => {})
  }

  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleFotoDrop = (e) => {
    e.preventDefault()
    setFotoDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!puntoSelec) return alert('Hacé click en el mapa para marcar la ubicación')
    setPublicando(true)
    try {
      let fotoUrl = null
      if (fotoFile) {
        const res = await subirFoto(fotoFile)
        fotoUrl = res.data.url
      }
      const alertaRes = await crearAlerta({ ...form, edad: parseInt(form.edad), lat: puntoSelec.lat, lng: puntoSelec.lng, fotoUrl })
      const vecinos = alertaRes.data.vecinosNotificados
      addToast(
        vecinos > 0
          ? `Alerta publicada — ${vecinos} vecino${vecinos !== 1 ? 's' : ''} notificado${vecinos !== 1 ? 's' : ''} por email`
          : 'Alerta publicada — no hay vecinos registrados en la zona',
        vecinos > 0 ? 'success' : 'info'
      )
      setForm({ nombre: '', edad: '', descripcion: '', ultimaUbicacionConocida: '' })
      setFotoFile(null)
      setFotoPreview(null)
      setPuntoSelec(null)
      setVista('lista')
      cargarAlertas()
    } catch (err) {
      addToast('Error al publicar la alerta. Intentá de nuevo.', 'error')
    } finally {
      setPublicando(false)
    }
  }

  const handleResolver = async (id) => {
    await resolverAlerta(id)
    cargarAlertas()
    if (alertaSelec?.id === id) setAlertaSelec(null)
  }

  return (
    <div className="page">
      <Navbar />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="admin-page">

        <div className="admin-header">
          <div>
            <h1 className="admin-title">PANEL DE CONTROL</h1>
            <p className="admin-subtitle">Sistema de gestión de alertas</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={vista === 'estadisticas' ? 'btn-ghost' : 'btn-ghost'}
              onClick={() => vista === 'estadisticas' ? setVista('lista') : handleVerEstadisticas()}
            >
              {vista === 'estadisticas' ? '← Volver' : '◎ Estadísticas'}
            </button>
            <button
              className={vista === 'crear' ? 'btn-ghost' : 'btn-red'}
              onClick={() => setVista(vista === 'crear' ? 'lista' : 'crear')}
            >
              {vista === 'crear' ? '← Volver' : '+ Nueva alerta'}
            </button>
            <button className="btn-ghost" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>

        {/* ── Nueva alerta ── */}
        {vista === 'crear' && (
          <div className="nueva-alerta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
            <div className="admin-panel">
              <p className="panel-title">Datos de la desaparición</p>
              <form onSubmit={handleCrear}>
                <div className="field">
                  <label>Nombre</label>
                  <input value={form.nombre} onChange={e => { setForm({...form, nombre: e.target.value}); setAlertasSimilares([]) }} onBlur={handleNombreBlur} required />
                  {alertasSimilares.length > 0 && (
                    <div style={{
                      marginTop: '0.6rem', padding: '0.8rem 1rem',
                      background: 'rgba(255, 190, 11, 0.08)',
                      border: '1px solid rgba(255, 190, 11, 0.4)',
                      borderRadius: '6px'
                    }}>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 600, color: '#ffbe0b', letterSpacing: '0.04em' }}>
                        POSIBLE DUPLICADO — ya existe una alerta activa con nombre similar:
                      </p>
                      {alertasSimilares.map(a => (
                        <div key={a.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem' }}>
                          {a.fotoUrl && (
                            <img src={a.fotoUrl.startsWith('http') ? a.fotoUrl : `http://localhost:8081${a.fotoUrl}`} alt={a.nombre}
                              style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                          )}
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--white)', fontWeight: 500 }}>{a.nombre}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--gray)', marginLeft: '0.4rem' }}>
                              {a.edad} años · {a.origen === 'API_EXTERNA' ? 'API oficial' : 'Carga manual'}
                            </span>
                            {a.ultimaUbicacionConocida && (
                              <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: 'var(--gray)' }}>{a.ultimaUbicacionConocida}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Edad</label>
                  <input type="number" value={form.edad} onChange={e => setForm({...form, edad: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Descripción</label>
                  <textarea rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Foto del desaparecido <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
                  <input ref={fotoInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />

                  {fotoPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.4rem' }}>
                      <img src={fotoPreview} alt="Preview"
                        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--red)', display: 'block' }} />
                      <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                      <button type="button" onClick={() => fotoInputRef.current?.click()}
                        style={{ marginTop: '0.5rem', display: 'block', background: 'none', border: '1px solid var(--border)', color: 'var(--gray)', borderRadius: '4px', padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer', width: '120px' }}>
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fotoInputRef.current?.click()}
                      onDrop={handleFotoDrop}
                      onDragOver={(e) => { e.preventDefault(); setFotoDragOver(true) }}
                      onDragLeave={() => setFotoDragOver(false)}
                      style={{
                        marginTop: '0.4rem', border: `2px dashed ${fotoDragOver ? 'var(--red)' : 'var(--border)'}`,
                        borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                        background: fotoDragOver ? 'rgba(230,57,70,0.05)' : 'transparent',
                        transition: 'border-color 0.2s, background 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem', opacity: 0.4 }}>↑</div>
                      <p style={{ margin: 0, color: 'var(--gray)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                        Arrastrá una foto acá<br />
                        <span style={{ color: 'var(--border2)', fontSize: '0.72rem' }}>o hacé click para seleccionar</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Última ubicación conocida</label>
                  <DireccionAutocomplete onSeleccionar={handleDireccionSeleccionada} valorexterno={direccionExterna} />
                  {puntoSelec && (
                    <p className="msg-info" style={{ marginTop: '0.5rem' }}>
                      <span>↗</span>
                      {puntoSelec.lat.toFixed(5)}, {puntoSelec.lng.toFixed(5)}
                    </p>
                  )}
                </div>
                <button type="submit" className="btn-red" disabled={publicando}>
                  {publicando ? 'Publicando...' : 'Publicar y notificar vecinos →'}
                </button>
              </form>
            </div>
            <div className="admin-panel">
              <p className="panel-title">Marcar ubicación en el mapa</p>
              <p className="map-hint">La dirección se marca automáticamente — también podés hacer click para ajustar</p>
              <div className="map-wrap">
                <MapContainer center={[-34.6037, -58.3816]} zoom={13} style={{ height: '100%' }}>
                  <TileLayer
                    url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZ2lhbm4wMiIsImEiOiJjbW5mMGRoOGowNTh2Mm5wcHMyanVtenl0In0.mnb1yi5TmJZJrDxIwBzQxA"
                    attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                    tileSize={256}
                    maxZoom={22}
                  />
                  <ClickEnMapa onClickMapa={handleClickMapa} />
                  {flyCoords && <FlyTo coords={flyCoords} />}
                  {puntoSelec && (
                    <Marker position={[puntoSelec.lat, puntoSelec.lng]} icon={iconoRojo}>
                      <Popup>Lugar de desaparición</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Estadísticas ── */}
        {vista === 'estadisticas' && (
          <div className="admin-panel">
            <p className="panel-title" style={{ marginBottom: '1.5rem' }}>Estadísticas del sistema</p>
            {!estadisticas ? (
              <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>Cargando...</p>
            ) : (
              <>
                {/* Grid único de 12 columnas — cada sección usa span para alinear */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1px', background: 'var(--border)', marginBottom: '1.5rem' }}>

                  {/* Encabezado Alertas */}
                  <SectionLabel label="Alertas" />
                  {/* 4 cards × span 3 = 12 */}
                  <StatCard span={3} label="Total"              value={estadisticas.totalAlertas} />
                  <StatCard span={3} label="Activas"            value={estadisticas.alertasActivas}   color="var(--red)"   />
                  <StatCard span={3} label="Resueltas"          value={estadisticas.alertasResueltas} color="var(--green)" />
                  <StatCard span={3} label="API / Manual"       value={`${estadisticas.origenApi} / ${estadisticas.origenManual}`} />

                  {/* Encabezado Notificaciones */}
                  <SectionLabel label="Notificaciones" />
                  {/* 4 cards × span 3 = 12 */}
                  <StatCard span={3} label="Vecinos notificados"  value={estadisticas.totalVecinosNotificados} />
                  <StatCard span={3} label="Reportes recibidos"   value={estadisticas.totalReportes} />
                  <StatCard span={3} label="Tasa de respuesta"    value={estadisticas.tasaRespuesta} suffix="%" color={estadisticas.tasaRespuesta > 5 ? 'var(--green)' : 'var(--gray)'} />
                  <StatCard span={3} label="Prom. por alerta"     value={estadisticas.promedioReportesPorAlerta} />

                  {/* Encabezado Reportes */}
                  <SectionLabel label="Reportes" />
                  {/* 2 cards × span 6 = 12 */}
                  <StatCard span={6} label="Anónimos"            value={estadisticas.reportesAnonimos} />
                  <StatCard span={6} label="Identificados"       value={estadisticas.reportesIdentificados} />

                </div>
                {estadisticas.alertaConMasReportes && (
                  <div style={{ background: 'var(--bg2)', padding: '1.2rem 1.5rem', marginTop: '1px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--gray)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                      Alerta con más reportes
                    </p>
                    <p style={{ fontSize: '1.1rem', color: 'var(--white)', fontWeight: 600, margin: 0 }}>
                      {estadisticas.alertaConMasReportes.nombre}
                      <span style={{ color: 'var(--red)', marginLeft: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {estadisticas.alertaConMasReportes.cantidad} reporte{estadisticas.alertaConMasReportes.cantidad !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Lista + mapa ── */}
        {vista === 'lista' && (
          <div
            className="admin-grid"
            style={{ gridTemplateColumns: alertaSelec ? '380px 1fr' : '1fr', display: 'grid', gap: '1px', background: 'var(--border)' }}
          >
            <div className="admin-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                  <button
                    onClick={() => { setTabAlertas('activas'); setAlertaSelec(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.04em', padding: '0.2rem 0',
                      color: tabAlertas === 'activas' ? 'var(--white)' : 'var(--gray)',
                      borderBottom: tabAlertas === 'activas' ? '2px solid var(--red)' : '2px solid transparent'
                    }}
                  >
                    {alertas.length} Activas
                  </button>
                  <button
                    onClick={() => { setTabAlertas('resueltas'); setAlertaSelec(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.04em', padding: '0.2rem 0',
                      color: tabAlertas === 'resueltas' ? 'var(--white)' : 'var(--gray)',
                      borderBottom: tabAlertas === 'resueltas' ? '2px solid var(--red)' : '2px solid transparent'
                    }}
                  >
                    {alertasResueltas.length} Resueltas
                  </button>
                </div>
                {alertaSelec && (
                  <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }} onClick={() => setAlertaSelec(null)}>
                    ← Ver todas
                  </button>
                )}
              </div>
              {tabAlertas === 'activas' && alertas.length === 0 && (
                <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  // Sin alertas registradas
                </p>
              )}
              {tabAlertas === 'resueltas' && alertasResueltas.length === 0 && (
                <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  // Sin alertas resueltas
                </p>
              )}
              {(alertaSelec
                ? (tabAlertas === 'activas' ? alertas : alertasResueltas).filter(a => a.id === alertaSelec.id)
                : tabAlertas === 'activas' ? alertas : alertasResueltas
              ).map(a => (
                <div key={a.id} className="admin-alerta-row">
                  <div>
                    {a.estado === 'ACTIVA'
                      ? <span className="status-activa">Activa</span>
                      : <span className="status-resuelta">Resuelta</span>
                    }
                    <div className="admin-alerta-nombre">{a.nombre}</div>
                    <div className="admin-alerta-meta">{a.edad} años · {a.ultimaUbicacionConocida}</div>
                    <div className="admin-alerta-meta" style={{ marginTop: '0.2rem', color: a.vecinosNotificados > 0 ? 'var(--green)' : 'var(--gray)' }}>
                      {a.vecinosNotificados > 0
                        ? `✉ ${a.vecinosNotificados} vecino${a.vecinosNotificados !== 1 ? 's' : ''} notificado${a.vecinosNotificados !== 1 ? 's' : ''}`
                        : '✉ Sin vecinos en la zona'
                      }
                    </div>
                  </div>
                  <div className="admin-alerta-actions">
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => verReportes(a)}
                    >
                      Reportes {conteoReportes[a.id] > 0 && (
                        <span style={{ marginLeft: '0.3rem', background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.68rem' }}>
                          {conteoReportes[a.id]}
                        </span>
                      )}
                    </button>
                    {a.estado === 'ACTIVA' && (
                      <button
                        className="btn-green"
                        style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => handleResolver(a.id)}
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {alertaSelec && (
              <div className="admin-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                  <p className="panel-title" style={{ margin: 0 }}>
                    Reportes — {alertaSelec.nombre}
                    <span style={{ marginLeft: '0.6rem', color: 'var(--gray)' }}>
                      ({reportes.length})
                    </span>
                  </p>
                  <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setAlertaSelec(null)}>✕</button>
                </div>

                <div className="map-wrap map-wrap-full" style={{ marginBottom: trayectoria.length > 0 ? '0.6rem' : '1rem' }}>
                  <MapContainer
                    bounds={[
                      [alertaSelec.ubicacion?.y ?? -34.6037, alertaSelec.ubicacion?.x ?? -58.3816],
                      ...trayectoria.map(r => [r.lat, r.lng]),
                      ...reportes.filter(r => r.ubicacion).map(r => [r.ubicacion.y, r.ubicacion.x]),
                    ]}
                    boundsOptions={{ padding: [50, 50] }}
                    style={{ height: '100%' }}
                  >
                    <TileLayer
                      url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZ2lhbm4wMiIsImEiOiJjbW5mMGRoOGowNTh2Mm5wcHMyanVtenl0In0.mnb1yi5TmJZJrDxIwBzQxA"
                      attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                      tileSize={256}
                      maxZoom={22}
                    />
                    <FitBounds bounds={[
                      [alertaSelec.ubicacion?.y, alertaSelec.ubicacion?.x],
                      ...trayectoria.map(r => [r.lat, r.lng]),
                      ...reportes.filter(r => r.ubicacion).map(r => [r.ubicacion.y, r.ubicacion.x]),
                    ]} />
                    <Marker position={[alertaSelec.ubicacion?.y, alertaSelec.ubicacion?.x]} icon={iconoRojo}>
                      <Popup><b>Lugar de desaparición</b><br />{alertaSelec.nombre}</Popup>
                    </Marker>
                    {trayectoria.length > 0 ? (
                      <>
                        <Polyline
                          positions={trayectoria.map(r => [r.lat, r.lng])}
                          color="#e53e3e"
                          weight={3}
                          dashArray="6 4"
                        />
                        {trayectoria.map((r, i) => (
                          <Marker key={r.mongoId} position={[r.lat, r.lng]} icon={crearIconoNumero(i + 1)}>
                            <Popup>
                              <b>Avistamiento #{i + 1}</b><br />{r.descripcion}<br />
                              <small>{new Date(r.timestamp).toLocaleString('es-AR')}</small>
                            </Popup>
                          </Marker>
                        ))}
                      </>
                    ) : (
                      reportes.filter(r => r.ubicacion).map(r => (
                        <Marker key={r.id} position={[r.ubicacion.y, r.ubicacion.x]}>
                          <Popup>
                            <b>Reporte</b><br />{r.descripcion}<br />
                            <small>{new Date(r.timestamp).toLocaleString()}</small>
                          </Popup>
                        </Marker>
                      ))
                    )}
                  </MapContainer>
                </div>
                {trayectoria.length > 0 && (
                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {trayectoria.map((r, i) => (
                      <div key={r.mongoId} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.78rem', color: 'var(--gray)', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--red)', fontWeight: 700, minWidth: '20px', fontFamily: 'var(--font-mono)' }}>#{i + 1}</span>
                        <span style={{ flex: 1 }}>{r.descripcion}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{new Date(r.timestamp).toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {reportes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '1.6rem', opacity: 0.2, marginBottom: '0.6rem' }}>◎</div>
                    <p style={{ margin: 0, color: 'var(--gray)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      Ningún vecino reportó avistamientos<br />para esta alerta todavía.
                    </p>
                  </div>
                )}
                {reportes.map(r => (
                  <div key={r.id} className="reporte-item">
                    <p className="reporte-desc">{r.descripcion}</p>
                    <p className="reporte-time">
                      {r.reportadoPor
                        ? <span style={{ color: 'var(--white)', marginRight: '0.5rem' }}>{r.reportadoPor}</span>
                        : <span style={{ color: 'var(--gray)', marginRight: '0.5rem' }}>Anónimo</span>
                      }
                      · {new Date(r.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
