package com.todosbuscando.controller;

import com.todosbuscando.model.Reporte;
import com.todosbuscando.model.ReporteNodo;
import com.todosbuscando.service.ReporteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;

    // GET /api/reportes/:alertaId — todos los reportes de una alerta (admin)
    @GetMapping("/{alertaId}")
    public ResponseEntity<List<Reporte>> listar(@PathVariable String alertaId) {
        return ResponseEntity.ok(reporteService.listarPorAlerta(alertaId));
    }

    // GET /api/reportes/conteo — mapa alertaId -> cantidad de reportes
    @GetMapping("/conteo")
    public ResponseEntity<Map<String, Long>> conteo() {
        return ResponseEntity.ok(reporteService.obtenerConteo());
    }

    // GET /api/reportes/:alertaId/trayectoria — cadena de avistamientos desde Neo4j
    @GetMapping("/{alertaId}/trayectoria")
    public ResponseEntity<List<ReporteNodo>> trayectoria(@PathVariable String alertaId) {
        return ResponseEntity.ok(reporteService.obtenerTrayectoria(alertaId));
    }

    // POST /api/reportes — enviar reporte (guarda en MongoDB + Neo4j)
    @PostMapping
    public ResponseEntity<Reporte> crear(@RequestBody Map<String, Object> body) {
        Reporte reporte = new Reporte();
        reporte.setAlertaId((String) body.get("alertaId"));
        reporte.setDescripcion((String) body.get("descripcion"));
        reporte.setReportadoPor((String) body.get("reportadoPor"));

        if (body.get("lat") != null && body.get("lng") != null) {
            double lat = ((Number) body.get("lat")).doubleValue();
            double lng = ((Number) body.get("lng")).doubleValue();
            reporte.setUbicacion(new GeoJsonPoint(lng, lat));
        }

        return ResponseEntity.ok(reporteService.guardar(reporte));
    }
}
