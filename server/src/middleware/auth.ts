import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

export interface AuthRequest extends Request {
  studentId?: string;
}

export const generateToken = (studentId: string): string => {
  return jwt.sign({ studentId }, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string): { studentId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };
    return decoded;
  } catch {
    return null;
  }
};

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token is required' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Confirm the account still exists. Deleting an account invalidates its
  // session immediately — the token outlives the record otherwise.
  const accountExists = await Student.exists({ _id: decoded.studentId });
  if (!accountExists) {
    res.status(401).json({ error: 'Session invalidated. Account no longer exists.' });
    return;
  }

  req.studentId = decoded.studentId;
  next();
};
