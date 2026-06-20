package com.todosbuscando.repository;

import com.todosbuscando.model.Usuario;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    boolean existsByEmail(String email);

    // Query geoespacial — Spring genera el SQL automáticamente
    List<Usuario> findByUbicacionNear(Point punto, Distance distancia);
}
