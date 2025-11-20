const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../src/swagger');

const outPath = path.resolve(__dirname, '..', 'swagger.json');
fs.writeFileSync(outPath, JSON.stringify(swaggerSpec, null, 2));
console.log('swagger.json generated at', outPath);
