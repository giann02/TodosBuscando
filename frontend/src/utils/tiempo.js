export function etiquetaFecha(alerta) {
  if (alerta.fechaDesaparicion) {
    const [anio, mes, dia] = alerta.fechaDesaparicion.split('-')
    return `Fecha de desaparición: ${dia}/${mes}/${anio}`
  }
  if (alerta.creadoEn) {
    const d = new Date(alerta.creadoEn)
    const dia  = String(d.getDate()).padStart(2, '0')
    const mes  = String(d.getMonth() + 1).padStart(2, '0')
    const anio = d.getFullYear()
    return `Fecha de desaparición: ${dia}/${mes}/${anio}`
  }
  return ''
}
