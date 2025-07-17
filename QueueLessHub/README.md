
# QueueLessHub
# Flujo de trabajo dual: MongoDB vs Google Sheets

Este proyecto ahora incluye dos flujos principales:

1. **Flujo automatizado con MongoDB**: El backend gestiona citas, usuarios, doctores y disponibilidad de forma automática, almacenando toda la información en MongoDB Atlas. El sistema permite la gestión completa de citas y recursos médicos, con lógica de negocio, validaciones y automatización.

2. **Flujo de recopilación de datos para coordinación manual (Google Sheets)**: El bot de WhatsApp recopila únicamente los datos básicos del usuario (nombre, aseguradora, número de asegurado, fecha preferida) y los guarda en una hoja de cálculo de Google Sheets. El personal del negocio accede a esta hoja para coordinar y confirmar las citas manualmente. Este flujo no automatiza la asignación ni la gestión de citas, solo facilita la recolección y organización de la información de los clientes.

Ambos flujos conviven en el mismo backend y pueden usarse según las necesidades del negocio: automatización total o coordinación manual.

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
Puedes depurar el backend desde VS Code usando la configuración "Debug API Server" en la pestaña Run & Debug (F5).

### Preparar el proyecto para debug
- Instala las dependencias con `npm install`.
- Asegúrate de tener el archivo `.env` configurado.
- Abre VS Code y ve a la pestaña "Run & Debug" (Ctrl+Shift+D).
- Selecciona la configuración "Debug API Server" y presiona F5.
- El servidor se iniciará en modo debug y podrás poner breakpoints en cualquier archivo de `src/`.

### Debug con nodemon
Si prefieres debug con nodemon, puedes instalarlo globalmente:
```powershell
npm install -g nodemon
nodemon --inspect src/server.js
```
Luego conecta el debugger de VS Code a la sesión de Node.js.
## Integración con WhatsApp Business API
Este proyecto incluye integración con la API de WhatsApp Business (Meta). Para pruebas y desarrollo:

### Usar modo developer en Meta
1. Ve a [Meta for Developers](https://developers.facebook.com/) y crea una app de tipo "Business".
2. Activa el producto "WhatsApp" y configura un número de prueba.
3. Obtén el token de acceso temporal y el ID de teléfono de prueba.
4. En el dashboard de WhatsApp, configura el endpoint webhook (ver sección ngrok).
5. Usa el token y el ID en tu archivo `.env`:
   ```env
   WHATSAPP_TOKEN=TU_TOKEN
   WHATSAPP_PHONE_ID=TU_ID_TELEFONO
   WHATSAPP_WEBHOOK_VERIFY=TU_TOKEN_VERIFICACION
   ```
6. Puedes enviar mensajes de prueba desde la consola de Meta o desde el backend usando los endpoints del proyecto.

### Consideraciones de la API
- El API de WhatsApp limita los mensajes interactivos (List, Buttons) a 10 filas y 72 caracteres por descripción.
- El backend valida estos límites automáticamente.
## Uso de ngrok para exponer el servidor local
Para recibir webhooks de WhatsApp en desarrollo, necesitas exponer tu servidor local a internet:

1. Instala ngrok desde [ngrok.com](https://ngrok.com/download).
2. Inicia el backend localmente (`npm run dev`).
3. En otra terminal, ejecuta:
   ```powershell
   ngrok http 3000
   ```
4. Copia la URL pública que te da ngrok (ejemplo: `https://xxxx.ngrok.io`).
5. Ve al dashboard de Meta y configura el webhook con la URL pública y el endpoint `/api/webhook`.
6. Verifica el webhook usando el token de verificación configurado en `.env`.

### Consejos
- Si cambias el puerto o reinicias ngrok, actualiza la URL en Meta.
- Puedes ver los logs de ngrok para depurar problemas de conexión.
## Características adicionales
- Lógica de conversación mock y simulación de webhook para WhatsApp.
- Manejo de citas y usuarios, incluyendo lógica de disponibilidad y asignación.
- Validación de límites de la API de WhatsApp (máximo 10 filas, 72 caracteres por descripción).
- Manejo de errores y logs detallados.
- Modularidad: separación clara entre modelos, servicios, controladores y rutas.
- Soporte para roles: admin, doctor, user.
- Los doctores solo pueden gestionar sus propios recursos.
- Los clientes son entidades de negocio y no requieren autenticación.

### Nuevo flujo de WhatsApp + Google Sheets
- Conversación paso a paso para recopilar datos del usuario.
- Validación de cada campo (nombre, aseguradora, número de póliza, fecha).
- Los datos se envían a una hoja de cálculo de Google Sheets.
- El personal del negocio revisa la hoja y coordina las citas manualmente.
- No se almacena la cita en MongoDB ni se automatiza la asignación.
## Recomendaciones
- Usa HTTPS en producción.
- Mantén tu archivo `.env` fuera del control de versiones.
- Revisa los límites de la API de WhatsApp antes de enviar mensajes interactivos.
- Para pruebas con WhatsApp, usa siempre números de prueba y tokens temporales.

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

#### Archivos relevantes para el flujo Google Sheets
- `src/services/chatflow.spreadsheet.service.js` — Lógica conversacional y envío de datos a Google Sheets
- `src/controller/bot.spreadsheet.controller.js` — Webhook para WhatsApp y manejo del flujo de Google Sheets
- `.env` — Configuración de credenciales y parámetros de la hoja de cálculo

## Notas
- Usa nodemon para desarrollo.
- Incluye middlewares de logs y manejo de errores.
- Recomendado usar HTTPS en producción.

---

# QueueLessHub (English)

Backend Node.js + Express + MongoDB Atlas

## Installation

1. Clone the repository and enter the project folder.
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Create a `.env` file with your MongoDB Atlas URI and JWT secret:
   ```env
   MONGODB_URI=YOUR_ATLAS_URI
   PORT=3000
   JWT_SECRET=YOUR_JWT_SECRET
   ```
4. Start the server in development mode:
   ```powershell
   npm run dev
   ```
   Or in production mode:
   ```powershell
   npm start
   ```

## Debug
You can debug the backend from VS Code using the "Debug API Server" configuration in the Run & Debug tab (F5).

### Prepare the project for debugging
- Install dependencies with `npm install`.
- Make sure you have the `.env` file configured.
- Open VS Code and go to the "Run & Debug" tab (Ctrl+Shift+D).
- Select the "Debug API Server" configuration and press F5.
- The server will start in debug mode and you can set breakpoints in any file in `src/`.

### Debug with nodemon
If you prefer to debug with nodemon, you can install it globally:
```powershell
npm install -g nodemon
nodemon --inspect src/server.js
```
Then connect the VS Code debugger to the Node.js session.

## WhatsApp Business API Integration
This project includes integration with the WhatsApp Business API (Meta). For testing and development:

### Using developer mode in Meta
1. Go to [Meta for Developers](https://developers.facebook.com/) and create a "Business" app.
2. Enable the "WhatsApp" product and set up a test number.
3. Get the temporary access token and test phone ID.
4. In the WhatsApp dashboard, configure the webhook endpoint (see ngrok section).
5. Use the token and ID in your `.env` file:
   ```env
   WHATSAPP_TOKEN=YOUR_TOKEN
   WHATSAPP_PHONE_ID=YOUR_PHONE_ID
   WHATSAPP_WEBHOOK_VERIFY=YOUR_VERIFY_TOKEN
   ```
6. You can send test messages from the Meta console or from the backend using the project's endpoints.

### API Considerations
- The WhatsApp API limits interactive messages (List, Buttons) to 10 rows and 72 characters per description.
- The backend automatically validates these limits.

## Using ngrok to expose the local server
To receive WhatsApp webhooks in development, you need to expose your local server to the internet:

1. Install ngrok from [ngrok.com](https://ngrok.com/download).
2. Start the backend locally (`npm run dev`).
3. In another terminal, run:
   ```powershell
   ngrok http 3000
   ```
4. Copy the public URL provided by ngrok (example: `https://xxxx.ngrok.io`).
5. Go to the Meta dashboard and configure the webhook with the public URL and the `/api/webhook` endpoint.
6. Verify the webhook using the verification token configured in `.env`.

### Tips
- If you change the port or restart ngrok, update the URL in Meta.
- You can view ngrok logs to debug connection issues.

## Additional Features
- Mock conversation logic and webhook simulation for WhatsApp.
- Appointment and user management, including availability and assignment logic.
- Validation of WhatsApp API limits (max 10 rows, 72 characters per description).
- Detailed error handling and logging.
- Modularity: clear separation between models, services, controllers, and routes.
- Role support: admin, doctor, user.
- Doctors can only manage their own resources.
- Clients are business entities and do not require authentication.

## Recommendations
- Use HTTPS in production.
- Keep your `.env` file out of version control.
- Check WhatsApp API limits before sending interactive messages.
- For WhatsApp testing, always use test numbers and temporary tokens.

## Security and Authentication
- JWT-based authentication for users (User), with roles: `admin`, `doctor`, `user`.
- Passwords hashed with bcrypt.
- Authentication and role-based authorization middleware.
- Doctors are linked to a user and can only modify their own information and associated resources.
- Clients (Client) are not authenticated, only business entities.

## Main Endpoints
- `POST /api/auth/register` — User registration (includes doctor registration if role is doctor)
- `POST /api/auth/login` — User login (returns JWT)
- `GET /api/doctors` — List doctors (authenticated)
- `PUT /api/doctors/:id` — Update doctor (only admin or the doctor themselves)
- `GET /api/appointments` — List appointments (authenticated)
- `POST /api/appointments` — Create appointment (authenticated)
- `GET /api/clients` — List clients (admin only)
- `GET /api/availability` — List doctor availability (authenticated)
- `POST /api/availability` — Create availability (only admin or the doctor themselves)

## Structure
- `src/models/` — Mongoose Schemas: User, Doctor, Client, Appointment, Availability, Conversation
- `src/controller/` — Business logic and endpoints
- `src/services/` — Data access and business logic
- `src/routes/` — API routes
- `src/middlewares/` — Authentication, authorization, logging, and error middlewares
- `src/app.js` — Application logic
- `src/server.js` — Startup and MongoDB connection

## Notes
- Use nodemon for development.
- Includes logging and error handling middlewares.
- HTTPS is recommended for production.
