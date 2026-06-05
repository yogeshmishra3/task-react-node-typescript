import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import app from '../server/src/app';

const MONGODB_URI = process.env.MONGODB_URI || '';

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = global as unknown as { _mongoose?: Cached };
const cached: Cached = g._mongoose || (g._mongoose = { conn: null, promise: null });

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  return (app as any)(req, res);
}
