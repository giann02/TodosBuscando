package com.todosbuscando.repository;

import com.todosbuscando.model.ReporteNodo;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import java.util.List;
import java.util.Optional;

public interface ReporteNeoRepository extends Neo4jRepository<ReporteNodo, String> {

    @Query("MATCH (r:Reporte {alertaId: $alertaId}) RETURN r ORDER BY r.timestamp ASC")
    List<ReporteNodo> findTrayectoriaByAlertaId(String alertaId);

    @Query("MATCH (r:Reporte {alertaId: $alertaId}) RETURN r ORDER BY r.timestamp DESC LIMIT 1")
    Optional<ReporteNodo> findUltimoByAlertaId(String alertaId);
}
