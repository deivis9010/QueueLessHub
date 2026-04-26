import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

import app from './app';

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB Atlas');

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`Servidor escuchando en puerto ${port}`);
    });
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error);
    process.exitCode = 1;
  }
}

void startServer();
