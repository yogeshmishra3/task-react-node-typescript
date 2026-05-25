import { Request, Response } from 'express';
import Student, { IStudent } from '../models/Student';
import { encryptLevel2, decryptLevel2 } from '../utils/crypto';
import bcrypt from 'bcryptjs';

// Helper: Encrypt all sensitive fields with Level 2 before storing
const encryptStudentData = (data: any) => {
  return {
    fullName: encryptLevel2(data.fullName),
    email: encryptLevel2(data.email),
    phoneNumber: encryptLevel2(data.phoneNumber),
    dateOfBirth: encryptLevel2(data.dateOfBirth),
    gender: encryptLevel2(data.gender),
    address: encryptLevel2(data.address),
    courseEnrolled: encryptLevel2(data.courseEnrolled),
    password: data.password, // password is already hashed
  };
};

// Helper: Decrypt Level 2 from all sensitive fields (returns Level 1 encrypted data)
const decryptStudentData = (student: IStudent) => {
  return {
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
  };
};

// POST /api/register - Create a new student
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled, password } = req.body;

    // Data arrives from frontend already encrypted with Level 1 (AES)
    // Backend applies Level 2 encryption before storing
    const hashedPassword = await bcrypt.hash(password, 10);

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

    res.status(201).json({ message: 'Student registered successfully', studentId: student._id });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// GET /api/students - Get all students
export const getStudents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const students = await Student.find();

    // Decrypt Level 2, send back Level 1 encrypted data to frontend
    const decryptedStudents = students.map((student) => decryptStudentData(student));

    res.status(200).json(decryptedStudents);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching students' });
  }
};

// PUT /api/student/:id - Update a student
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, email, phoneNumber, dateOfBirth, gender, address, courseEnrolled } = req.body;

    // Data arrives from frontend encrypted with Level 1
    // Backend applies Level 2 encryption before updating
    const encryptedData: any = {};
    if (fullName) encryptedData.fullName = encryptLevel2(fullName);
    if (email) encryptedData.email = encryptLevel2(email);
    if (phoneNumber) encryptedData.phoneNumber = encryptLevel2(phoneNumber);
    if (dateOfBirth) encryptedData.dateOfBirth = encryptLevel2(dateOfBirth);
    if (gender) encryptedData.gender = encryptLevel2(gender);
    if (address) encryptedData.address = encryptLevel2(address);
    if (courseEnrolled) encryptedData.courseEnrolled = encryptLevel2(courseEnrolled);

    const student = await Student.findByIdAndUpdate(id, encryptedData, { new: true });

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({ message: 'Student updated successfully', student: decryptStudentData(student) });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating student' });
  }
};

// DELETE /api/student/:id - Delete a student
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting student' });
  }
};

// POST /api/login - Login student
export const loginStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find student by searching all records (email is encrypted)
    const students = await Student.find();
    let foundStudent: IStudent | null = null;

    for (const student of students) {
      const decryptedEmail = decryptLevel2(student.email);
      if (decryptedEmail === email) {
        foundStudent = student;
        break;
      }
    }

    if (!foundStudent) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, foundStudent.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.status(200).json({ message: 'Login successful', studentId: foundStudent._id });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};
