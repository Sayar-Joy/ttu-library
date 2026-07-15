import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <div className="auth-page">
      {/* Left Side - Immersive Visual */}
      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-overlay" />
        <div className="auth-left-content">
          <h1 className="auth-left-title">TTU Library</h1>
          <p className="auth-left-subtitle">
            Your sanctuary for knowledge, research, and quiet<br />inspiration.
          </p>
        </div>
        <div className="auth-left-badge">
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0L17.09 8.36H26.18L19.05 13.78L21.92 22L14 17.18L6.08 22L8.95 13.78L1.82 8.36H10.91L14 0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Right Side */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-toggle">
            <div className="auth-toggle-shadow" />
            <button
              className={`auth-toggle-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button
              className={`auth-toggle-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
          </div>

          <div className="auth-form-container">
            {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>

          <div className="auth-footer">
            <p>Need help? <a href="#" className="auth-footer-link">Contact Librarian</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your student ID/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // Store user and session in sessionStorage
      sessionStorage.setItem('ttu_user', JSON.stringify(data.user));
      if (data.session) {
        sessionStorage.setItem('ttu_session', JSON.stringify(data.session));
      }

      // Route based on role: librarians → admin panel, students → bookshelf
      if (data.user.role === 'librarian') {
        navigate('/admin');
      } else {
        navigate('/bookshelf');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      <div className="form-header">
        <h2 className="form-title">Welcome Back</h2>
        <p className="form-subtitle">
          Please enter your student credentials to access your<br />portal.
        </p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#E74C3C" strokeWidth="1.5"/>
            <path d="M8 5v3M8 10.5v.5" stroke="#E74C3C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Student ID or Email</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="4" r="3" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M2 12.5C2 10.0147 4.23858 8 7 8C9.76142 8 12 10.0147 12 12.5" stroke="#74777E" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              type="text"
              className="form-input has-left-icon"
              placeholder="e.g. 2024-STU-0891"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Password</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <rect x="1" y="6" width="12" height="10" rx="2" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M4 6V4.5C4 2.84315 5.34315 1.5 7 1.5C8.65685 1.5 10 2.84315 10 4.5V6" stroke="#74777E" strokeWidth="1.5"/>
              </svg>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input has-left-icon has-right-icon"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" className="form-input-icon form-input-icon-right" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
                <path d="M9 3.5C11.4853 3.5 13.5714 5.11111 16.5 6.5C13.5714 7.88889 11.4853 9.5 9 9.5C6.51472 9.5 4.42857 7.88889 1.5 6.5C4.42857 5.11111 6.51472 3.5 9 3.5Z" stroke="#74777E" strokeWidth="1.5"/>
                <circle cx="9" cy="6.5" r="2" stroke="#74777E" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="form-row">
          <label className="form-checkbox-label">
            <div className={`form-checkbox ${rememberMe ? 'checked' : ''}`} onClick={() => setRememberMe(!rememberMe)}>
              {rememberMe && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#366380" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span>Remember me</span>
          </label>
          <a href="#" className="form-link">Forgot Password?</a>
        </div>

        <button type="submit" className="form-submit-btn" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In to OrionPax'}
        </button>
      </div>
    </form>
  );
}

function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    year: '',
    major: '',
    studentNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rollNumber, setRollNumber] = useState('');
  const navigate = useNavigate();

  const yearOptions = [
    { value: 'I', label: 'First Year (I)' },
    { value: 'II', label: 'Second Year (II)' },
    { value: 'III', label: 'Third Year (III)' },
    { value: 'IV', label: 'Fourth Year (IV)' },
    { value: 'V', label: 'Fifth Year (V)' },
    { value: 'VI', label: 'Final Year (VI)' }
  ];

  const majorOptions = [
    { value: 'Arch', label: 'Architecture (Arch)' },
    { value: 'CIVIL', label: 'Civil Engineering (CIVIL)' },
    { value: 'Mech', label: 'Mechanical Engineering (Mech)' },
    { value: 'EC', label: 'Electronic Engineering (EC)' },
    { value: 'EP', label: 'Electrical Power (EP)' },
    { value: 'CEIT', label: 'Computer Engineering & IT (CEIT)' },
    { value: 'Chem', label: 'Chemical Engineering (Chem)' },
    { value: 'PE', label: 'Petroleum Engineering (PE)' },
    { value: 'MC', label: 'Mechatronic Engineering (MC)' }
  ];

  // Calculate roll number whenever year, major, or studentNumber changes
  React.useEffect(() => {
    if (formData.year && formData.major && formData.studentNumber) {
      setRollNumber(`${formData.year}-${formData.major}-${formData.studentNumber}`);
    } else {
      setRollNumber('');
    }
  }, [formData.year, formData.major, formData.studentNumber]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!formData.year) {
      setError('Please select your year.');
      return;
    }
    if (!formData.major) {
      setError('Please select your major.');
      return;
    }
    if (!formData.studentNumber.trim()) {
      setError('Please enter your student number.');
      return;
    }
    if (!formData.password) {
      setError('Please enter a password.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          roll_number: rollNumber,
          student_id: rollNumber, // Use roll_number as student_id
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Show success message and redirect to login
      alert('Account created successfully! You can now log in.');
      window.location.reload(); // Reload to show login tab
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to server. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2 className="form-title">Create Account</h2>
        <p className="form-subtitle">
          Join the TTU Library community and access<br />thousands of resources.
        </p>
      </div>

      {error && (
        <div className="auth-error-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#E74C3C" strokeWidth="1.5"/>
            <path d="M8 5v3M8 10.5v.5" stroke="#E74C3C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Full Name</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="4" r="3" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M2 12.5C2 10.0147 4.23858 8 7 8C9.76142 8 12 10.0147 12 12.5" stroke="#74777E" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <input 
              type="text" 
              name="name"
              className="form-input has-left-icon" 
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Email</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="10" rx="2" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M1 3L7 7.5L13 3" stroke="#74777E" strokeWidth="1.5"/>
              </svg>
            </div>
            <input 
              type="email" 
              name="email"
              className="form-input has-left-icon" 
              placeholder="e.g. john@student.ttu.edu.mm"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
          <div className="form-field" style={{ flex: '1' }}>
            <label className="form-label">Year</label>
            <select 
              name="year"
              className="form-input"
              value={formData.year}
              onChange={handleChange}
              style={{ 
                padding: '10px 12px', 
                border: '1px solid #E0E2E7',
                borderRadius: '8px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="">Select Year</option>
              {yearOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ flex: '1' }}>
            <label className="form-label">Major</label>
            <select 
              name="major"
              className="form-input"
              value={formData.major}
              onChange={handleChange}
              style={{ 
                padding: '10px 12px', 
                border: '1px solid #E0E2E7',
                borderRadius: '8px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="">Select Major</option>
              {majorOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Student Number</label>
          <div className="form-input-wrapper">
            <input 
              type="number" 
              name="studentNumber"
              className="form-input" 
              placeholder="e.g. 1"
              value={formData.studentNumber}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>

        {rollNumber && (
          <div className="form-field">
            <label className="form-label">Your Roll Number</label>
            <div className="form-input-wrapper">
              <input 
                type="text" 
                className="form-input" 
                value={rollNumber}
                disabled
                style={{ 
                  backgroundColor: '#f5f6f7',
                  cursor: 'not-allowed',
                  fontWeight: '600',
                  color: '#366380'
                }}
              />
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">Password</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <rect x="1" y="6" width="12" height="10" rx="2" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M4 6V4.5C4 2.84315 5.34315 1.5 7 1.5C8.65685 1.5 10 2.84315 10 4.5V6" stroke="#74777E" strokeWidth="1.5"/>
              </svg>
            </div>
            <input 
              type="password" 
              name="password"
              className="form-input has-left-icon" 
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Confirm Password</label>
          <div className="form-input-wrapper">
            <div className="form-input-icon form-input-icon-left">
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                <rect x="1" y="6" width="12" height="10" rx="2" stroke="#74777E" strokeWidth="1.5"/>
                <path d="M4 6V4.5C4 2.84315 5.34315 1.5 7 1.5C8.65685 1.5 10 2.84315 10 4.5V6" stroke="#74777E" strokeWidth="1.5"/>
              </svg>
            </div>
            <input 
              type="password" 
              name="confirmPassword"
              className="form-input has-left-icon" 
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>

        <button type="submit" className="form-submit-btn" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}

export default LoginPage;