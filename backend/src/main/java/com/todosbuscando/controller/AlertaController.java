package com.todosbuscando.controller;

import com.todosbuscando.model.Alerta;
import com.todosbuscando.service.AlertaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alertas")
@RequiredArgsConstructor
public class AlertaController {

    private final AlertaService alertaService;

    // GET /api/alertas — listar alertas activas
    @GetMapping
    public ResponseEntity<List<Alerta>> listar() {
        return ResponseEntity.ok(alertaService.obtenerActivas());
    }

    // GET /api/alertas/buscar?nombre=X — búsqueda de texto completo para detección de duplicados
    @GetMapping("/buscar")
    public ResponseEntity<List<Alerta>> buscar(@RequestParam String nombre) {
        if (nombre == null || nombre.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(alertaService.buscarSimilares(nombre.trim()));
    }

    // GET /api/alertas/:id — detalle de una alerta
    @GetMapping("/{id}")
    public ResponseEntity<Alerta> detalle(@PathVariable String id) {
        return ResponseEntity.ok(alertaService.obtenerPorId(id));
    }

    // POST /api/alertas — crear alerta (admin)
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        if (body.get("edad") == null || body.get("lat") == null || body.get("lng") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Campos obligatorios faltantes: edad, lat, lng"));
        }
        Alerta alerta = new Alerta();
        alerta.setNombre((String) body.get("nombre"));
        alerta.setEdad(((Number) body.get("edad")).intValue());
        alerta.setDescripcion((String) body.get("descripcion"));
        alerta.setUltimaUbicacionConocida((String) body.get("ultimaUbicacionConocida"));
        alerta.setFotoUrl((String) body.get("fotoUrl"));

        double lat = ((Number) body.get("lat")).doubleValue();
        double lng = ((Number) body.get("lng")).doubleValue();
        alerta.setUbicacion(new GeoJsonPoint(lng, lat));

        return ResponseEntity.ok(alertaService.crearAlerta(alerta));
    }

    // GET /api/alertas/resueltas — listar alertas resueltas
    @GetMapping("/resueltas")
    public ResponseEntity<List<Alerta>> listarResueltas() {
        return ResponseEntity.ok(alertaService.obtenerResueltas());
    }

    // PUT /api/alertas/:id/resolver — marcar como resuelta (admin)
    @PutMapping("/{id}/resolver")
    public ResponseEntity<Alerta> resolver(@PathVariable String id) {
        return ResponseEntity.ok(alertaService.resolverAlerta(id));
    }
}
