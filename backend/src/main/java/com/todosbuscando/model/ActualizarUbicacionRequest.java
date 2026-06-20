package com.todosbuscando.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActualizarUbicacionRequest {

    @NotNull(message = "La latitud es obligatoria")
    @DecimalMin(value = "-90.0", message = "Latitud mínima: -90")
    @DecimalMax(value = "90.0",  message = "Latitud máxima: 90")
    private Double latitud;

    @NotNull(message = "La longitud es obligatoria")
    @DecimalMin(value = "-180.0", message = "Longitud mínima: -180")
    @DecimalMax(value = "180.0",  message = "Longitud máxima: 180")
    private Double longitud;
}
