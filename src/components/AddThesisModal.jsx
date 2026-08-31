import React, { useState, useRef } from 'react';
import ThesisPdfViewer from './ThesisPdfViewer';
import './AddThesisModal.css';

const TTU_MAJORS = [
  'Information Technology',
  'Electronic Communication',
  'Electrical Power',
  'Civil Engineering',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Architecture',
  'Chemical Engineering',
  'Other',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_LIST = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

export default function AddThesisModal({ onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    student_roll: '',
    major: 'Information Technology',
    custom_major: '',
    year: CURRENT_YEAR,
    supervisor: '',
    abstract: '',
    accession_no: '',
    cover_url: '',
  });

  const [pdfData, setPdfData] = useState({
    fullPdfUrl: '',
    previewPdfUrl: '',
    totalPages: 0,
    previewPagesCount: 0,
    originalName: '',
    fileSize: 0,
  });

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const pdfInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Helper for authenticated API calls
  const getAuthHeader = () => {
    try {
      const stored = sessionStorage.getItem('ttu_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.access_token) {
          return { Authorization: `Bearer ${session.access_token}` };
        }
      }
    } catch (e) {}
    return {};
  };

  // Handle PDF file upload
  const handlePdfFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast?.('Please select a valid PDF file.', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast?.('PDF exceeds 50MB maximum size limit.', 'error');
      return;
    }

    setUploadingPdf(true);
    setUploadProgress('Uploading PDF and extracting first 10 pages preview...');

    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);

      const res = await fetch('/api/upload/thesis-pdf', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: uploadForm,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload PDF');
      }

      setPdfData({
        fullPdfUrl: data.data.fullPdfUrl,
        previewPdfUrl: data.data.previewPdfUrl,
        totalPages: data.data.totalPages,
        previewPagesCount: data.data.previewPagesCount,
        originalName: data.data.originalName || file.name,
        fileSize: data.data.fileSize || file.size,
      });

      showToast?.(`✅ PDF uploaded! Extracted ${data.data.previewPagesCount} preview pages.`, 'success');
      setShowLivePreview(true);
    } catch (err) {
      console.error('PDF upload error:', err);
      showToast?.(err.message || 'Failed to process PDF upload.', 'error');
    } finally {
      setUploadingPdf(false);
      setUploadProgress('');
    }
  };

  // Handle Cover Image Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append('cover', file);

      const res = await fetch('/api/upload/book-cover', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to upload cover');

      setFormData(prev => ({ ...prev, cover_url: data.data.publicUrl }));
      showToast?.('Cover uploaded successfully!', 'success');
    } catch (err) {
      console.error('Cover upload error:', err);
      showToast?.(err.message || 'Failed to upload cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalMajor = formData.major === 'Other' ? formData.custom_major.trim() : formData.major;

    if (!formData.title.trim()) {
      showToast?.('Thesis title is required.', 'error');
      return;
    }
    if (!formData.author.trim()) {
      showToast?.('Student author name is required.', 'error');
      return;
    }
    if (!formData.student_roll.trim()) {
      showToast?.('Student roll number is required (e.g. 5IT-12).', 'error');
      return;
    }
    if (!finalMajor) {
      showToast?.('Please select or specify a major.', 'error');
      return;
    }
    if (!formData.year) {
      showToast?.('Year is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        student_roll: formData.student_roll.trim(),
        major: finalMajor,
        year: parseInt(formData.year, 10),
        supervisor: formData.supervisor.trim() || null,
        abstract: formData.abstract.trim() || null,
        accession_no: formData.accession_no.trim() || null,
        pdf_url: pdfData.fullPdfUrl || null,
        preview_pdf_url: pdfData.previewPdfUrl || null,
        total_pages: pdfData.totalPages || 10,
        preview_pages_count: pdfData.previewPagesCount || 10,
        cover_url: formData.cover_url || null,
      };

      const res = await fetch('/api/admin/theses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add thesis.');
      }

      showToast?.('🎉 Thesis added to library successfully!', 'success');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Save thesis error:', err);
      showToast?.(err.message || 'Failed to save thesis.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const finalMajorName = formData.major === 'Other' ? (formData.custom_major || 'Thesis') : formData.major;

  return (
    <div className="add-thesis-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="add-thesis-modal-card">
        
        {/* Header */}
        <div className="add-thesis-header">
          <div className="header-badge-title">
            <span className="thesis-icon-tag">🎓</span>
            <div>
              <h2>Add New Thesis</h2>
              <p>Upload and catalog student graduation theses with 10-page preview</p>
            </div>
          </div>
          <button className="add-thesis-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="add-thesis-form">
          <div className="form-grid-layout">

            {/* Left Column: Metadata Fields */}
            <div className="form-fields-column">
              
              <div className="form-group full-width">
                <label className="field-label required">Thesis Title</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Design and Implementation of IoT Smart Campus Grid"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label required">Student Author(s)</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Aung Myo Thant"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="field-label required">Student Roll Number</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. 5IT-14 / 5EC-02"
                    value={formData.student_roll}
                    onChange={e => setFormData({ ...formData, student_roll: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label required">Major / Department</label>
                  <select
                    className="field-select"
                    value={formData.major}
                    onChange={e => setFormData({ ...formData, major: e.target.value })}
                  >
                    {TTU_MAJORS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label required">Year Done</label>
                  <select
                    className="field-select"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                  >
                    {YEARS_LIST.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.major === 'Other' && (
                <div className="form-group full-width">
                  <label className="field-label required">Specify Custom Major</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Biomedical Engineering"
                    value={formData.custom_major}
                    onChange={e => setFormData({ ...formData, custom_major: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label">Supervisor / Advisor</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Dr. Win Zaw, Professor"
                    value={formData.supervisor}
                    onChange={e => setFormData({ ...formData, supervisor: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Accession No. (Optional Physical Copy)</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. TH-IT-2025-001"
                    value={formData.accession_no}
                    onChange={e => setFormData({ ...formData, accession_no: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label className="field-label">Abstract / Summary</label>
                <textarea
                  className="field-textarea"
                  rows="3"
                  placeholder="Enter a brief summary or abstract of the thesis findings and methodology..."
                  value={formData.abstract}
                  onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                />
              </div>

            </div>

            {/* Right Column: PDF Upload & Cover Style */}
            <div className="form-upload-column">
              
              {/* PDF Upload Box */}
              <div className="upload-box-card">
                <div className="upload-card-header">
                  <span className="upload-card-title">📄 Thesis PDF Document</span>
                  <span className="upload-badge-10p">10-Page Preview</span>
                </div>

                <div
                  className={`pdf-dropzone ${uploadingPdf ? 'uploading' : ''} ${pdfData.previewPdfUrl ? 'has-file' : ''}`}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={e => handlePdfFile(e.target.files?.[0])}
                  />

                  {uploadingPdf ? (
                    <div className="dropzone-loading">
                      <div className="dropzone-spinner" />
                      <p className="loading-status">{uploadProgress}</p>
                    </div>
                  ) : pdfData.previewPdfUrl ? (
                    <div className="dropzone-file-info">
                      <div className="file-icon-success">✓</div>
                      <div className="file-details">
                        <div className="file-name">{pdfData.originalName}</div>
                        <div className="file-meta">
                          <span>{(pdfData.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="pages-highlight">Total {pdfData.totalPages} Pages</span>
                        </div>
                        <div className="preview-ready-pill">
                          📖 First {pdfData.previewPagesCount} pages extracted for preview
                        </div>
                      </div>
                      <button
                        type="button"
                        className="change-file-btn"
                        onClick={(e) => { e.stopPropagation(); pdfInputRef.current?.click(); }}
                      >
                        Change PDF
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-prompt">
                      <div className="prompt-icon">📤</div>
                      <div className="prompt-title">Click or drop Thesis PDF here</div>
                      <div className="prompt-sub">Supports .pdf files up to 50MB</div>
                      <div className="prompt-note">
                        ⚡ The system automatically slices and generates the <strong>first 10 pages</strong> for preview
                      </div>
                    </div>
                  )}
                </div>

                {pdfData.previewPdfUrl && (
                  <button
                    type="button"
                    className="btn-toggle-live-preview"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                  >
                    {showLivePreview ? 'Hide 10-Page Live Preview ✕' : '👁️ View Live 10-Page Preview'}
                  </button>
                )}
              </div>

              {/* Cover Image Upload (Optional) */}
              <div className="cover-upload-card">
                <div className="cover-card-header">
                  <span className="upload-card-title">🖼️ Thesis Cover / Thumbnail</span>
                  <span className="optional-tag">Optional</span>
                </div>

                <div className="cover-picker-layout">
                  <div
                    className="cover-preview-box"
                    style={{
                      background: formData.cover_url ? 'transparent' : '#1e3a5f',
                    }}
                  >
                    {formData.cover_url ? (
                      <img src={formData.cover_url} alt="Cover Preview" className="cover-preview-img" />
                    ) : (
                      <div className="auto-cover-styled">
                        <div className="auto-cover-logo">TTU</div>
                        <div className="auto-cover-major">{finalMajorName}</div>
                        <div className="auto-cover-year">{formData.year}</div>
                      </div>
                    )}
                  </div>

                  <div className="cover-actions">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleCoverUpload}
                    />
                    <button
                      type="button"
                      className="btn-upload-cover"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                    >
                      {uploadingCover ? 'Uploading...' : 'Upload Custom Cover'}
                    </button>
                    {formData.cover_url && (
                      <button
                        type="button"
                        className="btn-remove-cover"
                        onClick={() => setFormData({ ...formData, cover_url: '' })}
                      >
                        Reset to Auto Cover
                      </button>
                    )}
                    <p className="cover-help-text">
                      If left empty, a stylish TTU departmental gradient cover will be automatically generated.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Live Preview Viewer Modal / Inset */}
          {showLivePreview && pdfData.previewPdfUrl && (
            <div className="modal-live-preview-section">
              <div className="live-preview-header">
                <h3>📖 Live 10-Page Thesis Preview</h3>
                <span className="live-preview-subtitle">Confirming the first 10 pages formatted for library reading</span>
              </div>
              <div className="live-preview-viewer-container">
                <ThesisPdfViewer
                  previewPdfUrl={pdfData.previewPdfUrl}
                  title={formData.title || 'Untitled Thesis'}
                  author={formData.author}
                  studentRoll={formData.student_roll}
                  major={finalMajorName}
                  year={formData.year}
                  totalPages={pdfData.totalPages}
                  previewPagesCount={pdfData.previewPagesCount}
                  isModal={false}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="add-thesis-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-save-thesis"
              disabled={saving || uploadingPdf}
            >
              {saving ? 'Adding Thesis...' : '✓ Add Thesis to Library'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
