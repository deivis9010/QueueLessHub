import swaggerJSDoc from 'swagger-jsdoc';

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
      description: 'Local server',
    },
  ],
};

const swaggerSpec = swaggerJSDoc({
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/models/*.ts', './src/swagger-components.ts'],
});

export default swaggerSpec;
