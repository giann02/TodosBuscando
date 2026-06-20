package com.todosbuscando.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Estadísticas calculadas con el Aggregation Pipeline de MongoDB,
 * que implementa el patrón MapReduce moderno (reemplaza al mapReduce()
 * deprecado en MongoDB 5.0 y eliminado en 7.0).
 *
 * Cada aggregation sigue el flujo:
 *   MAP   → $project / $group inicial — emite pares clave-valor por documento
 *   REDUCE → $group con acumuladores   — combina los valores por clave
 */
@RestController
@RequestMapping("/api/admin/estadisticas")
@RequiredArgsConstructor
public class EstadisticasController {

    private final MongoTemplate mongoTemplate;

    @GetMapping
    public ResponseEntity<Map<String, Object>> obtener() {

        // ── MAP-REDUCE 1: estadísticas de alertas ─────────────────────────
        // MAP:    cada alerta emite su estado, origen y vecinosNotificados
        // REDUCE: suma vecinosNotificados en un único documento
        // Los conteos por estado/origen se hacen con queries directas porque
        // $cond con Criteria.is() no matchea correctamente en aggregation
        Aggregation alertasAgg = Aggregation.newAggregation(
            Aggregation.group()
                .count().as("total")
                .sum("vecinosNotificados").as("totalVecinos")
        );
        AggregationResults<Map> alertasResult =
            mongoTemplate.aggregate(alertasAgg, "alertas", Map.class);
        Map alertasStats = alertasResult.getUniqueMappedResult();

        long totalAlertas  = alertasStats != null ? ((Number) alertasStats.get("total")).longValue()      : 0;
        long totalVecinos  = alertasStats != null ? ((Number) alertasStats.get("totalVecinos")).longValue(): 0;

        long alertasActivas   = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(
            Criteria.where("estado").is("ACTIVA")), "alertas");
        long alertasResueltas = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(
            Criteria.where("estado").is("RESUELTA")), "alertas");
        long origenManual     = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(
            Criteria.where("origen").is("MANUAL")), "alertas");
        long origenApi        = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(
            Criteria.where("origen").is("API_EXTERNA")), "alertas");

        // ── MAP-REDUCE 2: estadísticas de reportes ────────────────────────
        // El conteo de anónimos/identificados se hace con queries directas porque
        // $cond con Criteria.is(null) no detecta correctamente campos ausentes
        long totalReportes = mongoTemplate.count(
            new org.springframework.data.mongodb.core.query.Query(), "reportes");

        long reportesAnonimos = mongoTemplate.count(
            new org.springframework.data.mongodb.core.query.Query(
                new Criteria().orOperator(
                    Criteria.where("reportadoPor").is(null),
                    Criteria.where("reportadoPor").exists(false)
                )), "reportes");

        long reportesIdentificados = totalReportes - reportesAnonimos;

        // ── MAP-REDUCE 3: alerta con más reportes ─────────────────────────
        // MAP:    cada reporte emite su alertaId con valor 1
        // REDUCE: agrupa por alertaId y suma → sort → top 1
        // El lookup se hace por separado para evitar el mismatch String/ObjectId
        Aggregation topAlertaAgg = Aggregation.newAggregation(
            Aggregation.group("alertaId").count().as("cantidad"),
            Aggregation.sort(org.springframework.data.domain.Sort.Direction.DESC, "cantidad"),
            Aggregation.limit(1)
        );
        AggregationResults<Map> topResult =
            mongoTemplate.aggregate(topAlertaAgg, "reportes", Map.class);
        Map topAlertaRaw = topResult.getUniqueMappedResult();

        Map<String, Object> alertaConMasReportes = null;
        if (topAlertaRaw != null) {
            String alertaId = topAlertaRaw.get("_id").toString();
            long cantidad = ((Number) topAlertaRaw.get("cantidad")).longValue();
            org.springframework.data.mongodb.core.query.Query q =
                new org.springframework.data.mongodb.core.query.Query(
                    Criteria.where("_id").is(alertaId));
            q.fields().include("nombre");
            Map alertaDoc = mongoTemplate.findOne(q, Map.class, "alertas");
            if (alertaDoc != null) {
                alertaConMasReportes = new HashMap<>();
                alertaConMasReportes.put("id",       alertaId);
                alertaConMasReportes.put("nombre",   alertaDoc.get("nombre"));
                alertaConMasReportes.put("cantidad", cantidad);
            }
        }

        // ── Métricas derivadas ────────────────────────────────────────────
        double promedioReportes = totalAlertas > 0
            ? Math.round((double) totalReportes / totalAlertas * 10.0) / 10.0 : 0;

        double tasaRespuesta = totalVecinos > 0
            ? Math.round((double) totalReportes / totalVecinos * 1000.0) / 10.0 : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAlertas",             totalAlertas);
        stats.put("alertasActivas",           alertasActivas);
        stats.put("alertasResueltas",         alertasResueltas);
        stats.put("origenManual",             origenManual);
        stats.put("origenApi",               origenApi);
        stats.put("totalVecinosNotificados",  totalVecinos);
        stats.put("totalReportes",            totalReportes);
        stats.put("promedioReportesPorAlerta",promedioReportes);
        stats.put("tasaRespuesta",            tasaRespuesta);
        stats.put("reportesAnonimos",         reportesAnonimos);
        stats.put("reportesIdentificados",    reportesIdentificados);
        stats.put("alertaConMasReportes",     alertaConMasReportes);

        return ResponseEntity.ok(stats);
    }
}
