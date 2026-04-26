# Instrucciones para desplegar en Vercel

## Pasos para el despliegue

1. **Instala Vercel CLI (opcional)**:
   ```bash
   npm i -g vercel
   ```

2. **Conecta tu repositorio**:
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu cuenta de GitHub
   - Importa tu repositorio `QueueLessHub`

3. **Configura las variables de entorno en Vercel**:
   - En el dashboard de Vercel, ve a tu proyecto > Settings > Environment Variables
   - Agrega estas variables:
     ```
     MONGODB_URI = tu_uri_de_mongodb
     JWT_SECRET = tu_secreto_jwt
     WHATSAPP_TOKEN = tu_token_de_whatsapp
     PHONE_NUMBER_ID = tu_id_de_telefono
     SHEET_NAME = QueueLessHub
     SPREADSHEET_ID = tu_id_de_spreadsheet
     ```

4. **Sube las credenciales de Google**:
   - Ve a Settings > Environment Variables
   - Crea una variable llamada `GOOGLE_CREDENTIALS_JSON`
   - Pega todo el contenido de tu archivo `google-credentials.json` como valor

5. **El código ya está preparado**:
   El archivo `chatflow.spreadsheet.service.ts` ya lee las credenciales desde la variable de entorno `GOOGLE_CREDENTIALS_JSON` en producción, y desde el archivo local en desarrollo.

## Consideraciones importantes

- Vercel es serverless, por lo que el estado en memoria (`userStates`) se perderá entre requests
- Considera usar una base de datos (Redis/MongoDB) para mantener el estado de conversaciones
- Las funciones de Vercel tienen un límite de tiempo de ejecución
- El archivo `vercel.json` ya está configurado para tu proyecto

## URLs después del despliegue

Tu webhook de WhatsApp debería apuntar a:
```
https://tu-dominio.vercel.app/api/bot/spreadsheet/webhook
```
