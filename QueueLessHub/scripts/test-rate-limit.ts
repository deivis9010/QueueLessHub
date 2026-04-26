/**
 * Script de prueba para verificar el funcionamiento del rate limiting
 * Ejecutar con: node dist/scripts/test-rate-limit.js
 *
 * Asegúrate de que el servidor esté corriendo en http://localhost:3000
 */

import http from 'http';

const BASE_URL = 'localhost';
const PORT = 3000;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function makeRequest(requestPath: string, method = 'GET', data: Record<string, unknown> | null = null): Promise<{ status?: number; headers: http.IncomingHttpHeaders; body: string; }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: requestPath,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAuthRateLimit(): Promise<void> {
  console.log(`\n${colors.blue}=== Prueba: Auth Rate Limiter ===${colors.reset}`);
  console.log('Límite esperado: 5 intentos en 15 minutos\n');

  for (let i = 1; i <= 7; i++) {
    try {
      const response = await makeRequest('/api/auth/login', 'POST', {
        email: 'test@test.com',
        password: 'wrongpassword'
      });

      if (response.status === 429) {
        console.log(`${colors.red}✗ Intento ${i}: Rate limit alcanzado (429)${colors.reset}`);
        console.log(`  Mensaje: ${JSON.parse(response.body).message}`);
        break;
      }

      console.log(`${colors.green}✓ Intento ${i}: ${response.status}${colors.reset}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`${colors.red}✗ Intento ${i}: Error - ${message}${colors.reset}`);
    }
  }
}

async function testGeneralRateLimit(): Promise<void> {
  console.log(`\n${colors.blue}=== Prueba: General Rate Limiter ===${colors.reset}`);
  console.log('Límite esperado: 100 solicitudes en 15 minutos\n');
  console.log('Haciendo 10 solicitudes rápidas...\n');

  let success = 0;
  let rateLimited = 0;

  for (let i = 1; i <= 10; i++) {
    try {
      const response = await makeRequest('/api');

      if (response.status === 429) {
        rateLimited++;
        console.log(`${colors.red}✗ Solicitud ${i}: Rate limit alcanzado (429)${colors.reset}`);
      } else if (response.status === 200) {
        success++;
        console.log(`${colors.green}✓ Solicitud ${i}: Exitosa (${response.status})${colors.reset}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`${colors.red}✗ Solicitud ${i}: Error - ${message}${colors.reset}`);
    }
  }

  console.log(`\n${colors.yellow}Resumen: ${success} exitosas, ${rateLimited} limitadas${colors.reset}`);
}

async function showRateLimitHeaders(): Promise<void> {
  console.log(`\n${colors.blue}=== Headers de Rate Limit ===${colors.reset}\n`);

  try {
    const response = await makeRequest('/api');

    console.log(`RateLimit-Limit: ${response.headers['ratelimit-limit'] || 'N/A'}`);
    console.log(`RateLimit-Remaining: ${response.headers['ratelimit-remaining'] || 'N/A'}`);
    console.log(`RateLimit-Reset: ${response.headers['ratelimit-reset'] || 'N/A'}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`${colors.red}Error obteniendo headers: ${message}${colors.reset}`);
  }
}

async function main(): Promise<void> {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Test de Rate Limiting - QueueLessHub  ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nAsegúrate de que el servidor esté corriendo en http://${BASE_URL}:${PORT}\n`);

  try {
    await makeRequest('/api');
    console.log(`${colors.green}✓ Servidor accesible${colors.reset}`);

    await showRateLimitHeaders();
    await testGeneralRateLimit();
    await testAuthRateLimit();

    console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Pruebas completadas${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  } catch (error) {
    console.log(`\n${colors.red}✗ Error: No se pudo conectar al servidor${colors.reset}`);
    console.log(`${colors.red}  Asegúrate de que el servidor esté corriendo en http://${BASE_URL}:${PORT}${colors.reset}\n`);
  }
}

void main();