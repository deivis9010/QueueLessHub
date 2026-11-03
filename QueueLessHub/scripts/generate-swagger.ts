import fs from 'fs';
import path from 'path';

const swaggerSpec = require(path.join(__dirname, '..', 'swagger'));
const outPath = path.resolve(__dirname, '..', 'swagger.json');

fs.writeFileSync(outPath, JSON.stringify(swaggerSpec.default ?? swaggerSpec, null, 2));
console.log('swagger.json generated at', outPath);