package com.todosbuscando.repository;

import com.todosbuscando.model.Alerta;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AlertaRepository extends MongoRepository<Alerta, String> {

    List<Alerta> findByEstado(String estado);

    // Usado por el polling service para deduplicar alertas de la API externa
    Optional<Alerta> findByIdExterno(String idExterno);

    // Búsqueda de texto completo sobre nombre — requiere text index en el campo
    @Query("{ '$text': { '$search': ?0 }, 'estado': 'ACTIVA' }")
    List<Alerta> buscarPorNombreTexto(String nombre);

    // Alertas de la API externa que quedaron sin coordenadas (geocodificación pendiente)
    @Query("{ 'origen': ?0, 'ubicacion': null }")
    List<Alerta> findByOrigenSinUbicacion(String origen);
}
