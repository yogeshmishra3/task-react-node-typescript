import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { decryptStudentData } from '../utils/crypto';

interface Student {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  courseEnrolled: string;
  createdAt: string;
}

interface StudentListProps {
  refreshTrigger: number;
  onEdit: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ refreshTrigger, onEdit }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/students');
      // Backend sends Level 1 encrypted data → Frontend decrypts Level 1
      const decryptedStudents = response.data.map((student: any) => decryptStudentData(student));
      setStudents(decryptedStudents as Student[]);
    } catch (err) {
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/student/${id}`);
      fetchStudents();
    } catch (err) {
      setError('Failed to delete student');
    }
  };

  if (loading) return <div className="loading">Loading students...</div>;

  return (
    <div className="student-list">
      <h2>Registered Students</h2>
      {error && <div className="error-message">{error}</div>}
      {students.length === 0 ? (
        <p className="no-data">No students registered yet.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Course</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.fullName}</td>
                  <td>{student.email}</td>
                  <td>{student.phoneNumber}</td>
                  <td>{student.dateOfBirth}</td>
                  <td>{student.gender}</td>
                  <td>{student.courseEnrolled}</td>
                  <td className="actions">
                    <button onClick={() => onEdit(student)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(student._id)} className="btn-delete">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentList;
