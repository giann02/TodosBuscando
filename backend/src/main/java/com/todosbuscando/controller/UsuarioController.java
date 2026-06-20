package com.todosbuscando.controller;

import com.todosbuscando.model.ActualizarUbicacionRequest;
import com.todosbuscando.model.Usuario;
import com.todosbuscando.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> body) {
        String nombre = (String) body.get("nombre");
        String email  = (String) body.get("email");
        double lat    = ((Number) body.get("lat")).doubleValue();
        double lng    = ((Number) body.get("lng")).doubleValue();

        try {
            Usuario usuario = usuarioService.registrar(nombre, email, lat, lng);
            return ResponseEntity.ok(usuario);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Permite a un usuario actualizar su ubicación (ej: cuando se muda).
     * PUT /api/usuarios/{id}/ubicacion
     * Body: { "latitud": -34.6037, "longitud": -58.3816 }
     */
    @PutMapping("/{id}/ubicacion")
    public ResponseEntity<?> actualizarUbicacion(
            @PathVariable String id,
            @Valid @RequestBody ActualizarUbicacionRequest request) {
        try {
            Usuario usuario = usuarioService.actualizarUbicacion(id, request);
            return ResponseEntity.ok(usuario);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }
    }
}
