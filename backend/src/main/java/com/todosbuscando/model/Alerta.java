package com.todosbuscando.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "alertas")
public class Alerta {

    @Id
    private String id;

    @TextIndexed
    private String nombre;
    private int edad;
    private String descripcion;
    private String fotoUrl;
    private String ultimaUbicacionConocida; // dirección en texto
    private GeoJsonPoint ubicacion;          // coordenadas GeoJSON

    private String estado = "ACTIVA";        // ACTIVA | RESUELTA
    private int vecinosNotificados = 0;
    @CreatedDate
    private LocalDateTime creadoEn;

    private LocalDate fechaDesaparicion;       // null para alertas manuales
    private LocalDateTime resueltaEn;          // null mientras está activa

    // Trazabilidad del origen de la alerta
    private String origen = "MANUAL";        // MANUAL | API_EXTERNA

    // ID proveniente de la API externa (null para alertas manuales).
    // Índice único sparse: permite múltiples nulls (alertas manuales)
    // pero rechaza duplicados de la API externa a nivel de base de datos.
    @Indexed(unique = true, sparse = true)
    private String idExterno;
}
