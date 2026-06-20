package com.todosbuscando.repository;

import com.todosbuscando.model.Reporte;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReporteRepository extends MongoRepository<Reporte, String> {

    List<Reporte> findByAlertaId(String alertaId);
    long countByAlertaId(String alertaId);
}
