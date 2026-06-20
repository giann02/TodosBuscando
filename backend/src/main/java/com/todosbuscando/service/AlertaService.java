package com.todosbuscando.service;

import com.todosbuscando.model.Alerta;
import com.todosbuscando.model.Usuario;
import com.todosbuscando.repository.AlertaRepository;
import com.todosbuscando.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertaService {

    private final AlertaRepository alertaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EmailService emailService;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final double RADIO_KM = 2.0;

    // Clave constante del caché — nunca controlada por el usuario
    private static final String CACHE_KEY_ACTIVAS = "alertas:activas";

    @Value("${alerta.cache.ttl-segundos:30}")
    private long cacheTtlSegundos;

    public Map<String, Object> crearAlerta(Alerta alerta) {
        Alerta guardada = alertaRepository.save(alerta);

        int vecinosCount = 0;

        if (alerta.getUbicacion() != null) {
            vecinosCount = notificarVecinos(guardada);
            guardada.setVecinosNotificados(vecinosCount);
            alertaRepository.save(guardada);
        }

        invalidarCacheActivas();

        return Map.of("alerta", guardada, "vecinosNotificados", vecinosCount);
    }

    /**
     * Retorna las alertas activas usando Redis como caché.
     *
     * Flujo:
     *   1. Buscar en Redis → si existe, devolver sin tocar MongoDB
     *   2. Si no existe → consultar MongoDB → guardar en Redis con TTL → devolver
     */
    @SuppressWarnings("unchecked")
    public List<Alerta> obtenerActivas() {
        // 1. Intentar leer desde el caché
        try {
            Object cached = redisTemplate.opsForValue().get(CACHE_KEY_ACTIVAS);
            if (cached != null) {
                log.info("[Cache] Alertas activas servidas desde Redis.");
                return (List<Alerta>) cached;
            }
        } catch (Exception e) {
            // Si Redis falla, continuar hacia MongoDB sin interrumpir el flujo
            log.warn("[Cache] Redis no disponible, consultando MongoDB directamente: {}", e.getMessage());
        }

        // 2. Redis no tenía el dato (o falló) → ir a MongoDB
        List<Alerta> activas = alertaRepository.findByEstado("ACTIVA");

        // 3. Guardar en Redis con TTL configurable
        try {
            redisTemplate.opsForValue().set(
                CACHE_KEY_ACTIVAS,
                activas,
                Duration.ofSeconds(cacheTtlSegundos)
            );
            log.info("[Cache] Alertas activas guardadas en Redis (TTL: {}s).", cacheTtlSegundos);
        } catch (Exception e) {
            log.warn("[Cache] No se pudo guardar en Redis: {} — causa: {}", e.getMessage(),
                e.getCause() != null ? e.getCause().getMessage() : "sin causa");
        }

        return activas;
    }

    public Alerta obtenerPorId(String id) {
        return alertaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerta no encontrada"));
    }

    public int notificarVecinos(Alerta alerta) {
        if (alerta.getUbicacion() == null) return 0;
        Point punto = new Point(alerta.getUbicacion().getX(), alerta.getUbicacion().getY());
        Distance distancia = new Distance(RADIO_KM, Metrics.KILOMETERS);
        List<Usuario> vecinos = usuarioRepository.findByUbicacionNear(punto, distancia);
        if (!vecinos.isEmpty()) {
            try {
                emailService.enviarAlertaVecinos(vecinos, alerta);
            } catch (Exception e) {
                log.error("[AlertaService] Error al enviar emails: {}", e.getMessage());
            }
        }
        return vecinos.size();
    }

    public List<Alerta> obtenerResueltas() {
        return alertaRepository.findByEstado("RESUELTA");
    }

    public List<Alerta> buscarSimilares(String nombre) {
        return alertaRepository.buscarPorNombreTexto(nombre);
    }

    public Alerta resolverAlerta(String id) {
        Alerta alerta = obtenerPorId(id);
        alerta.setEstado("RESUELTA");
        alerta.setResueltaEn(java.time.LocalDateTime.now());
        Alerta resuelta = alertaRepository.save(alerta);

        // Invalidar caché: una alerta pasó a RESUELTA, la lista cambió
        invalidarCacheActivas();

        return resuelta;
    }

    public Alerta guardarYNotificar(Alerta alerta) {
        Alerta guardada = alertaRepository.save(alerta);
        int vecinosCount = notificarVecinos(guardada);
        guardada.setVecinosNotificados(vecinosCount);
        return alertaRepository.save(guardada);
    }

    public void invalidarCache() {
        invalidarCacheActivas();
    }

    /**
     * Elimina la entrada del caché de alertas activas.
     * Se llama siempre que la lista de alertas cambia (crear o resolver).
     */
    private void invalidarCacheActivas() {
        try {
            redisTemplate.delete(CACHE_KEY_ACTIVAS);
            log.info("[Cache] Caché de alertas activas invalidado.");
        } catch (Exception e) {
            log.warn("[Cache] No se pudo invalidar el caché: {}", e.getMessage());
        }
    }
}
