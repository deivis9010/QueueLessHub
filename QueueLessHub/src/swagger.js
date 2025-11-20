const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QueueLessHub API',
    version: '1.0.0',
    description: 'API documentation for QueueLessHub',
  },
  servers: [
    {
      url: process.env.SWAGGER_BASE_URL || 'http://localhost:3000',
      description: 'Local server'
    }
  ]
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions (JSDoc comments)
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js', './src/swagger-components.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
