import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Cache de conexão para Serverless (Vercel)
let cachedConnection = null;

export async function connectDatabase() {
  // Reutilizar conexão existente em ambiente serverless
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('♻️  Reusing existing MongoDB connection');
    return cachedConnection;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/artia';
    
    // Configurações otimizadas para Serverless
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1
    };

    await mongoose.connect(uri, options);

    cachedConnection = mongoose.connection;
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      cachedConnection = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      cachedConnection = null;
    });

    return cachedConnection;

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    cachedConnection = null;
    
    // Em ambiente serverless, não fazer exit
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}
