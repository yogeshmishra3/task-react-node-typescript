import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { encryptStudentData } from '../utils/crypto';

interface StudentFormProps {
  onSuccess: () => void;
  editingStudent?: any;
  onCancelEdit?: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSuccess, editingStudent, onCancelEdit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    courseEnrolled: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        fullName: editingStudent.fullName || '',
        email: editingStudent.email || '',
        phoneNumber: editingStudent.phoneNumber || '',
        dateOfBirth: editingStudent.dateOfBirth || '',
        gender: editingStudent.gender || '',
        address: editingStudent.address || '',
        courseEnrolled: editingStudent.courseEnrolled || '',
        password: '',
      });
      setErrors({});
      setServerError('');
      setSuccessMsg('');
    }
  }, [editingStudent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // ── Field-level validations ──────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 100) {
      newErrors.fullName = 'Full Name must not exceed 100 characters';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Full Name can only contain letters, spaces, dots, hyphens, and apostrophes';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email (e.g. user@example.com)';
    }

    // Phone Number
    const phoneDigits = formData.phoneNumber.replace(/[\s\-()]/g, '');
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required';
    } else if (!/^\+?[0-9]{7,15}$/.test(phoneDigits)) {
      newErrors.phoneNumber = 'Phone Number must be 7–15 digits (optional + prefix)';
    }

    // Date of Birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (dob >= today) {
        newErrors.dateOfBirth = 'Date of Birth must be in the past';
      } else if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid Date of Birth';
      }
    }

    // Gender
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    } else if (!['Male', 'Female', 'Other'].includes(formData.gender)) {
      newErrors.gender = 'Please select a valid gender';
    }

    // Address
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    } else if (formData.address.trim().length > 300) {
      newErrors.address = 'Address must not exceed 300 characters';
    }

    // Course Enrolled
    if (!formData.courseEnrolled.trim()) {
      newErrors.courseEnrolled = 'Course Enrolled is required';
    } else if (formData.courseEnrolled.trim().length < 2) {
      newErrors.courseEnrolled = 'Course name must be at least 2 characters';
    }

    // Password (only for new registrations)
    if (!editingStudent) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (formData.password.length > 50) {
        newErrors.password = 'Password must not exceed 50 characters';
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Level 1 encryption applied before sending to backend
      const dataToSend = encryptStudentData(formData);

      if (editingStudent) {
        await api.put(
          `/api/student/${editingStudent._id}`,
          dataToSend
        );
        setSuccessMsg('Student updated successfully!');
      } else {
        await api.post('/api/register', dataToSend);
        setSuccessMsg('Student registered successfully!');
      }

      // Clear form after short delay so user sees success message
      setTimeout(() => {
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          dateOfBirth: '',
          gender: '',
          address: '',
          courseEnrolled: '',
          password: '',
        });
        setSuccessMsg('');
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{editingStudent ? 'Update Student' : 'Student Registration'}</h2>
      {serverError && <div className="error-message">{serverError}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
            className={errors.fullName ? 'input-error' : ''}
          />
          {errors.fullName && <span className="field-error">{errors.fullName}</span>}
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="Enter phone number (e.g. +919876543210)"
            className={errors.phoneNumber ? 'input-error' : ''}
          />
          {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
        </div>

        {/* Date of Birth */}
        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className={errors.dateOfBirth ? 'input-error' : ''}
          />
          {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
        </div>

        {/* Gender */}
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className={errors.gender ? 'input-error' : ''}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <span className="field-error">{errors.gender}</span>}
        </div>

        {/* Address */}
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter full address"
            className={errors.address ? 'input-error' : ''}
          />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>

        {/* Course Enrolled */}
        <div className="form-group">
          <label htmlFor="courseEnrolled">Course Enrolled</label>
          <input
            id="courseEnrolled"
            name="courseEnrolled"
            type="text"
            value={formData.courseEnrolled}
            onChange={handleChange}
            placeholder="Enter course name"
            className={errors.courseEnrolled ? 'input-error' : ''}
          />
          {errors.courseEnrolled && <span className="field-error">{errors.courseEnrolled}</span>}
        </div>

        {/* Password (only for registration, not edit) */}
        {!editingStudent && (
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 chars, 1 uppercase, 1 number"
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
        )}

        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading
              ? 'Processing...'
              : editingStudent
              ? 'Update Student'
              : 'Register Student'}
          </button>
          {editingStudent && onCancelEdit && (
            <button type="button" onClick={onCancelEdit} className="btn-cancel">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default StudentForm;
