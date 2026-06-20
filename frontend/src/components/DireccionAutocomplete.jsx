import { useState, useEffect, useRef } from 'react'
import { formatearDireccion } from '../utils/direccion'

export default function DireccionAutocomplete({ onSeleccionar, valorexterno }) {
  const [query, setQuery]             = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto]         = useState(false)
  const [cargando, setCargando]       = useState(false)
  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  // Cuando el padre actualiza la dirección (ej: click en mapa), reflejarla en el input
  useEffect(() => {
    if (valorexterno !== undefined) {
      setQuery(valorexterno)
      setAbierto(false)
      setSugerencias([])
    }
  }, [valorexterno])

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscar = (valor) => {
    setQuery(valor)
    clearTimeout(debounceRef.current)

    if (valor.trim().length < 4) {
      setSugerencias([])
      setAbierto(false)
      return
    }

    setCargando(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(valor)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data = await res.json()
        setSugerencias(data)
        setAbierto(data.length > 0)
      } catch {
        setSugerencias([])
      } finally {
        setCargando(false)
      }
    }, 350)
  }

  const seleccionar = (item) => {
    const direccion = formatearDireccion(item.address, item.display_name)
    setQuery(direccion)
    setAbierto(false)
    setSugerencias([])
    onSeleccionar({ direccion, lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
  }

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <div className="autocomplete-input-wrap">
        <input
          type="text"
          value={query}
          onChange={e => buscar(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
          autoComplete="off"
        />
        {cargando && <span className="autocomplete-spinner" />}
      </div>

      {abierto && sugerencias.length > 0 && (
        <ul className="autocomplete-dropdown">
          {sugerencias.map((item, i) => (
            <li
              key={i}
              className="autocomplete-item"
              onMouseDown={() => seleccionar(item)}
            >
              <span className="autocomplete-icon">↗</span>
              <span className="autocomplete-text">{formatearDireccion(item.address, item.display_name)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
