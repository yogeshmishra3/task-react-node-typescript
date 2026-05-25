import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  courseEnrolled: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    // All fields are stored as encrypted strings — no unique constraint
    // on email because AES ciphertext differs each time (random salt).
    // Duplicate-email check is done manually in the controller.
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

export default mongoose.model<IStudent>('Student', StudentSchema);
