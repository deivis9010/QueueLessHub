const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});



app.use('/api', apiRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
