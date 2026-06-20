package com.todosbuscando.model;

import lombok.Data;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;

import java.time.LocalDateTime;

@Data
@Node("Reporte")
public class ReporteNodo {

    @Id
    private String mongoId;

    private String alertaId;
    private String descripcion;
    private double lat;
    private double lng;
    private LocalDateTime timestamp;

    @Relationship(type = "SIGUIENTE", direction = Relationship.Direction.OUTGOING)
    private ReporteNodo siguiente;
}
