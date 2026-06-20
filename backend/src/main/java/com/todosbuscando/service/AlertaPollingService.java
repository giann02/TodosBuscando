package com.todosbuscando.service;

import com.todosbuscando.model.Alerta;
import com.todosbuscando.repository.AlertaRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.net.MalformedURLException;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertaPollingService {

    private final AlertaRepository alertaRepository;
    private final AlertaService alertaService;
    private final RestTemplate restTemplate;

    // URL base sin el parámetro de año (se agrega dinámicamente)
    @Value("${alerta.api.externa.url}")
    private String apiUrlBase;

    private static final Pattern EDAD_PATTERN =
        Pattern.compile("Edad al momento de su ausencia: (\\d+) años");
    private static final Pattern LUGAR_PATTERN =
        Pattern.compile("Lugar de desaparición: (.+)$");
    private static final Pattern FECHA_PATTERN =
        Pattern.compile("Fecha de desaparición: \\(?(\\d{2}/\\d{2}/\\d{4})\\)?");
    private static final DateTimeFormatter FECHA_FORMATTER =
        DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PostConstruct
    private void validarUrlConfiguracion() {
        try {
            URL url = new URL(apiUrlBase);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                throw new IllegalStateException(
                    "La URL de la API externa debe usar HTTPS. Valor actual: " + apiUrlBase);
            }
        } catch (MalformedURLException e) {
            throw new IllegalStateException(
                "La URL configurada en alerta.api.externa.url no es válida: " + apiUrlBase);
        }
        log.info("[Polling] API externa configurada correctamente.");
    }

    /**
     * Al arrancar, geocodifica las alertas de la API que quedaron sin coordenadas
     * (por ejemplo si Nominatim falló durante un import anterior).
     * También notifica a los vecinos cercanos que no fueron notificados.
     */
    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void geocodificarPendientes() {
        List<Alerta> pendientes = alertaRepository.findByOrigenSinUbicacion("API_EXTERNA");
        if (pendientes.isEmpty()) return;

        log.info("[Polling] {} alerta(s) sin coordenadas — geocodificando...", pendientes.size());
        for (Alerta alerta : pendientes) {
            GeoJsonPoint punto = geocodificar(alerta.getUltimaUbicacionConocida());
            if (punto != null) {
                alerta.setUbicacion(punto);
                alertaRepository.save(alerta);
                alertaService.notificarVecinos(alerta);
                log.info("[Polling] Ubicación actualizada y vecinos notificados para '{}'", alerta.getNombre());
            }
            // Respetar el rate limit de Nominatim: 1 request/segundo
            try { Thread.sleep(1100); } catch (InterruptedException ignored) {}
        }
    }

    @Scheduled(fixedDelayString = "${alerta.api.externa.intervalo-ms:600000}")
    public void sincronizar() {
        log.info("[Polling] Iniciando sincronización con API externa...");

        try {
            String url = apiUrlBase + "?anio=" + LocalDate.now().getYear();

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null) {
                log.warn("[Polling] Respuesta nula de la API externa.");
                return;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            if (data == null) {
                log.warn("[Polling] La respuesta no contiene el campo 'data'.");
                return;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> personas = (List<Map<String, Object>>) data.get("personas");
            if (personas == null || personas.isEmpty()) {
                log.info("[Polling] No hay personas en la respuesta de la API.");
                return;
            }

            int nuevas = 0;
            int duplicadas = 0;
            int ignoradas = 0;

            for (Map<String, Object> persona : personas) {
                String slug = extraerString(persona, "slug");
                if (slug == null) {
                    log.warn("[Polling] Persona sin slug, se ignora.");
                    continue;
                }

                if (alertaRepository.findByIdExterno(slug).isPresent()) {
                    duplicadas++;
                    continue;
                }

                String descripcion = extraerString(persona, "descripcion");
                int edad = extraerEdad(descripcion);

                // Solo menores de 18
                if (edad < 0 || edad >= 18) {
                    ignoradas++;
                    continue;
                }

                String lugar = extraerLugar(descripcion);

                Alerta nueva = new Alerta();
                nueva.setIdExterno(slug);
                nueva.setOrigen("API_EXTERNA");
                nueva.setNombre(extraerString(persona, "nombre"));
                nueva.setEdad(edad);
                nueva.setFotoUrl(extraerString(persona, "foto_url"));
                nueva.setUltimaUbicacionConocida(lugar);
                nueva.setFechaDesaparicion(extraerFecha(descripcion));
                nueva.setDescripcion(limpiarDescripcion(descripcion));
                nueva.setUbicacion(geocodificar(lugar));

                alertaService.guardarYNotificar(nueva);
                nuevas++;
            }

            if (nuevas > 0) alertaService.invalidarCache();

            log.info("[Polling] Sincronización completa. Nuevas: {}, Ya existían: {}, Ignoradas (mayores de 18): {}",
                nuevas, duplicadas, ignoradas);

        } catch (Exception e) {
            log.error("[Polling] Error al sincronizar con la API externa: {}", e.getMessage());
        }
    }

    private String limpiarDescripcion(String descripcion) {
        if (descripcion == null) return null;
        return descripcion.replaceFirst("Fecha de desaparición: \\(?\\d{2}/\\d{2}/\\d{4}\\)?\\s*", "").trim();
    }

    private LocalDate extraerFecha(String descripcion) {
        if (descripcion == null) return null;
        Matcher m = FECHA_PATTERN.matcher(descripcion);
        if (!m.find()) return null;
        try {
            return LocalDate.parse(m.group(1), FECHA_FORMATTER);
        } catch (Exception e) {
            return null;
        }
    }

    private int extraerEdad(String descripcion) {
        if (descripcion == null) return -1;
        Matcher m = EDAD_PATTERN.matcher(descripcion);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    private String extraerLugar(String descripcion) {
        if (descripcion == null) return null;
        Matcher m = LUGAR_PATTERN.matcher(descripcion);
        return m.find() ? m.group(1).trim() : null;
    }

    private String extraerString(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        return valor instanceof String ? (String) valor : null;
    }

    /**
     * Convierte un texto de lugar ("La Plata, Buenos Aires") a coordenadas GeoJSON
     * usando la API pública de Nominatim (OpenStreetMap).
     * Agrega ", Argentina" a la query para reducir ambigüedades geográficas.
     * Devuelve null si la geocodificación falla o no hay resultados.
     */
    @SuppressWarnings("unchecked")
    private GeoJsonPoint geocodificar(String lugar) {
        if (lugar == null || lugar.isBlank()) return null;

        // Limpieza: trim primero, luego "Provincia de" y punto final
        String lugarLimpio = lugar.trim()
            .replaceAll("(?i)\\bProvincia de\\s+", "")
            .replaceAll("[.,]+$", "")
            .trim();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TodosBuscandoApp/1.0 (todosbuscandoapp@gmail.com)");

            // RestTemplate con variable de URI: encoding automático y correcto
            String urlTemplate = "https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1";
            ResponseEntity<List> response = restTemplate.exchange(
                urlTemplate, HttpMethod.GET, new HttpEntity<>(headers), List.class,
                Map.of("q", lugarLimpio + ", Argentina")
            );
            List<Map<String, Object>> resultados = response.getBody();

            if (resultados != null && !resultados.isEmpty()) {
                Map<String, Object> r = resultados.get(0);
                double lat = Double.parseDouble((String) r.get("lat"));
                double lon = Double.parseDouble((String) r.get("lon"));
                log.info("[Polling] Geocodificado '{}' → lat={}, lng={}", lugarLimpio, lat, lon);
                return new GeoJsonPoint(lon, lat); // GeoJSON: longitud primero
            }

            log.warn("[Polling] Nominatim no encontró resultados para '{}'", lugarLimpio);
        } catch (Exception e) {
            log.warn("[Polling] Error geocodificando '{}': {}", lugarLimpio, e.getMessage());
        }
        return null;
    }
}
