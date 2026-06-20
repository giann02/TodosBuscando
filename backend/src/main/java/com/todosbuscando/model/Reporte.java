package com.todosbuscando.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "reportes")
public class Reporte {

    @Id
    private String id;

    private String alertaId;
    private String descripcion;
    private String reportadoPor;      // null = anónimo
    private GeoJsonPoint ubicacion;   // dónde vio algo el vecino
    @CreatedDate
    private LocalDateTime timestamp;
}
