package com.todosbuscando.service;

import com.todosbuscando.model.ActualizarUbicacionRequest;
import com.todosbuscando.model.Usuario;
import com.todosbuscando.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public Usuario registrar(String nombre, String email, double lat, double lng) {
        if (usuarioRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("El email ya está registrado");
        }
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setUbicacion(new GeoJsonPoint(lng, lat)); // GeoJSON: primero longitud, luego latitud
        return usuarioRepository.save(u);
    }

    public Usuario actualizarUbicacion(String id, ActualizarUbicacionRequest request) {
        // Verificar que el usuario existe antes de actualizar
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // GeoJSON requiere el orden (longitud, latitud)
        usuario.setUbicacion(new GeoJsonPoint(request.getLongitud(), request.getLatitud()));
        return usuarioRepository.save(usuario);
    }
}
