package com.todosbuscando.service;

import com.todosbuscando.model.Reporte;
import com.todosbuscando.model.ReporteNodo;
import com.todosbuscando.repository.ReporteNeoRepository;
import com.todosbuscando.repository.ReporteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.bson.Document;
import org.springframework.stereotype.Service;


import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReporteService {

    private final ReporteRepository reporteRepository;
    private final ReporteNeoRepository reporteNeoRepository;
    private final MongoTemplate mongoTemplate;

    public Reporte guardar(Reporte reporte) {
        // 1. Guardar en MongoDB
        Reporte guardado = reporteRepository.save(reporte);

        // 2. Guardar en Neo4j solo si tiene ubicación
        if (reporte.getUbicacion() != null) {
            try {
                ReporteNodo nodo = new ReporteNodo();
                nodo.setMongoId(guardado.getId());
                nodo.setAlertaId(guardado.getAlertaId());
                nodo.setDescripcion(guardado.getDescripcion());
                nodo.setLat(reporte.getUbicacion().getY());
                nodo.setLng(reporte.getUbicacion().getX());
                nodo.setTimestamp(guardado.getTimestamp());

                // Buscar el anterior ANTES de guardar nodo (para que sea el verdadero último)
                ReporteNodo anterior = reporteNeoRepository
                    .findUltimoByAlertaId(guardado.getAlertaId())
                    .orElse(null);

                // Guardar nodo nuevo en Neo4j
                reporteNeoRepository.save(nodo);

                // Si había un anterior, crear la relación SIGUIENTE
                if (anterior != null) {
                    anterior.setSiguiente(nodo);
                    reporteNeoRepository.save(anterior);
                }
                log.info("[Neo4j] Nodo creado para reporte {} de alerta {}", guardado.getId(), guardado.getAlertaId());
            } catch (Exception e) {
                // Neo4j no bloquea el flujo principal si falla
                log.warn("[Neo4j] No se pudo guardar el nodo: {}", e.getMessage());
            }
        }

        return guardado;
    }

    public List<ReporteNodo> obtenerTrayectoria(String alertaId) {
        return reporteNeoRepository.findTrayectoriaByAlertaId(alertaId);
    }

    public List<Reporte> listarPorAlerta(String alertaId) {
        return reporteRepository.findByAlertaId(alertaId);
    }

    public Map<String, Long> obtenerConteo() {
        Aggregation agg = Aggregation.newAggregation(
            Aggregation.group("alertaId").count().as("total")
        );
        AggregationResults<Document> results =
            mongoTemplate.aggregate(agg, "reportes", Document.class);
        Map<String, Long> conteo = new HashMap<>();
        for (Document doc : results.getMappedResults()) {
            conteo.put(doc.getString("_id"), ((Number) doc.get("total")).longValue());
        }
        return conteo;
    }
}
