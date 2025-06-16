# QueueLessHub

Backend Node.js + Express + MongoDB Atlas

## Instalación

1. Clona el repositorio y entra a la carpeta del proyecto.
2. Instala dependencias:
   ```powershell
   npm install
   ```
3. Crea un archivo `.env` con tu URI de MongoDB Atlas:
   ```env
   MONGODB_URI=TU_URI_DE_ATLAS
   PORT=3000
   ```
4. Inicia el servidor en modo desarrollo:
   ```powershell
   npm run dev
   ```
   O en modo producción:
   ```powershell
   npm start
   ```

## Endpoints
- `GET /ping` — Prueba de vida
- `POST /webhook` — Simula mensajes tipo WhatsApp `{ from, text }`
- `GET /appointments` — Lista de citas
- `GET /users` — Lista de usuarios

## Estructura
- `src/models/` — Esquemas Mongoose: User, Appointment, Conversation
- `src/controller/` — Lógica del bot
- `src/routes/` — Rutas de la API
- `src/app.js` — Lógica de la aplicación
- `src/server.js` — Arranque y conexión a MongoDB

## Notas
- Usa nodemon para desarrollo.
- Incluye middlewares de logs y manejo de errores.
