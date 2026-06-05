import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Link,
  Outlet,
} from 'react-router-dom';
import LoginForm from './components/LoginForm';
import StudentForm from './components/StudentForm';
import StudentList from './components/StudentList';
import UnauthorizedModal from './components/UnauthorizedModal';
import { setLogoutCallback } from './utils/api';
import './App.css';

// ── Auth helpers ─────────────────────────────────────────────
const hasToken = () => !!localStorage.getItem('authToken');

// ── Layout for authenticated pages (header + tabs) ───────────
const AuthLayout: React.FC<{ onLogout: () => void; editingActive: boolean }> = ({
  onLogout,
  editingActive,
}) => {
  const location = useLocation();
  const isRegister = location.pathname.startsWith('/register');
  const isList = location.pathname.startsWith('/students');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Registration System</h1>
        <p className="subtitle">Secured with 2-Level AES Encryption</p>
        <button onClick={onLogout} className="btn-logout">Logout</button>
      </header>
      <nav className="tab-nav">
        <Link to="/register" className={isRegister ? 'active' : ''}>
          <button className={isRegister ? 'active' : ''}>
            {editingActive ? 'Edit Student' : 'Register Student'}
          </button>
        </Link>
        <Link to="/students" className={isList ? 'active' : ''}>
          <button className={isList ? 'active' : ''}>Student List</button>
        </Link>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

// ── Protected route wrapper ──────────────────────────────────
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!hasToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ── Public login page ───────────────────────────────────────
const LoginPage: React.FC<{ notice: string; onNoticeClear: () => void }> = ({
  notice,
  onNoticeClear,
}) => {
  const navigate = useNavigate();
  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Registration System</h1>
        <p className="subtitle">Secured with 2-Level AES Encryption</p>
      </header>
      <main className="app-main">
        {notice && (
          <div className="success-message" style={{ marginBottom: '1rem' }}>{notice}</div>
        )}
        <LoginForm
          onLoginSuccess={() => {
            onNoticeClear();
            navigate('/students', { replace: true });
          }}
        />
        <div className="info-box">
          <p>First time? Register to create your account, then login.</p>
          <Link to="/register-public">
            <button onClick={onNoticeClear} className="btn-skip">
              Go to Registration →
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
};

// ── Public registration page (no auth required) ─────────────
const PublicRegisterPage: React.FC<{ onRegistered: (msg: string) => void }> = ({ onRegistered }) => {
  const navigate = useNavigate();
  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Registration System</h1>
        <p className="subtitle">Secured with 2-Level AES Encryption</p>
      </header>
      <main className="app-main">
        <StudentForm
          onSuccess={() => {
            onRegistered('Registration successful! Please login with your credentials.');
            navigate('/login', { replace: true });
          }}
        />
        <div className="info-box">
          <p>Already have an account?</p>
          <Link to="/login">
            <button className="btn-skip">Go to Login →</button>
          </Link>
        </div>
      </main>
    </div>
  );
};

// ── App ──────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState('');
  const [loginNotice, setLoginNotice] = useState('');

  useEffect(() => {
    setLogoutCallback((message: string) => {
      localStorage.removeItem('authToken');
      setEditingStudent(null);
      setUnauthorizedMessage(message);
      setShowUnauthorizedModal(true);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setEditingStudent(null);
    navigate('/login', { replace: true });
  };

  const handleRegistered = () => {
    setRefreshTrigger((p) => p + 1);
    setEditingStudent(null);
    navigate('/students', { replace: true });
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    navigate('/register', { replace: false });
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  return (
    <>
      <UnauthorizedModal
        isOpen={showUnauthorizedModal}
        message={unauthorizedMessage}
        onClose={() => setShowUnauthorizedModal(false)}
      />
      <Routes>
        <Route
          path="/login"
          element={
            hasToken() ? (
              <Navigate to="/students" replace />
            ) : (
              <LoginPage notice={loginNotice} onNoticeClear={() => setLoginNotice('')} />
            )
          }
        />
        <Route
          path="/register-public"
          element={
            hasToken() ? (
              <Navigate to="/students" replace />
            ) : (
              <PublicRegisterPage onRegistered={(msg) => setLoginNotice(msg)} />
            )
          }
        />

        {/* Authenticated area */}
        <Route
          element={
            <RequireAuth>
              <AuthLayout onLogout={handleLogout} editingActive={!!editingStudent} />
            </RequireAuth>
          }
        >
          <Route
            path="/register"
            element={
              <StudentForm
                onSuccess={handleRegistered}
                editingStudent={editingStudent}
                onCancelEdit={handleCancelEdit}
              />
            }
          />
          <Route
            path="/students"
            element={<StudentList refreshTrigger={refreshTrigger} onEdit={handleEdit} />}
          />
        </Route>

        <Route path="*" element={<Navigate to={hasToken() ? '/students' : '/login'} replace />} />
      </Routes>
    </>
  );
};

export default App;
