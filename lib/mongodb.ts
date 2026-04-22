import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection promise exists, wait for it
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

export default connectDB;
