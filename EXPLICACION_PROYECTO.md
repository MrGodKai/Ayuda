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

- Carga variables de entorno con [dotenv](backend/server.js#L1)
- Crea el servidor con [express](backend/server.js#L3)
- Activa CORS para permitir el frontend local
- Limita el tamaño de los JSON recibidos
- Expone una ruta de salud en [/api/health](backend/server.js#L85)
- Registra las rutas principales de la API
- Verifica la conexión a MySQL antes de levantar el servidor

### Rutas principales

Las rutas se organizan por módulo:

- [/api/auth](backend/src/routes/auth.routes.js): registro, login y perfil
- [/api/artistas](backend/src/routes/artistas.routes.js): listado y perfil público de artistas
- [/api/busqueda](backend/src/routes/busqueda.routes.js): búsqueda de canciones, artistas y álbumes
- [/api/canciones](backend/src/routes/canciones.routes.js): canciones y reproducción
- [/api/historial](backend/src/routes/historial.routes.js): historial de reproducción
- [/api/favoritos](backend/src/routes/favoritos.routes.js): canciones favoritas
- [/api/usuarios](backend/src/routes/usuarios.routes.js): datos del usuario

### Seguridad y control

El backend usa middleware para:

- Verificar token en rutas protegidas
- Limitar intentos de login
- Controlar roles cuando hace falta

### Recuperación y cambio de contraseña

El módulo de autenticación ahora incluye:

- `POST /api/auth/forgot-password`: solicita recuperación por correo
- `POST /api/auth/reset-password`: restablece contraseña con token de un solo uso
- `POST /api/auth/change-password`: cambia contraseña desde sesión autenticada

Medidas de seguridad implementadas:

- Tokens aleatorios de 256 bits
- Almacenamiento solo del hash SHA-256 del token
- Expiración corta del token (configurable)
- Invalidación de tokens al usarse
- Rate limiting por IP en los endpoints sensibles
- Respuesta genérica en recuperación para evitar enumeración de correos
- Correo de notificación al cambiar/restablecer contraseña

## 4. Cómo funciona el frontend

El frontend principal está en [frontend/src/App.jsx](frontend/src/App.jsx).

Ese archivo concentra gran parte de la lógica de la interfaz:

- Manejo de estado con [useState](frontend/src/App.jsx#L80)
- Carga de datos con [useEffect](frontend/src/App.jsx#L363)
- Cálculos derivados con [useMemo](frontend/src/App.jsx#L145)
- Control de audio con [useRef](frontend/src/App.jsx#L143)

### Estados importantes

La aplicación guarda información como:

- Usuario autenticado
- Vista activa: inicio, artistas, biblioteca, perfil, etc.
- Canción actual y reproducción
- Playlists del usuario
- Favoritos
- Historial de reproducción
- Resultados de búsqueda
- Perfil editable

### Flujo de datos

La pantalla hace peticiones al backend usando [fetch](frontend/src/App.jsx#L372) y guarda el resultado en estado local. Después, React vuelve a renderizar la vista con esos datos.

## 5. Reproducción de música

El reproductor usa una referencia al elemento de audio para controlar:

- Play y pause
- Progreso de reproducción
- Duración total
- Volumen
- Cambio entre canciones

También se guarda la canción reproducida en el historial para que aparezca después en la sección de actividad reciente.

## 6. Artistas

La sección de artistas obtiene datos desde la API de [/api/artistas](backend/src/routes/artistas.routes.js).

Cada artista muestra:

- Nombre
- Imagen
- Géneros
- Perfil público
- Álbumes y canciones relacionadas

Cuando no hay una foto disponible, el frontend usa un avatar blanco por defecto para mantener la interfaz limpia.

## 7. Playlists

El usuario puede crear playlists desde la biblioteca.

El flujo actual es:

- Pulsar el botón +
- Escribir un nombre obligatorio
- Confirmar la creación
- Elegir la playlist activa
- Agregar canciones a esa playlist

La idea es que una playlist no exista sin nombre, así el contenido queda ordenado y fácil de reconocer.

## 8. Favoritos e historial

### Favoritos

Cuando el usuario marca una canción como favorita:

- Se guarda en la lista de favoritos
- Se evita duplicarla
- Se muestra en la interfaz con acceso rápido

### Historial

Cada reproducción se registra para mostrar:

- Título de la canción
- Artista
- Fecha y hora de reproducción

Esto permite ver la actividad reciente del usuario.

## 9. Perfil de usuario

La sección de perfil permite:

- Ver datos del usuario
- Editar nombre y correo
- Revisar estadísticas rápidas
- Ver escuchado recientemente

El perfil usa el endpoint protegido de autenticación, por eso solo funciona cuando hay sesión válida.

## 10. Base de datos

La carpeta [database/](database/) contiene el script SQL del proyecto.

Ahí se definen las tablas necesarias para:

- Usuarios
- Canciones
- Artistas
- Historial
- Favoritos
- Otros datos relacionados

Además, el backend crea automáticamente algunas tablas auxiliares al iniciar, como las de historial y favoritos, si no existen.

## 11. Resumen para exponer

Si necesitas explicarlo en una presentación corta, puedes decir esto:

> iStream es una app de música hecha con React, Node y MySQL. El frontend maneja la interfaz y la reproducción, mientras que el backend expone una API REST para login, artistas, búsqueda, historial y favoritos. La aplicación organiza la información por módulos y usa estado local de React para mostrar cambios en tiempo real.

## 12. Qué mostrar en demo

Un recorrido claro para presentar sería:

1. Iniciar sesión
2. Abrir la pantalla principal
3. Buscar una canción o artista
4. Reproducir una canción
5. Ver cómo se guarda en historial
6. Marcar una canción como favorita
7. Crear una playlist con nombre obligatorio
8. Ver el perfil y editar datos

## 13. Archivos clave

- [backend/server.js](backend/server.js): arranque del servidor y registro de rutas
- [backend/src/routes/*.js](backend/src/routes/): definición de endpoints
- [backend/src/controllers/*.js](backend/src/controllers/): lógica de negocio
- [frontend/src/App.jsx](frontend/src/App.jsx): interfaz principal y estados
- [frontend/src/App.css](frontend/src/App.css): estilos visuales
- [database/istream.sql](database/istream.sql): estructura de la base de datos

## 14. Variables de entorno importantes

Revisa el archivo [backend/.env.example](backend/.env.example) para configurar:

- Base de datos MySQL
- JWT (`JWT_SECRET` seguro)
- SMTP para envío de recuperación
- URL de recuperación (`PASSWORD_RESET_URL_BASE`)

---

Si quieres, este archivo se puede convertir también en una versión más corta para exponer en 2 minutos, o en una guía por diapositivas.
