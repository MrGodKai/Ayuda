# Explicación del proyecto iStream

## 1. Qué es este proyecto

iStream es una aplicación web tipo reproductor de música construida con:

- Frontend en React + Vite
- Backend en Node.js + Express
- Base de datos MySQL

La idea principal es simular una plataforma musical donde el usuario puede iniciar sesión, ver artistas, reproducir canciones, guardar favoritas, revisar historial y administrar playlists.

## 2. Estructura general

El proyecto está dividido en tres partes:

- [frontend/](frontend/): interfaz visual y lógica de pantalla
- [backend/](backend/): API REST y reglas de negocio
- [database/](database/): script SQL con la estructura de tablas

## 3. Cómo funciona el backend

El backend arranca desde [backend/server.js](backend/server.js). Ese archivo:

- Carga variables de entorno con dotenv
- Crea el servidor con express
- Activa CORS para frontend local (localhost 5173 y 5174)
- Limita el tamaño de los JSON recibidos
- Expone una ruta de salud en /api/health
- Registra las rutas principales de la API
- Verifica la conexión a MySQL antes de levantar el servidor
- Crea tablas auxiliares si no existen
- Ejecuta una migración idempotente para asegurar la columna perfil_privado en usuarios

### Rutas principales

Las rutas se organizan por módulo:

- [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js): registro, login, perfil, privacidad y contraseñas
- [backend/src/routes/artistas.routes.js](backend/src/routes/artistas.routes.js): listado y perfil público de artistas
- [backend/src/routes/busqueda.routes.js](backend/src/routes/busqueda.routes.js): búsqueda de canciones, artistas y álbumes
- [backend/src/routes/canciones.routes.js](backend/src/routes/canciones.routes.js): canciones populares
- [backend/src/routes/historial.routes.js](backend/src/routes/historial.routes.js): historial de reproducción
- [backend/src/routes/favoritos.routes.js](backend/src/routes/favoritos.routes.js): canciones favoritas
- [backend/src/routes/amistades.routes.js](backend/src/routes/amistades.routes.js): red de seguidores y perfil de otros usuarios
- [backend/src/routes/usuarios.routes.js](backend/src/routes/usuarios.routes.js): datos de usuario

### Endpoints importantes de autenticación

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/perfil
- PUT /api/auth/perfil
- PATCH /api/auth/privacidad
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/change-password

## 4. Seguridad y control

El backend usa middleware para:

- Verificar token JWT en rutas protegidas
- Limitar intentos de login
- Limitar solicitudes sensibles de contraseñas
- Validar sesión contra MySQL (usuario activo y existente)

Además, el JWT valida firma, expiración, issuer, audience y tipo de token.

## 5. Recuperación y cambio de contraseña

El módulo de autenticación incluye:

- Recuperación por correo con token de un solo uso
- Token almacenado en forma de hash
- Expiración corta configurable
- Invalidación del token una vez utilizado

Esto mejora la seguridad del flujo de contraseñas sin exponer información sensible.

## 6. Cómo funciona el frontend

El frontend principal está en [frontend/src/App.jsx](frontend/src/App.jsx).

Ese archivo concentra gran parte de la lógica de la interfaz:

- Manejo de estado con useState
- Carga de datos con useEffect
- Cálculos derivados con useMemo
- Control de audio con useRef

### Estados importantes

La aplicación guarda información como:

- Usuario autenticado
- Vista activa: inicio, artistas, biblioteca, perfil, player
- Canción actual y reproducción
- Playlists del usuario
- Favoritos
- Historial de reproducción
- Resultados de búsqueda
- Datos sociales (seguidores/siguiendo)
- Perfil editable y privacidad

## 7. Inicio y datos reales

La pantalla de inicio ya no usa placeholders fijos en esas secciones clave.

Actualmente:

- Populares del momento usa /api/canciones/populares
- Continuar escuchando usa historial y recientes del usuario
- Recomendado para vos usa artistas recientes + catálogo
- Artistas populares se deriva de canciones populares + catálogo

## 8. Reproducción y portada de canciones

El reproductor controla play/pause, progreso, duración, volumen, mini-player y cambio de canción.

También se registra la reproducción en historial para mostrar actividad reciente.

Para carátulas, el frontend resuelve la portada así:

1. Portada directa de la canción
2. Fallback por artista + álbum
3. Fallback por álbum
4. Fallback por artista
5. Placeholder visual final

Esto reduce los casos donde no aparece imagen.

## 9. Artistas

La sección de artistas obtiene datos desde /api/artistas.

Cada artista muestra:

- Nombre
- Imagen
- Géneros
- Perfil público
- Álbumes y canciones relacionadas

Cuando no hay foto real, se usa una imagen fallback para mantener consistencia visual.

## 10. Playlists

El usuario puede crear playlists desde biblioteca.

Flujo:

- Crear playlist con nombre obligatorio
- Seleccionar playlist activa
- Agregar canciones desde búsqueda o player
- Reproducir canciones de la playlist

Nota: en el estado actual, las playlists se manejan en frontend (estado local de la app).

## 11. Favoritos, historial y perfil

### Favoritos

- Se agregan y eliminan por API
- Se evita duplicar por clave lógica
- Se muestran con acceso rápido a reproducción

### Historial

- Cada reproducción se registra
- Se puede listar, eliminar un registro y limpiar todo

### Perfil

- Ver y editar datos
- Ver estadísticas rápidas
- Cambiar privacidad del perfil
- Mostrar actividad reciente

## 12. Módulo social (seguidores)

Ahora la app usa un modelo de seguidores:

- Seguir/dejar de seguir usuarios
- Ver seguidores y seguidos
- Buscar usuarios por nombre/correo
- Ver perfil de otro usuario desde la red

Si un perfil es privado y no hay relación mutua, su actividad se oculta.

## 13. Base de datos

La carpeta [database/](database/) contiene el script SQL base del proyecto.

Tablas principales:

- usuarios
- artistas
- canciones
- historial_reproducciones
- canciones_favoritas
- seguidores_usuarios
- password_resets
- relaciones_amistad

Además, el backend crea tablas auxiliares al iniciar si no existen y aplica migraciones puntuales como perfil_privado.

## 14. Variables de entorno importantes

Backend:

- Archivo usado: [backend/.env](backend/.env)
- JWT_SECRET (obligatoria y segura)
- JWT_EXPIRES_IN
- FRONTEND_URL
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
- SMTP_SECURE
- PASSWORD_RESET_URL_BASE
- PASSWORD_RESET_TOKEN_MINUTES
- PASSWORD_RESET_COOLDOWN_SECONDS

Frontend:

- API por defecto: /api
- Proxy en [frontend/vite.config.js](frontend/vite.config.js)
- VITE_API_PROXY_TARGET (por defecto http://localhost:3001)

## 15. Resumen para exponer

Si necesitas explicarlo en una presentación corta, puedes decir esto:

> iStream es una app de música hecha con React, Node y MySQL. El frontend maneja la interfaz y reproducción, mientras que el backend expone una API segura para autenticación, perfil, artistas, búsqueda, canciones populares, historial, favoritos y seguidores. Además, la app usa fallbacks de portada para mejorar la experiencia visual cuando faltan imágenes.

## 16. Qué mostrar en demo

Un recorrido claro para presentar sería:

1. Iniciar sesión
2. Abrir Inicio y mostrar secciones con datos reales
3. Buscar una canción o artista
4. Reproducir una canción y mostrar mini-player
5. Ver cómo se guarda en historial
6. Marcar una canción como favorita
7. Crear playlist y agregar canciones
8. Ir a perfil y cambiar privacidad
9. Mostrar módulo de seguidores y perfil de otro usuario

## 17. Archivos clave

- [backend/server.js](backend/server.js): arranque del servidor y registro de rutas
- [backend/src/routes/](backend/src/routes/): definición de endpoints
- [backend/src/controllers/](backend/src/controllers/): lógica de negocio
- [frontend/src/App.jsx](frontend/src/App.jsx): interfaz principal y estados
- [frontend/src/App.css](frontend/src/App.css): estilos visuales
- [database/istream.sql](database/istream.sql): estructura base de la base de datos

---

Si quieres, este archivo también se puede convertir en una versión ultra corta para exponer en 2 minutos o en una guía por diapositivas.
