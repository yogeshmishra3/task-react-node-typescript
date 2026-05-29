import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Student, { IStudent } from '../models/Student';
import { encryptLevel2, decryptLevel2, decryptLevel1, decryptFull } from '../utils/crypto';
import { generateToken, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// ── Validation helpers ───────────────────────────────────────

const isNonEmptyString = (val: any): val is string =>
  typeof val === 'string' && val.trim().length > 0;

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * Validate that every required field is present and is a non-empty string.
 * Returns an error message or null if valid.
 */
const validateRegistrationBody = (body: any): string | null => {
  const requiredFields = [
    'fullName',
    'email',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'address',
    'courseEnrolled',
    'password',
  ];

  for (const field of requiredFields) {
    if (!isNonEmptyString(body[field])) {
      return `${field} is required and must be a non-empty string`;
    }
  }
  return null;
};

const validateUpdateBody = (body: any): string | null => {
  const allowedFields = [
    'fullName',
    'email',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'address',
    'courseEnrolled',
  ];

  const hasAtLeastOne = allowedFields.some((f) => isNonEmptyString(body[f]));
  if (!hasAtLeastOne) {
    return 'At least one field must be provided for update';
  }
  return null;
};

const validateLoginBody = (body: any): string | null => {
  if (!isNonEmptyString(body.email)) return 'Email is required';
  if (!isNonEmptyString(body.password)) return 'Password is required';
  return null;
};

// ── Encryption helpers ───────────────────────────────────────

const encryptStudentData = (data: any) => ({
  fullName: encryptLevel2(data.fullName),
  email: encryptLevel2(data.email),
  phoneNumber: encryptLevel2(data.phoneNumber),
  dateOfBirth: encryptLevel2(data.dateOfBirth),
  gender: encryptLevel2(data.gender),
  address: encryptLevel2(data.address),
  courseEnrolled: encryptLevel2(data.courseEnrolled),
  password: data.password, // already hashed
});

// Decrypt Level 2 only — returns Level 1 encrypted strings for the frontend
const decryptStudentData = (student: IStudent) => ({
  _id: student._id,
  fullName: decryptLevel2(student.fullName),
  email: decryptLevel2(student.email),
  phoneNumber: decryptLevel2(student.phoneNumber),
  dateOfBirth: decryptLevel2(student.dateOfBirth),
  gender: decryptLevel2(student.gender),
  address: decryptLevel2(student.address),
  courseEnrolled: decryptLevel2(student.courseEnrolled),
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

// ── POST /api/register ───────────────────────────────────────

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate request body
    const validationError = validateRegistrationBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled, password } = req.body;

    // 2. Decrypt both levels to get plaintext email for duplicate check
    let plaintextEmail: string;
    try {
      plaintextEmail = decryptLevel1(email); // email arrives Level 1 encrypted
    } catch {
      res.status(400).json({ error: 'Invalid encrypted email payload' });
      return;
    }

    // 3. Check for duplicate email (manual scan — can't use unique index on ciphertext)
    const existingStudents = await Student.find();
    for (const s of existingStudents) {
      try {
        const existingPlainEmail = decryptFull(s.email);
        if (existingPlainEmail.toLowerCase() === plaintextEmail.toLowerCase()) {
          res.status(400).json({ error: 'A student with this email already exists' });
          return;
        }
      } catch {
        // skip records that fail decryption
      }
    }

    // 4. Hash password (arrives as plaintext from frontend)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Apply Level 2 on top of the received Level 1 ciphertext.
    //    Data at rest = Level2(Level1(plaintext)) so login (decryptFull) and the
    //    student list (frontend decryptLevel1) both decrypt symmetrically.
    const encryptedData = encryptStudentData({
      fullName,
      email,
      phoneNumber,
      dateOfBirth,
      gender,
      address,
      courseEnrolled,
      password: hashedPassword,
    });

    const student = new Student(encryptedData);
    await student.save();

    res.status(201).json({
      message: 'Student registered successfully',
      studentId: student._id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ── GET /api/students ────────────────────────────────────────

export const getStudents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });

    // Decrypt Level 2, return Level 1 encrypted data to frontend
    const decryptedStudents = students.map((student) => decryptStudentData(student));

    res.status(200).json(decryptedStudents);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Server error while fetching students' });
  }
};

// ── PUT /api/student/:id ─────────────────────────────────────

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Validate ObjectId
    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid student ID format' });
      return;
    }

    // 2. Validate body
    const validationError = validateUpdateBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled } = req.body;

    // 3. If email is being updated, check for duplicates
    if (isNonEmptyString(email)) {
      let plaintextEmail: string;
      try {
        plaintextEmail = decryptLevel1(email);
      } catch {
        res.status(400).json({ error: 'Invalid encrypted email payload' });
        return;
      }

      const existingStudents = await Student.find({ _id: { $ne: id } });
      for (const s of existingStudents) {
        try {
          const existingPlainEmail = decryptFull(s.email);
          if (existingPlainEmail.toLowerCase() === plaintextEmail.toLowerCase()) {
            res.status(400).json({ error: 'Another student with this email already exists' });
            return;
          }
        } catch {
          // skip records that fail decryption
        }
      }
    }

    // 4. Build update object — apply Level 2 on top of the received Level 1 ciphertext
    //    (keeps data at rest = Level2(Level1(plaintext)), matching registration)
    const encryptedData: any = {};
    if (isNonEmptyString(fullName)) encryptedData.fullName = encryptLevel2(fullName);
    if (isNonEmptyString(email)) encryptedData.email = encryptLevel2(email);
    if (isNonEmptyString(phoneNumber)) encryptedData.phoneNumber = encryptLevel2(phoneNumber);
    if (isNonEmptyString(dateOfBirth)) encryptedData.dateOfBirth = encryptLevel2(dateOfBirth);
    if (isNonEmptyString(gender)) encryptedData.gender = encryptLevel2(gender);
    if (isNonEmptyString(address)) encryptedData.address = encryptLevel2(address);
    if (isNonEmptyString(courseEnrolled)) encryptedData.courseEnrolled = encryptLevel2(courseEnrolled);

    const student = await Student.findByIdAndUpdate(id, encryptedData, { new: true });

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({
      message: 'Student updated successfully',
      student: decryptStudentData(student),
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Server error while updating student' });
  }
};

// ── DELETE /api/student/:id ──────────────────────────────────

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid student ID format' });
      return;
    }

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({
      message: 'Student deleted successfully',
      sessionInvalidated: true,
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error while deleting student' });
  }
};

// ── POST /api/login ──────────────────────────────────────────

export const loginStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate
    const validationError = validateLoginBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const { email, password } = req.body;

    // email arrives as plaintext from the login form (no encryption for login)
    // We need to compare against fully decrypted stored emails

    const students = await Student.find();
    let foundStudent: IStudent | null = null;

    for (const student of students) {
      try {
        const storedPlaintextEmail = decryptFull(student.email);
        if (storedPlaintextEmail.toLowerCase() === email.toLowerCase()) {
          foundStudent = student;
          break;
        }
      } catch {
        // skip records that fail decryption
      }
    }

    if (!foundStudent) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 2. Compare password
    const isPasswordValid = await bcrypt.compare(password, foundStudent.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(foundStudent._id.toString());

    res.status(200).json({
      message: 'Login successful',
      studentId: foundStudent._id,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};
