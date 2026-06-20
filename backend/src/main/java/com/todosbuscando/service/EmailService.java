package com.todosbuscando.service;

import com.todosbuscando.model.Alerta;
import com.todosbuscando.model.Usuario;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Async
    public void enviarAlertaVecinos(List<Usuario> vecinos, Alerta alerta) {
        for (Usuario vecino : vecinos) {
            try {
                MimeMessage mensaje = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
                helper.setTo(vecino.getEmail());
                helper.setSubject("🔴 TodosBuscando — Alerta cerca de tu zona");
                helper.setText(construirHtml(vecino, alerta), true);
                mailSender.send(mensaje);
            } catch (MessagingException e) {
                System.err.println("[EmailService] Error al enviar email a " + vecino.getEmail() + ": " + e.getMessage());
            }
        }
    }

    private String construirHtml(Usuario vecino, Alerta alerta) {
        String fotoHtml = "";
        if (alerta.getFotoUrl() != null && !alerta.getFotoUrl().isBlank()) {
            try {
                // /uploads/archivo.jpg → uploads/archivo.jpg
                String nombreArchivo = alerta.getFotoUrl().replaceFirst("^/uploads/", "");
                byte[] bytes = Files.readAllBytes(Paths.get(uploadDir, nombreArchivo));
                String extension = nombreArchivo.contains(".") ? nombreArchivo.substring(nombreArchivo.lastIndexOf('.') + 1) : "jpeg";
                String mime = extension.equalsIgnoreCase("png") ? "image/png" : "image/jpeg";
                String base64 = Base64.getEncoder().encodeToString(bytes);
                fotoHtml = """
                    <div style="text-align:center; margin: 24px 0;">
                      <img src="data:%s;base64,%s"
                           alt="Foto de %s"
                           style="width:180px; height:180px; object-fit:cover; border-radius:8px;
                                  border: 3px solid #e63946; display:inline-block;" />
                    </div>
                """.formatted(mime, base64, alerta.getNombre());
            } catch (IOException e) {
                System.err.println("[EmailService] No se pudo leer la foto: " + e.getMessage());
            }
        }

        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0; padding:0; background:#0a0a0f; font-family: 'Helvetica Neue', Arial, sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0a0a0f; padding: 40px 20px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#111118; border-radius:12px; overflow:hidden; border:1px solid #2a2a3a;">

                    <!-- Header -->
                    <tr>
                      <td style="background:#e63946; padding: 20px 32px; text-align:center;">
                        <p style="margin:0; color:#fff; font-size:11px; letter-spacing:3px; text-transform:uppercase; opacity:0.8;">Sistema de alerta ciudadana</p>
                        <h1 style="margin:6px 0 0; color:#fff; font-size:28px; letter-spacing:4px; font-weight:900;">TODOS BUSCANDO</h1>
                      </td>
                    </tr>

                    <!-- Alerta badge -->
                    <tr>
                      <td style="padding: 28px 32px 0; text-align:center;">
                        <span style="display:inline-block; background:#1a0608; color:#e63946; font-size:11px;
                                     letter-spacing:2px; text-transform:uppercase; padding:6px 16px;
                                     border-radius:20px; border:1px solid #e63946;">
                          ● ALERTA ACTIVA EN TU ZONA
                        </span>
                      </td>
                    </tr>

                    <!-- Saludo -->
                    <tr>
                      <td style="padding: 24px 32px 0;">
                        <p style="margin:0; color:#a0a0b8; font-size:15px; line-height:1.6;">
                          Hola <strong style="color:#ffffff;">%s</strong>,
                          se reportó una desaparición a menos de 2km de tu ubicación registrada.
                          Tu colaboración puede marcar la diferencia.
                        </p>
                      </td>
                    </tr>

                    <!-- Foto -->
                    %s

                    <!-- Datos -->
                    <tr>
                      <td style="padding: 24px 32px;">
                        <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0d0d16; border-radius:8px; border:1px solid #2a2a3a; overflow:hidden;">
                          <tr>
                            <td colspan="2" style="padding:14px 20px; border-bottom:1px solid #2a2a3a;">
                              <p style="margin:0; color:#606080; font-size:10px; letter-spacing:2px; text-transform:uppercase;">Persona desaparecida</p>
                              <p style="margin:4px 0 0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:1px;">%s</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:12px 20px; border-bottom:1px solid #2a2a3a; border-right:1px solid #2a2a3a; width:50%%;">
                              <p style="margin:0; color:#606080; font-size:10px; letter-spacing:2px; text-transform:uppercase;">Edad</p>
                              <p style="margin:4px 0 0; color:#d0d0e8; font-size:15px;">%d años</p>
                            </td>
                            <td style="padding:12px 20px; border-bottom:1px solid #2a2a3a;">
                              <p style="margin:0; color:#606080; font-size:10px; letter-spacing:2px; text-transform:uppercase;">Última ubicación</p>
                              <p style="margin:4px 0 0; color:#d0d0e8; font-size:14px;">%s</p>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding:12px 20px;">
                              <p style="margin:0; color:#606080; font-size:10px; letter-spacing:2px; text-transform:uppercase;">Descripción</p>
                              <p style="margin:4px 0 0; color:#d0d0e8; font-size:14px; line-height:1.6;">%s</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td style="padding: 0 32px 32px; text-align:center;">
                        <p style="color:#a0a0b8; font-size:14px; margin:0 0 20px; line-height:1.6;">
                          Si viste algo sospechoso, podés reportarlo de forma <strong style="color:#ffffff;">completamente anónima</strong>.
                        </p>
                        <a href="http://localhost:5173/reporte/%s"
                           style="display:inline-block; background:#e63946; color:#ffffff; text-decoration:none;
                                  font-size:14px; font-weight:700; letter-spacing:2px; text-transform:uppercase;
                                  padding:14px 36px; border-radius:6px;">
                          Enviar reporte →
                        </a>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#0d0d16; border-top:1px solid #2a2a3a; padding:20px 32px; text-align:center;">
                        <p style="margin:0; color:#404060; font-size:12px; line-height:1.6;">
                          Este mensaje fue enviado porque te registraste en TodosBuscando.<br/>
                          Toda la información reportada es anónima y confidencial.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
        """.formatted(
            vecino.getNombre(),
            fotoHtml,
            alerta.getNombre(),
            alerta.getEdad(),
            alerta.getUltimaUbicacionConocida(),
            alerta.getDescripcion(),
            alerta.getId()
        );
    }
}
