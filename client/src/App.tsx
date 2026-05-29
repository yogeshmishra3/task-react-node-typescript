import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import StudentForm from './components/StudentForm';
import StudentList from './components/StudentList';
import { setLogoutCallback } from './utils/api';
import './App.css';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingStudent, setEditingStudent] = useState<any>(null);

  useEffect(() => {
    // Check for token on mount to restore login state
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
    }

    // Set up logout callback for 401 errors
    setLogoutCallback(() => {
      setIsLoggedIn(false);
      setEditingStudent(null);
    });
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleRegistrationSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingStudent(null);
    setActiveTab('list');
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setActiveTab('register');
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setEditingStudent(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Student Registration System</h1>
          <p className="subtitle">Secured with 2-Level AES Encryption</p>
        </header>
        <main className="app-main">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
          <div className="info-box">
            <p>First time? Register below to create your account, then login.</p>
            <button onClick={() => setIsLoggedIn(true)} className="btn-skip">
              Go to Registration →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Registration System</h1>
        <p className="subtitle">Secured with 2-Level AES Encryption</p>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>
      <nav className="tab-nav">
        <button
          className={activeTab === 'register' ? 'active' : ''}
          onClick={() => { setActiveTab('register'); setEditingStudent(null); }}
        >
          {editingStudent ? 'Edit Student' : 'Register Student'}
        </button>
        <button
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          Student List
        </button>
      </nav>
      <main className="app-main">
        {activeTab === 'register' && (
          <StudentForm
            onSuccess={handleRegistrationSuccess}
            editingStudent={editingStudent}
            onCancelEdit={handleCancelEdit}
          />
        )}
        {activeTab === 'list' && (
          <StudentList refreshTrigger={refreshTrigger} onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
};

export default App;
