/**
 * Arma una dirección corta a partir del objeto `address` de Nominatim.
 * Resultado típico: "Av. Corrientes 1234, San Nicolás, Buenos Aires"
 */
export function formatearDireccion(address, fallback = '') {
  if (!address) return fallback

  const calle  = address.road || address.pedestrian || address.footway || address.street || address.path
  const numero = address.house_number
  const barrio = address.suburb || address.neighbourhood || address.quarter || address.city_district
  const ciudad = address.city || address.town || address.village || address.municipality || address.county
  const provincia = address.state

  const partes = []

  if (calle)   partes.push(numero ? `${calle} ${numero}` : calle)
  if (barrio && barrio !== ciudad) partes.push(barrio)
  if (ciudad)  partes.push(ciudad)
  else if (provincia) partes.push(provincia)

  return partes.length > 0 ? partes.join(', ') : fallback
}
