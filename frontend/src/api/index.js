import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8081/api' })

export const registrarUsuario = (datos) => api.post('/usuarios/registrar', datos)
export const obtenerAlertas          = ()      => api.get('/alertas')
export const obtenerAlertasResueltas = ()      => api.get('/alertas/resueltas')
export const obtenerAlerta    = (id)    => api.get(`/alertas/${id}`)
export const crearAlerta      = (datos) => api.post('/alertas', datos)
export const resolverAlerta   = (id)    => api.put(`/alertas/${id}/resolver`)
export const enviarReporte    = (datos) => api.post('/reportes', datos)
export const obtenerReportes  = (id)    => api.get(`/reportes/${id}`)
export const obtenerTrayectoria = (id)  => api.get(`/reportes/${id}/trayectoria`)
export const obtenerConteoReportes = () => api.get('/reportes/conteo')
export const buscarAlertasSimilares  = (nombre) => api.get(`/alertas/buscar?nombre=${encodeURIComponent(nombre)}`)
export const obtenerEstadisticas     = ()       => api.get('/admin/estadisticas')
export const subirFoto        = (file)  => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
