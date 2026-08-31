import React, { useState, useEffect, useRef } from 'react';
import './ThesisPdfViewer.css';

/**
 * ThesisPdfViewer
 * 
 * Interactive 10-Page Restricted PDF Reader component.
 * Displays pages 1 to 10 of a thesis with page jumping, zoom controls,
 * thumbnail strip, and full-screen modal mode.
 */
export default function ThesisPdfViewer({
  pdfUrl,
  previewPdfUrl,
  title = 'Thesis Document',
  author = '',
  studentRoll = '',
  major = '',
  year = '',
  totalPages = 10,
  previewPagesCount = 10,
  onClose,
  isModal = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const containerRef = useRef(null);

  // Maximum pages shown is capped at previewPagesCount or 10
  const maxPages = Math.min(10, previewPagesCount || 10);
  const activeUrl = previewPdfUrl || pdfUrl;

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(maxPages, prev + 1));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(50, prev - 25));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrev();
      } else if (e.key === 'Escape' && isModal && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxPages, isModal, onClose]);

  // Construct iframe URL with page parameter
  const getPageUrl = (page) => {
    if (!activeUrl) return '';
    // Append page anchor and parameters for PDF viewer
    const separator = activeUrl.includes('#') ? '&' : '#';
    return `${activeUrl}${separator}page=${page}&view=FitH&toolbar=0&navpanes=0`;
  };

  return (
    <div className={`thesis-pdf-viewer ${isModal ? 'viewer-modal-backdrop' : ''}`}>
      <div className={`thesis-pdf-container ${isFullscreen ? 'is-fullscreen' : ''}`} ref={containerRef}>
        
        {/* Top Control Bar */}
        <div className="pdf-toolbar">
          <div className="pdf-toolbar-left">
            <div className="pdf-doc-badge">
              <span className="badge-icon">🎓</span>
              <span>10-Page Preview</span>
            </div>
            <div className="pdf-title-info">
              <h3 className="pdf-title" title={title}>{title}</h3>
              <div className="pdf-meta-line">
                {author && <span className="pdf-author">by {author}</span>}
                {studentRoll && <span className="pdf-roll">({studentRoll})</span>}
                {major && <span className="pdf-major-pill">{major}</span>}
                {year && <span className="pdf-year-pill">{year}</span>}
              </div>
            </div>
          </div>

          <div className="pdf-toolbar-center">
            {/* Page Navigation */}
            <div className="page-nav-group">
              <button
                className="pdf-btn"
                onClick={handlePrev}
                disabled={currentPage <= 1}
                title="Previous Page (Left Arrow)"
              >
                ◀
              </button>
              <div className="page-indicator">
                <span className="current-page-num">{currentPage}</span>
                <span className="page-sep">/</span>
                <span className="total-pages-num">{maxPages}</span>
              </div>
              <button
                className="pdf-btn"
                onClick={handleNext}
                disabled={currentPage >= maxPages}
                title="Next Page (Right Arrow)"
              >
                ▶
              </button>
            </div>

            {/* Quick Page Jump Selector */}
            <select
              className="page-select"
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
            >
              {Array.from({ length: maxPages }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Page {p} of {maxPages}</option>
              ))}
            </select>
          </div>

          <div className="pdf-toolbar-right">
            {/* Zoom Controls */}
            <div className="zoom-group">
              <button className="pdf-btn-icon" onClick={handleZoomOut} title="Zoom Out (-)">
                🔍−
              </button>
              <button className="zoom-label-btn" onClick={handleResetZoom} title="Reset Zoom">
                {zoom}%
              </button>
              <button className="pdf-btn-icon" onClick={handleZoomIn} title="Zoom In (+)">
                🔍+
              </button>
            </div>

            <button
              className={`pdf-btn-icon ${showThumbnails ? 'active' : ''}`}
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Toggle Thumbnails"
            >
              📑
            </button>

            <button className="pdf-btn-icon" onClick={toggleFullscreen} title="Fullscreen Mode">
              {isFullscreen ? '⤓' : '⤢'}
            </button>

            {isModal && onClose && (
              <button className="pdf-btn-close" onClick={onClose} title="Close Preview (Esc)">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Restricted Notice Banner */}
        <div className="pdf-notice-bar">
          <span className="notice-icon">🔒</span>
          <span>
            <strong>Restricted Thesis Preview:</strong> You are viewing the first <strong>{maxPages} pages</strong> of this {totalPages ? `${totalPages}-page` : ''} thesis in compliance with TTU Library digital lending policy.
          </span>
        </div>

        {/* Content Viewport */}
        <div className="pdf-viewport">
          {/* Thumbnails Sidebar */}
          {showThumbnails && (
            <aside className="pdf-thumbnails-sidebar">
              <div className="thumbnails-header">
                <span>Pages (1–{maxPages})</span>
              </div>
              <div className="thumbnails-list">
                {Array.from({ length: maxPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`thumb-item ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    <div className="thumb-preview-box">
                      <span className="thumb-mini-doc">📄</span>
                      <span className="thumb-page-num">{p}</span>
                    </div>
                    <span className="thumb-label">Page {p}</span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main PDF Reader Frame */}
          <main className="pdf-canvas-wrapper">
            {activeUrl ? (
              <div
                className="pdf-frame-container"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  key={`${activeUrl}-${currentPage}`}
                  src={getPageUrl(currentPage)}
                  title={`Thesis Preview - Page ${currentPage}`}
                  className="pdf-iframe"
                />

                {/* Subtle Digital Watermark */}
                <div className="pdf-watermark-overlay">
                  <div className="watermark-text">TTU LIBRARY • 10-PAGE PREVIEW ONLY</div>
                </div>
              </div>
            ) : (
              <div className="pdf-empty-state">
                <div className="empty-icon">📑</div>
                <h3>No PDF preview available</h3>
                <p>Please upload a valid thesis PDF to view the 10-page preview.</p>
              </div>
            )}
          </main>
        </div>

        {/* Bottom Quick Page Pill Strip */}
        <div className="pdf-bottom-strip">
          <div className="bottom-strip-label">Jump to page:</div>
          <div className="bottom-page-pills">
            {Array.from({ length: maxPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`bottom-pill ${currentPage === p ? 'active' : ''}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="bottom-strip-meta">
            Showing Page {currentPage} of {maxPages}
          </div>
        </div>

      </div>
    </div>
  );
}
