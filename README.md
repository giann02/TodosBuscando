# TodosBuscando

Plataforma comunitaria de alertas para la búsqueda de personas desaparecidas. Permite publicar alertas, notificar vecinos cercanos por email, recibir reportes de avistamientos y visualizar la trayectoria probable de la persona en un mapa.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite, React-Leaflet, Mapbox |
| Backend | Spring Boot 3.2 / Java 22 |
| Base de datos principal | MongoDB 7 (local, Docker) |
| Caché | Redis (local, Docker) |
| Grafo de trayectoria | Neo4j (local, Docker) |

---

## Requisitos previos

- Java 22
- Node.js 18+
- Docker (para levantar MongoDB, Redis y Neo4j)

---

## Levantar el proyecto

**1. Infraestructura (MongoDB + Redis + Neo4j)**

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

Esto levanta:
- MongoDB en `localhost:27017` — base de datos principal
- Redis en `localhost:6379` — caché de alertas
- Neo4j en `localhost:7687` (Bolt) y `localhost:7474` (Browser)
  - Usuario: `neo4j` / Contraseña: `todos1234`

**2. Backend** (puerto 8081)
```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
```

**3. Frontend** (puerto 5173)
```bash
cd frontend
npm install
npm run dev
```

**4. Neo4j Browser**

Para visualizar el grafo de trayectorias abrí http://localhost:7474 en el navegador e iniciá sesión con `neo4j` / `todos1234`.

Para apagar todos los servicios:

```bash
docker-compose down
```

---

## Funcionalidades

### Alertas

- **Publicación manual**: el admin carga nombre, edad, descripción, foto y ubicación en el mapa. La dirección se geocodifica automáticamente y también se puede marcar haciendo click en el mapa.
- **Detección de duplicados**: al escribir el nombre, el sistema busca alertas activas con nombre similar (índice de texto de MongoDB) y avisa antes de publicar.
- **Resolución**: el admin puede marcar una alerta como resuelta desde el panel.

### Sincronización con API externa

El sistema se conecta a la API pública de SIFEBU (argly.com.ar) y sincroniza alertas de menores desaparecidos automáticamente cada 10 minutos. El proceso:

1. Descarga las personas desaparecidas del año en curso.
2. Filtra solo menores de 18 años.
3. Evita duplicados usando el `slug` de la API como identificador único (índice sparse en MongoDB).
4. Geocodifica el lugar de desaparición con Nominatim (OpenStreetMap) para obtener coordenadas.
5. Notifica a los vecinos registrados en la zona.

Al arrancar, el sistema también retroalimenta alertas importadas que quedaron sin coordenadas por fallas previas de geocodificación.

### Notificación a vecinos

Al publicar una alerta, el sistema busca en MongoDB todos los usuarios registrados dentro de un radio de 2 km usando índices geoespaciales `2dsphere`. Cada vecino en la zona recibe un email automático con los datos de la alerta.

Los usuarios pueden actualizar su ubicación en cualquier momento (`PUT /api/usuarios/{id}/ubicacion`).

### Reportes de avistamientos

Cualquier persona puede reportar un avistamiento desde la página pública de la alerta. El reporte incluye:

- Descripción del avistamiento
- Identificación opcional (o anónimo)
- Ubicación: por GPS, ingresando una dirección con autocompletado, o sin indicar

### Caché de alertas activas (Redis)

Las consultas al listado de alertas activas se sirven desde Redis con un TTL de 5 minutos (300 segundos). El flujo:

- **Cache hit**: Redis responde en O(1), MongoDB no se consulta.
- **Cache miss**: se consulta MongoDB, el resultado se guarda en Redis con TTL de 300s.
- **Invalidación**: al crear o resolver una alerta, el caché se elimina inmediatamente. La próxima consulta trae datos frescos.

Si Redis no está disponible, el sistema cae a MongoDB sin interrumpir el flujo.

### Trayectoria de avistamientos (Neo4j)

Cada reporte con ubicación se guarda en dos bases de datos simultáneamente:

- **MongoDB**: documento completo con todos los campos.
- **Neo4j**: nodo `(:Reporte)` con coordenadas, timestamp y referencia al ID de MongoDB.

Los nodos de una misma alerta se conectan en orden cronológico con la relación `[:SIGUIENTE]`, formando una cadena:

```
(:Reporte) -[:SIGUIENTE]-> (:Reporte) -[:SIGUIENTE]-> (:Reporte)
```

Si Neo4j falla, el reporte igual se guarda en MongoDB sin interrumpir el flujo.

Para consultar la trayectoria en Neo4j Browser:
```cypher
MATCH (r:Reporte)-[:SIGUIENTE]->(s:Reporte) RETURN r, s
```

### Panel de administración

Accesible en `/admin`. Credenciales:
- Usuario: `usuario`
- Contraseña: `contraseña`

Incluye:

- **Lista de alertas** con estado, vecinos notificados y cantidad de reportes.
- **Mapa de reportes por alerta**: al seleccionar una alerta se muestra un mapa con el lugar de desaparición (marcador rojo) y la trayectoria de avistamientos (línea roja punteada con marcadores numerados). El mapa ajusta el zoom automáticamente para mostrar todos los puntos.
- **Lista de avistamientos** con descripción, autor y timestamp.
- **Estadísticas del sistema**: calculadas con el Aggregation Pipeline de MongoDB. Incluye totales de alertas, vecinos notificados, reportes, tasa de respuesta, proporción anónimos/identificados, origen manual vs API, y la alerta con más reportes.

### Mapa de trayectoria público

En la página de cada alerta (`/reporte/:id`), los vecinos pueden ver la trayectoria de avistamientos antes de enviar su reporte. Se muestra un mapa con la cadena de avistamientos en orden cronológico y una lista de cada punto con descripción y fecha.

---

## API — endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/alertas` | Listar alertas activas (con caché Redis) |
| `GET` | `/api/alertas/:id` | Detalle de una alerta |
| `GET` | `/api/alertas/buscar?nombre=X` | Buscar alertas similares por nombre |
| `POST` | `/api/alertas` | Crear alerta (admin) |
| `PUT` | `/api/alertas/:id/resolver` | Resolver alerta (admin) |
| `GET` | `/api/reportes/:alertaId` | Listar reportes de una alerta |
| `GET` | `/api/reportes/:alertaId/trayectoria` | Trayectoria de avistamientos desde Neo4j |
| `GET` | `/api/reportes/conteo` | Cantidad de reportes por alerta |
| `POST` | `/api/reportes` | Enviar reporte de avistamiento |
| `POST` | `/api/usuarios/registrar` | Registrar vecino con ubicación |
| `PUT` | `/api/usuarios/:id/ubicacion` | Actualizar ubicación de un vecino |
| `POST` | `/api/upload` | Subir foto |
| `GET` | `/api/admin/estadisticas` | Estadísticas del sistema (admin) |

---

## Probar el grafo de trayectoria con curl

Flujo de prueba: crear una alerta, mandar tres reportes con ubicación y ver cómo queda el grafo en Neo4j.

### Crear la alerta

```bash
curl -s -X POST http://localhost:8081/api/alertas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "edad": 15,
    "descripcion": "Cabello castaño, ojos verdes, remera azul",
    "ultimaUbicacionConocida": "Av. Corrientes 1234, Buenos Aires",
    "fotoUrl": null,
    "lat": -34.6037,
    "lng": -58.3816
  }'
```

Copiar el `id` de la respuesta y reemplazarlo en los reportes de abajo.

### Mandar los reportes (en orden)

```bash
curl -s -X POST http://localhost:8081/api/reportes \
  -H "Content-Type: application/json" \
  -d '{
    "alertaId": "<ALERTA_ID>",
    "descripcion": "Lo vi caminando por la plaza",
    "reportadoPor": "María García",
    "lat": -34.6050,
    "lng": -58.3830
  }'

curl -s -X POST http://localhost:8081/api/reportes \
  -H "Content-Type: application/json" \
  -d '{
    "alertaId": "<ALERTA_ID>",
    "descripcion": "Pasó corriendo por la esquina con una mochila negra",
    "reportadoPor": "Carlos López",
    "lat": -34.6065,
    "lng": -58.3855
  }'

curl -s -X POST http://localhost:8081/api/reportes \
  -H "Content-Type: application/json" \
  -d '{
    "alertaId": "<ALERTA_ID>",
    "descripcion": "Estaba sentado en un banco frente al kiosco",
    "reportadoPor": null,
    "lat": -34.6080,
    "lng": -58.3870
  }'
```

### Ver la trayectoria por API

```bash
curl -s http://localhost:8081/api/reportes/<ALERTA_ID>/trayectoria
```

### Verificar en Neo4j Browser

http://localhost:7474 → usuario `neo4j`, contraseña `todos1234`

```cypher
MATCH (r:Reporte {alertaId: "<ALERTA_ID>"})-[rel:SIGUIENTE]->(s:Reporte)
RETURN r, rel, s
```

Con los tres reportes debería aparecer la cadena:

```
(:Reporte) -[:SIGUIENTE]-> (:Reporte) -[:SIGUIENTE]-> (:Reporte)
```

---

## Estructura del proyecto

```
todos-buscando/
├── backend/
│   └── src/main/java/com/todosbuscando/
│       ├── controller/     # Endpoints REST
│       ├── service/        # Lógica de negocio (alertas, reportes, polling, email)
│       ├── model/          # Entidades MongoDB y Neo4j
│       ├── repository/     # Repositories MongoDB y Neo4j
│       └── config/         # Redis, CORS, MongoDB
└── frontend/
    └── src/
        ├── pages/          # Home, Reporte, AdminDashboard, AdminLogin, Register
        ├── components/     # Navbar, Toast, Skeleton, DireccionAutocomplete
        ├── api/            # Cliente Axios centralizado
        └── utils/          # Formateo de direcciones y tiempo
```
