# QueueLessHub

Backend Node.js + Express + MongoDB Atlas

## Instalación

1. Clona el repositorio y entra a la carpeta del proyecto.
2. Instala dependencias:
   ```powershell
   npm install
   ```
3. Crea un archivo `.env` con tu URI de MongoDB Atlas y el secreto JWT:
   ```env
   MONGODB_URI=TU_URI_DE_ATLAS
   PORT=3000
   JWT_SECRET=TU_SECRETO_JWT
   ```
4. Inicia el servidor en modo desarrollo:
   ```powershell
   npm run dev
   ```
   O en modo producción:
   ```powershell
   npm start
   ```

## Debug
- Puedes depurar el backend desde VS Code usando la configuración "Debug API Server" en la pestaña Run & Debug (F5).

## Seguridad y autenticación
- Autenticación basada en JWT para usuarios (User), con roles: `admin`, `doctor`, `user`.
- Contraseñas hasheadas con bcrypt.
- Middleware de autenticación y autorización por rol.
- Los doctores están vinculados a un usuario y solo pueden modificar su información y recursos asociados.
- Los clientes (Client) no están autenticados, solo son entidad de negocio.

## Endpoints principales
- `POST /api/auth/register` — Registro de usuario (incluye registro de doctor si el rol es doctor)
- `POST /api/auth/login` — Login de usuario (devuelve JWT)
- `GET /api/doctors` — Listar doctores (autenticado)
- `PUT /api/doctors/:id` — Actualizar doctor (solo admin o el propio doctor)
- `GET /api/appointments` — Listar citas (autenticado)
- `POST /api/appointments` — Crear cita (autenticado)
- `GET /api/clients` — Listar clientes (solo admin)
- `GET /api/availability` — Listar disponibilidad de doctores (autenticado)
- `POST /api/availability` — Crear disponibilidad (solo admin o el propio doctor)

## Estructura
- `src/models/` — Esquemas Mongoose: User, Doctor, Client, Appointment, Availability, Conversation
- `src/controller/` — Lógica de negocio y endpoints
- `src/services/` — Lógica de acceso a datos y negocio
- `src/routes/` — Rutas de la API
- `src/middlewares/` — Middlewares de autenticación, autorización, logs y errores
- `src/app.js` — Lógica de la aplicación
- `src/server.js` — Arranque y conexión a MongoDB

## Notas
- Usa nodemon para desarrollo.
- Incluye middlewares de logs y manejo de errores.
- Recomendado usar HTTPS en producción.
