import React, { useState, useEffect } from 'react';
import './MembershipModal.css';

const MAJOR_OPTIONS = [
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

const YEAR_OPTIONS = [
  { value: 'I', label: 'First Year (I)' },
  { value: 'II', label: 'Second Year (II)' },
  { value: 'III', label: 'Third Year (III)' },
  { value: 'IV', label: 'Fourth Year (IV)' },
  { value: 'V', label: 'Fifth Year (V)' },
  { value: 'VI', label: 'Final Year (VI)' }
];

export default function MembershipModal({ isOpen, onClose, user, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    year: '',
    major: '',
    studentNumber: '',
    roll_number: '',
    phone: '',
    nrc: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentStatus, setCurrentStatus] = useState('none');
  const [membershipData, setMembershipData] = useState(null);

  // Initialize form data from user profile
  useEffect(() => {
    if (user) {
      setCurrentStatus(user.membership_status || 'none');
      setFormData({
        name: user.name || '',
        email: user.email || '',
        year: user.year || '',
        major: user.major || '',
        studentNumber: user.student_id ? user.student_id.split('-').pop() : '',
        roll_number: user.roll_number || user.student_id || '',
        phone: user.phone || '',
        nrc: user.nrc || ''
      });

      // Fetch fresh membership status from API
      fetch(`/api/membership/status/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.membership) {
            setCurrentStatus(data.membership.status);
            setMembershipData(data.membership);
            if (data.membership.details) {
              const d = data.membership.details;
              setFormData(prev => ({
                ...prev,
                name: d.name || prev.name,
                email: d.email || prev.email,
                major: d.major || prev.major,
                year: d.year || prev.year,
                roll_number: d.roll_number || prev.roll_number,
                phone: d.phone || prev.phone,
                nrc: d.nrc || prev.nrc
              }));
            }
          }
        })
        .catch(err => console.error('Failed to fetch membership details:', err));
    }
  }, [user, isOpen]);

  // Compute roll number when year, major, or studentNumber change
  useEffect(() => {
    if (formData.year && formData.major && formData.studentNumber) {
      setFormData(prev => ({
        ...prev,
        roll_number: `${formData.year}-${formData.major}-${formData.studentNumber}`
      }));
    }
  }, [formData.year, formData.major, formData.studentNumber]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.roll_number.trim()) {
      setError('Please provide your Roll Number / Student ID.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/membership/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name.trim(),
          roll_number: formData.roll_number.trim(),
          student_id: formData.roll_number.trim(),
          major: formData.major,
          year: formData.year,
          phone: formData.phone.trim(),
          nrc: formData.nrc.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit application.');
      }

      setCurrentStatus('pending');
      setSuccessMsg('✅ Application submitted successfully! The librarian will review your request.');

      // Update session storage
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        const updated = {
          ...u,
          name: formData.name.trim(),
          student_id: formData.roll_number.trim(),
          roll_number: formData.roll_number.trim(),
          membership_status: 'pending'
        };
        sessionStorage.setItem('ttu_user', JSON.stringify(updated));
      }

      if (onSuccess) onSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="membership-modal-overlay" onClick={onClose}>
      <div className="membership-modal-content" onClick={e => e.stopPropagation()}>
        <button className="membership-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="membership-modal-header">
          <div className="membership-icon-wrapper">
            <span className="membership-header-icon">🪪</span>
          </div>
          <h2>Library Membership</h2>
          <p className="membership-header-subtitle">
            Official student verification required to borrow physical library books
          </p>
        </div>

        {/* Current Status Banners */}
        {currentStatus === 'approved' && (
          <div className="membership-status-card approved">
            <div className="status-badge-row">
              <span className="status-pill status-approved">✓ Approved Member</span>
              <span className="member-id">{formData.roll_number || user?.student_id}</span>
            </div>
            <h3>Digital Library Card Active</h3>
            <p>You have full borrowing privileges at the TTU Library.</p>
            <div className="member-card-details">
              <div className="card-field">
                <label>Member Name</label>
                <span>{formData.name || user?.name}</span>
              </div>
              <div className="card-field">
                <label>Roll Number</label>
                <span className="mono">{formData.roll_number || user?.student_id || '—'}</span>
              </div>
              <div className="card-field">
                <label>Major / Department</label>
                <span>{formData.major || user?.major || '—'}</span>
              </div>
              <div className="card-field">
                <label>Academic Year</label>
                <span>{formData.year || user?.year || '—'}</span>
              </div>
            </div>
            <div className="membership-actions">
              <button className="btn-primary full-width" onClick={onClose}>Close</button>
            </div>
          </div>
        )}

        {currentStatus === 'pending' && (
          <div className="membership-status-card pending">
            <div className="status-badge-row">
              <span className="status-pill status-pending">⏳ Under Review</span>
              <span className="member-id">{formData.roll_number || user?.student_id || 'Application ID'}</span>
            </div>
            <h3>Application Pending Librarian Approval</h3>
            <p>
              Your membership form has been submitted and is awaiting verification by the circulation librarian.
              You will receive an in-app notification once approved.
            </p>
            <div className="member-card-details">
              <div className="card-field">
                <label>Name</label>
                <span>{formData.name || user?.name}</span>
              </div>
              <div className="card-field">
                <label>Roll Number</label>
                <span className="mono">{formData.roll_number || user?.student_id || '—'}</span>
              </div>
              <div className="card-field">
                <label>Phone</label>
                <span>{formData.phone || '—'}</span>
              </div>
            </div>
            <div className="membership-actions">
              <button className="btn-secondary" onClick={() => setCurrentStatus('edit')}>Edit Application</button>
              <button className="btn-primary" onClick={onClose}>Got It</button>
            </div>
          </div>
        )}

        {currentStatus === 'rejected' && (
          <div className="membership-status-card rejected">
            <div className="status-badge-row">
              <span className="status-pill status-rejected">✕ Application Rejected</span>
            </div>
            <h3>Action Required</h3>
            <p>
              <strong>Librarian Note:</strong> {membershipData?.rejected_reason || user?.membership_rejected_reason || 'Please verify your student roll number and resubmit.'}
            </p>
            <div className="membership-actions">
              <button className="btn-primary full-width" onClick={() => setCurrentStatus('edit')}>
                Update & Resubmit Form
              </button>
            </div>
          </div>
        )}

        {(currentStatus === 'none' || currentStatus === 'edit') && (
          <form className="membership-form" onSubmit={handleSubmit}>
            {error && <div className="membership-alert error">{error}</div>}
            {successMsg && <div className="membership-alert success">{successMsg}</div>}

            <div className="form-group">
              <label>Official Full Real Name *</label>
              <input
                type="text"
                name="name"
                className="membership-input"
                placeholder="Enter your real full name (e.g. Mg Aung Kyaw)"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                💡 Replaces any random Google username with your official name on your library card and borrowing records.
              </span>
            </div>

            <div className="form-group">
              <label>Google Email</label>
              <input
                type="email"
                name="email"
                className="membership-input disabled"
                value={formData.email}
                disabled
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Academic Year</label>
                <select
                  name="year"
                  className="membership-input"
                  value={formData.year}
                  onChange={handleChange}
                >
                  <option value="">Select Year</option>
                  {YEAR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Major / Dept</label>
                <select
                  name="major"
                  className="membership-input"
                  value={formData.major}
                  onChange={handleChange}
                >
                  <option value="">Select Major</option>
                  {MAJOR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Student No.</label>
                <input
                  type="number"
                  name="studentNumber"
                  className="membership-input"
                  placeholder="e.g. 1"
                  value={formData.studentNumber}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Roll Number / Student ID *</label>
              <input
                type="text"
                name="roll_number"
                className="membership-input highlight"
                placeholder="e.g. III-CEIT-1"
                value={formData.roll_number}
                onChange={handleChange}
                required
              />
              <span className="form-hint">Generated from Year + Major + Student No., or enter manually.</span>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  className="membership-input"
                  placeholder="e.g. 09123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group flex-1">
                <label>NRC / National ID (Optional)</label>
                <input
                  type="text"
                  name="nrc"
                  className="membership-input"
                  placeholder="e.g. 12/AhSaNa(N)123456"
                  value={formData.nrc}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="membership-modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Membership Form'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
