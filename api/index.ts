import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';

// ── Config ───────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
const BACKEND_KEY = process.env.BACKEND_ENCRYPTION_KEY || 'default-backend-key-32characters!!';
const FRONTEND_KEY = process.env.FRONTEND_ENCRYPTION_KEY || 'default-frontend-key-32characters!';

// ── Mongo connection cache (serverless) ──────────────────────
type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalAny = global as unknown as { _mongoose?: Cached };
const cached: Cached = globalAny._mongoose || (globalAny._mongoose = { conn: null, promise: null });

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');
    mongoose.set('bufferCommands', false);
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ── Crypto helpers ───────────────────────────────────────────
const encryptLevel2 = (s: string) => CryptoJS.AES.encrypt(s, BACKEND_KEY).toString();
const decryptLevel2 = (s: string) => CryptoJS.AES.decrypt(s, BACKEND_KEY).toString(CryptoJS.enc.Utf8);
const decryptLevel1 = (s: string) => CryptoJS.AES.decrypt(s, FRONTEND_KEY).toString(CryptoJS.enc.Utf8);
const decryptFull = (s: string) => decryptLevel1(decryptLevel2(s));

// ── Model ────────────────────────────────────────────────────
interface IStudent extends Document {
  fullName: string; email: string; phoneNumber: string; dateOfBirth: string;
  gender: string; address: string; courseEnrolled: string; password: string;
  createdAt: Date; updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}
const StudentSchema = new Schema<IStudent>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, required: true },
    address: { type: String, required: true },
    courseEnrolled: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);
const Student: mongoose.Model<IStudent> =
  (mongoose.models.Student as mongoose.Model<IStudent>) ||
  mongoose.model<IStudent>('Student', StudentSchema);

// ── Auth ─────────────────────────────────────────────────────
interface AuthRequest extends Request { studentId?: string }
const generateToken = (id: string) => jwt.sign({ studentId: id }, JWT_SECRET, { expiresIn: '24h' });
const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token is required' }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { studentId: string };
    const exists = await Student.exists({ _id: decoded.studentId });
    if (!exists) { res.status(401).json({ error: 'Session invalidated. Account no longer exists.' }); return; }
    req.studentId = decoded.studentId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Validation ───────────────────────────────────────────────
const isStr = (v: any): v is string => typeof v === 'string' && v.trim().length > 0;
const isObjId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const validateRegister = (b: any): string | null => {
  for (const f of ['fullName','email','phoneNumber','dateOfBirth','gender','address','courseEnrolled','password']) {
    if (!isStr(b[f])) return `${f} is required and must be a non-empty string`;
  }
  return null;
};
const validateUpdate = (b: any): string | null => {
  const fields = ['fullName','email','phoneNumber','dateOfBirth','gender','address','courseEnrolled'];
  return fields.some((f) => isStr(b[f])) ? null : 'At least one field must be provided for update';
};
const validateLogin = (b: any): string | null => {
  if (!isStr(b.email)) return 'Email is required';
  if (!isStr(b.password)) return 'Password is required';
  return null;
};

const encryptStudent = (d: any) => ({
  fullName: encryptLevel2(d.fullName), email: encryptLevel2(d.email),
  phoneNumber: encryptLevel2(d.phoneNumber), dateOfBirth: encryptLevel2(d.dateOfBirth),
  gender: encryptLevel2(d.gender), address: encryptLevel2(d.address),
  courseEnrolled: encryptLevel2(d.courseEnrolled), password: d.password,
});
const decryptStudent = (s: IStudent) => ({
  _id: s._id,
  fullName: decryptLevel2(s.fullName), email: decryptLevel2(s.email),
  phoneNumber: decryptLevel2(s.phoneNumber), dateOfBirth: decryptLevel2(s.dateOfBirth),
  gender: decryptLevel2(s.gender), address: decryptLevel2(s.address),
  courseEnrolled: decryptLevel2(s.courseEnrolled),
  createdAt: s.createdAt, updatedAt: s.updatedAt,
});

// ── App ──────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Ensure DB is connected for every request
app.use(async (_req, _res, next) => {
  try { await connectDB(); next(); }
  catch (e) { next(e); }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const err = validateRegister(req.body);
    if (err) { res.status(400).json({ error: err }); return; }
    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled, password } = req.body;

    let plainEmail: string;
    try { plainEmail = decryptLevel1(email); }
    catch { res.status(400).json({ error: 'Invalid encrypted email payload' }); return; }
    if (!plainEmail) { res.status(400).json({ error: 'Invalid encrypted email payload' }); return; }

    const all = await Student.find();
    for (const s of all) {
      try {
        if (decryptFull(s.email).toLowerCase() === plainEmail.toLowerCase()) {
          res.status(400).json({ error: 'A student with this email already exists' });
          return;
        }
      } catch { /* skip undecryptable */ }
    }

    const hashed = await bcrypt.hash(password, 10);
    const student = new Student(encryptStudent({
      fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled, password: hashed,
    }));
    await student.save();
    res.status(201).json({ message: 'Student registered successfully', studentId: student._id });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const err = validateLogin(req.body);
    if (err) { res.status(400).json({ error: err }); return; }
    const { email, password } = req.body;

    const all = await Student.find();
    let found: IStudent | null = null;
    for (const s of all) {
      try {
        if (decryptFull(s.email).toLowerCase() === email.toLowerCase()) { found = s; break; }
      } catch { /* skip */ }
    }
    if (!found) { res.status(401).json({ error: 'Invalid email or password' }); return; }

    const ok = await bcrypt.compare(password, found.password);
    if (!ok) { res.status(401).json({ error: 'Invalid email or password' }); return; }

    res.status(200).json({
      message: 'Login successful',
      studentId: found._id,
      token: generateToken(found._id.toString()),
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/students', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const list = await Student.find().sort({ createdAt: -1 });
    res.status(200).json(list.map(decryptStudent));
  } catch (e) {
    console.error('Fetch error:', e);
    res.status(500).json({ error: 'Server error while fetching students' });
  }
});

app.put('/api/student/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isObjId(id)) { res.status(400).json({ error: 'Invalid student ID format' }); return; }
    const err = validateUpdate(req.body);
    if (err) { res.status(400).json({ error: err }); return; }

    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled } = req.body;

    if (isStr(email)) {
      let plain: string;
      try { plain = decryptLevel1(email); }
      catch { res.status(400).json({ error: 'Invalid encrypted email payload' }); return; }
      const others = await Student.find({ _id: { $ne: id } });
      for (const s of others) {
        try {
          if (decryptFull(s.email).toLowerCase() === plain.toLowerCase()) {
            res.status(400).json({ error: 'Another student with this email already exists' });
            return;
          }
        } catch { /* skip */ }
      }
    }

    const upd: any = {};
    if (isStr(fullName)) upd.fullName = encryptLevel2(fullName);
    if (isStr(email)) upd.email = encryptLevel2(email);
    if (isStr(phoneNumber)) upd.phoneNumber = encryptLevel2(phoneNumber);
    if (isStr(dateOfBirth)) upd.dateOfBirth = encryptLevel2(dateOfBirth);
    if (isStr(gender)) upd.gender = encryptLevel2(gender);
    if (isStr(address)) upd.address = encryptLevel2(address);
    if (isStr(courseEnrolled)) upd.courseEnrolled = encryptLevel2(courseEnrolled);

    const student = await Student.findByIdAndUpdate(id, upd, { new: true });
    if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
    res.status(200).json({ message: 'Student updated successfully', student: decryptStudent(student) });
  } catch (e) {
    console.error('Update error:', e);
    res.status(500).json({ error: 'Server error while updating student' });
  }
});

app.delete('/api/student/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isObjId(id)) { res.status(400).json({ error: 'Invalid student ID format' }); return; }
    const student = await Student.findByIdAndDelete(id);
    if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
    res.status(200).json({ message: 'Student deleted successfully', sessionInvalidated: true });
  } catch (e) {
    console.error('Delete error:', e);
    res.status(500).json({ error: 'Server error while deleting student' });
  }
});

// ── Vercel handler ───────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res);
}
