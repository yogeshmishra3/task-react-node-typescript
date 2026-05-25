import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  const [error, setError] = useState('');
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
    }
  }, [editingStudent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = (): boolean => {
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.dateOfBirth || !formData.gender || !formData.address || !formData.courseEnrolled) {
      setError('All fields are required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!editingStudent && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Level 1 encryption applied before sending to backend
      const dataToSend = encryptStudentData(formData);

      if (editingStudent) {
        await axios.put(`http://localhost:5000/api/student/${editingStudent._id}`, dataToSend);
      } else {
        await axios.post('http://localhost:5000/api/register', dataToSend);
      }

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
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{editingStudent ? 'Update Student' : 'Student Registration'}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="Enter phone number"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter address"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="courseEnrolled">Course Enrolled</label>
          <input
            id="courseEnrolled"
            name="courseEnrolled"
            type="text"
            value={formData.courseEnrolled}
            onChange={handleChange}
            placeholder="Enter course name"
            required
          />
        </div>
        {!editingStudent && (
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 6 characters)"
              required
            />
          </div>
        )}
        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : editingStudent ? 'Update Student' : 'Register Student'}
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
