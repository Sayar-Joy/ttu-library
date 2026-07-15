import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'TTU_Library_demo';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    // Already connected — return the existing connection
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
    });

    isConnected = true;
    console.log(`✅ Mongoose connected to MongoDB → ${DB_NAME}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

export function getDB() {
  if (!isConnected) {
    throw new Error('Mongoose not connected. Call connectDB() first.');
  }
  return mongoose.connection.db; // returns the underlying MongoClient db handle
}

export async function closeDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 Mongoose disconnected');
  }
}