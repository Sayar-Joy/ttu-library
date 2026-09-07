import React, { useState } from 'react';
import { getBookDdcClass, formatClassNoDual } from '../lib/ddc';
import './InternationalCatalogCard.css';

/**
 * International Standard Library Catalog Component
 * Compliant with ISBD (International Standard Bibliographic Description),
 * AACR2/RDA (Standard Library Catalog Card), MARC 21, and Dublin Core.
 */
function InternationalCatalogCard({ book }) {
  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'bib' | 'marc' | 'dc' | 'holdings'
  const [citationFormat, setCitationFormat] = useState('apa'); // 'apa' | 'mla' | 'chicago' | 'harvard' | 'bibtex' | 'isbd'
  const [copiedKey, setCopiedKey] = useState('');
  const [showCitationModal, setShowCitationModal] = useState(false);

  if (!book) return null;

  const ddc = getBookDdcClass(book);

  // Normalized properties
  const title = book.title || 'Untitled';
  const author = book.author || 'Unknown Author';
  const publisher = book.publisher || 'Not Identified';
  const place = book.place_of_publication || 'Place of publication not identified';
  const year = book.publication_year || book.year || 'n.d.';
  const edition = book.edition ? (book.edition.toString().toLowerCase().includes('ed') ? book.edition : `${book.edition} ed.`) : '1st ed.';
  const pages = book.total_pages || book.pages || '1 v.';
  const size = book.size || '21 × 14 cm';
  const isbn = book.isbn || 'N/A';
  const classNo = book.class_no ? formatClassNoDual(book.class_no) : (book.isThesis ? `THESIS-${book.year || '2026'}` : `${ddc.code} (${ddc.burmeseCode})`);
  const category = book.isThesis || book.genre === 'Thesis' ? 'Thesis' : ddc.name;
  const summary = book.review || book.description || `${title} by ${author}. Published in ${year}. Part of the TTU Library collection.`;
  const copies = Array.isArray(book.physical_copies) ? book.physical_copies : [];
  
  // Translation properties
  const isTranslated = !!book.is_translated;
  const originalTitle = book.original_title;
  const originalAuthor = book.original_author;
  const translator = book.translator;

  // Thesis properties
  const isThesis = book.isThesis || book.genre === 'Thesis' || book.category === 'Thesis';
  const studentRoll = book.student_roll;
  const major = book.major;
  const supervisor = book.supervisor;

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  // Citation generator
  const getCitation = (format) => {
    switch (format) {
      case 'apa':
        if (isThesis) {
          return `${author}. (${year}). ${title} [Bachelor's thesis / Master's thesis, Thanlyin Technological University]. TTU Library Repository.`;
        }
        return `${author}. (${year}). ${title}${isTranslated && translator ? ` (${translator}, Trans.)` : ''} (${edition}). ${publisher}.`;
      
      case 'mla':
        if (isThesis) {
          return `${author}. "${title}." Thesis, Thanlyin Technological University, ${year}.`;
        }
        return `${author}. ${title}.${isTranslated && translator ? ` Translated by ${translator},` : ''} ${edition}, ${publisher}, ${year}.`;
      
      case 'chicago':
        if (isThesis) {
          return `${author}. "${title}." Bachelor's/Master's thesis, Thanlyin Technological University, ${year}.`;
        }
        return `${author}. ${title}.${isTranslated && translator ? ` Translated by ${translator}.` : ''} ${edition}. ${place}: ${publisher}, ${year}.`;

      case 'harvard':
        if (isThesis) {
          return `${author}, ${year}. ${title}. Thesis. Thanlyin: Thanlyin Technological University.`;
        }
        return `${author}, ${year}. ${title}. ${edition}. ${place}: ${publisher}.`;

      case 'bibtex':
        const citeKey = `${author.split(' ').pop().toLowerCase()}${year}`;
        if (isThesis) {
          return `@thesis{${citeKey},
  title     = {${title}},
  author    = {${author}},
  school    = {Thanlyin Technological University},
  year      = {${year}},
  type      = {Graduation Thesis},
  note      = {Supervisor: ${supervisor || 'Faculty Advisor'}${studentRoll ? `, Roll: ${studentRoll}` : ''}}
}`;
        }
        return `@book{${citeKey},
  title     = {${title}},
  author    = {${author}},
  year      = {${year}},
  edition   = {${edition}},
  publisher = {${publisher}},
  address   = {${place}},
  isbn      = {${isbn}}
}`;

      case 'isbd':
        return `${author}. – ${title} [text] / by ${author}${isTranslated && translator ? ` ; translated by ${translator}` : ''}. – ${edition}. – ${place} : ${publisher}, ${year}. – ${pages} p. : ill. ; ${size}. – ISBN ${isbn}.`;

      default:
        return '';
    }
  };

  // Generate MARC 21 tags
  const marcTags = [
    { tag: 'LDR', ind1: ' ', ind2: ' ', sub: '', desc: 'Leader', content: '00000nam a2200000 i 4500' },
    { tag: '001', ind1: ' ', ind2: ' ', sub: '', desc: 'Control Number', content: book.id || 'TTU-LIB-REC' },
    { tag: '008', ind1: ' ', ind2: ' ', sub: '', desc: 'Fixed Length Data Elements', content: `${new Date().getFullYear().toString().slice(-2)}0101s${year}    xx      r     000 0 eng d` },
    ...(isbn !== 'N/A' ? [{ tag: '020', ind1: ' ', ind2: ' ', sub: '$a', desc: 'ISBN', content: isbn }] : []),
    { tag: '040', ind1: ' ', ind2: ' ', sub: '$a $b $c', desc: 'Cataloging Source', content: 'TTU-LIB $b eng $c TTU-LIB' },
    { tag: '082', ind1: '0', ind2: '4', sub: '$a', desc: 'Dewey Decimal Classification / Call No', content: classNo },
    { tag: '100', ind1: '1', ind2: ' ', sub: '$a', desc: 'Main Entry - Personal Name (Author)', content: `${author}${studentRoll ? ` (${studentRoll})` : ''}` },
    ...(isTranslated && originalTitle ? [{ tag: '240', ind1: '1', ind2: '0', sub: '$a', desc: 'Uniform / Original Title', content: `${originalTitle}${originalAuthor ? ` / ${originalAuthor}` : ''}` }] : []),
    { tag: '245', ind1: '1', ind2: '0', sub: '$a $c', desc: 'Title Statement & Responsibility', content: `${title} / $c by ${author}${isTranslated && translator ? ` ; translated by ${translator}` : ''}` },
    ...(!isThesis ? [{ tag: '250', ind1: ' ', ind2: ' ', sub: '$a', desc: 'Edition Statement', content: edition }] : []),
    { tag: isThesis ? '264' : '260', ind1: ' ', ind2: isThesis ? '0' : ' ', sub: '$a $b $c', desc: isThesis ? 'Production Statement' : 'Publication & Distribution (Imprint)', content: isThesis ? `Thanlyin : $b Thanlyin Technological University, $c ${year}` : `${place} : $b ${publisher}, $c ${year}` },
    { tag: '300', ind1: ' ', ind2: ' ', sub: '$a $c', desc: 'Physical Description (Collation)', content: `${pages} p. ; $c ${size}` },
    ...(isThesis ? [
      { tag: '502', ind1: ' ', ind2: ' ', sub: '$a $b $c $d', desc: 'Dissertation / Thesis Note', content: `Thesis (B.E./M.E.) -- Thanlyin Technological University, ${year}` },
      ...(supervisor ? [{ tag: '500', ind1: ' ', ind2: ' ', sub: '$a', desc: 'Supervisor Note', content: `Supervised by: ${supervisor}` }] : []),
    ] : []),
    ...(isTranslated ? [
      { tag: '500', ind1: ' ', ind2: ' ', sub: '$a', desc: 'Translation Note', content: `Translated from original: ${originalTitle || 'Original work'} by ${originalAuthor || author}` }
    ] : []),
    { tag: '520', ind1: '3', ind2: ' ', sub: '$a', desc: 'Summary / Scope Note', content: summary },
    { tag: '650', ind1: ' ', ind2: '0', sub: '$a', desc: 'Subject Heading - Topical Term', content: `${category} -- Academic & Reference Collection.` },
    ...(isTranslated && translator ? [{ tag: '700', ind1: '1', ind2: ' ', sub: '$a $e', desc: 'Added Entry - Translator', content: `${translator}, $e translator.` }] : []),
    ...(supervisor ? [{ tag: '700', ind1: '1', ind2: ' ', sub: '$a $e', desc: 'Added Entry - Advisor', content: `${supervisor}, $e advisor.` }] : []),
    { tag: '852', ind1: ' ', ind2: ' ', sub: '$a $b $h $p', desc: 'Location / Holdings Record', content: `Thanlyin Technological University Library $b Main Collection $h ${classNo}${copies.length > 0 ? ` $p ${copies.map(c => c.accession_no).join(', ')}` : ''}` }
  ];

  // Dublin Core Elements
  const dcElements = [
    { term: 'dc:title', label: 'Title', value: title },
    { term: 'dc:creator', label: 'Creator / Author', value: author },
    ...(isTranslated && translator ? [{ term: 'dc:contributor', label: 'Translator', value: translator }] : []),
    ...(supervisor ? [{ term: 'dc:contributor', label: 'Supervisor', value: supervisor }] : []),
    { term: 'dc:subject', label: 'Subject / Category', value: category },
    { term: 'dc:description', label: 'Description / Abstract', value: summary },
    { term: 'dc:publisher', label: 'Publisher', value: isThesis ? 'Thanlyin Technological University' : publisher },
    { term: 'dc:date', label: 'Date', value: year.toString() },
    { term: 'dc:type', label: 'Resource Type', value: isThesis ? 'Text / Academic Thesis' : 'Text / Monograph' },
    { term: 'dc:format', label: 'Physical Format', value: `${pages} pages; ${size}` },
    { term: 'dc:identifier', label: 'Identifier (ISBN / Call No)', value: `${isbn !== 'N/A' ? `ISBN:${isbn}, ` : ''}CallNo:${classNo}` },
    { term: 'dc:language', label: 'Language', value: isTranslated ? 'English (Translated)' : 'English / Burmese' },
    { term: 'dc:coverage', label: 'Spatial Coverage', value: place },
    { term: 'dc:rights', label: 'Rights Statement', value: 'TTU Library Academic Use & Circulation Policy' }
  ];

  const printCatalogCard = () => {
    window.print();
  };

  return (
    <div className="intl-catalog-container">
      {/* Header Bar */}
      <div className="intl-catalog-header">
        <div className="intl-catalog-title-group">
          <div className="intl-catalog-badge">
            <span className="intl-badge-icon">🏛️</span>
            <span>International Standard Library Catalog</span>
          </div>
          <span className="intl-catalog-standard-tag">ISBD / AACR2 / MARC 21 / RDA Compliant</span>
        </div>

        <div className="intl-catalog-actions">
          <button 
            className="intl-btn-action" 
            onClick={() => setShowCitationModal(true)}
            title="Cite this bibliographic record"
          >
            <span>📜</span> Cite Record
          </button>
          <button 
            className="intl-btn-action" 
            onClick={printCatalogCard}
            title="Print standard catalog card"
          >
            <span>🖨️</span> Print Card
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="intl-catalog-tabs">
        <button 
          className={`intl-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
          onClick={() => setActiveTab('card')}
        >
          <span className="tab-icon">🗂️</span> Standard Card (ISBD)
        </button>
        <button 
          className={`intl-tab-btn ${activeTab === 'bib' ? 'active' : ''}`}
          onClick={() => setActiveTab('bib')}
        >
          <span className="tab-icon">📋</span> Bibliographic Sheet
        </button>
        <button 
          className={`intl-tab-btn ${activeTab === 'marc' ? 'active' : ''}`}
          onClick={() => setActiveTab('marc')}
        >
          <span className="tab-icon">💻</span> MARC 21 Record
        </button>
        <button 
          className={`intl-tab-btn ${activeTab === 'dc' ? 'active' : ''}`}
          onClick={() => setActiveTab('dc')}
        >
          <span className="tab-icon">🌐</span> Dublin Core
        </button>
        <button 
          className={`intl-tab-btn ${activeTab === 'holdings' ? 'active' : ''}`}
          onClick={() => setActiveTab('holdings')}
        >
          <span className="tab-icon">📦</span> Holdings & Copies ({copies.length || 1})
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: STANDARD 3x5 LIBRARY CATALOG CARD (ISBD / AACR2 / RDA) */}
      {/* ============================================================ */}
      {activeTab === 'card' && (
        <div className="intl-card-wrapper">
          <div className="intl-catalog-card-paper">
            {/* Call Number in Upper Left */}
            <div className="intl-card-callno">
              <span className="callno-class">{classNo}</span>
              <span className="callno-author">{author.slice(0, 3).toUpperCase()}</span>
              <span className="callno-year">{year}</span>
            </div>

            {/* Main Content with standard library hanging indent */}
            <div className="intl-card-content">
              {/* Author Main Entry */}
              <div className="intl-card-author-entry">
                <strong>{author}</strong>
                {studentRoll && <span className="intl-card-roll"> (Roll: {studentRoll})</span>}
              </div>

              {/* Body: Title, Statement of responsibility, Edition, Imprint */}
              <div className="intl-card-body-text">
                <span className="intl-card-title">{title}</span>
                {isTranslated && originalTitle && (
                  <span className="intl-card-uniform-title"> [Original: {originalTitle}{originalAuthor ? ` by ${originalAuthor}` : ''}]</span>
                )}
                <span className="intl-card-responsibility"> / by {author}</span>
                {isTranslated && translator && (
                  <span className="intl-card-translator"> ; translated by {translator}</span>
                )}
                {isThesis && supervisor && (
                  <span className="intl-card-supervisor"> ; supervisor: {supervisor}</span>
                )}
                . — {!isThesis && <span className="intl-card-edition">{edition}. — </span>}
                <span className="intl-card-imprint">
                  {isThesis ? `Thanlyin : Thanlyin Technological University, ${year}` : `${place} : ${publisher}, ${year}`}
                </span>.
              </div>

              {/* Collation / Physical Description */}
              <div className="intl-card-collation">
                {pages} p. : ill. ; {size}.
              </div>

              {/* Notes Area */}
              <div className="intl-card-notes">
                {isThesis && (
                  <div className="card-note-item">
                    Thesis (Graduation) — Thanlyin Technological University, Department of {major || 'Engineering'}, {year}.
                  </div>
                )}
                {isTranslated && (
                  <div className="card-note-item">
                    Translated from the original language.
                  </div>
                )}
                <div className="card-note-summary">
                  <strong>Summary:</strong> {summary}
                </div>
              </div>

              {/* Standard Number */}
              {isbn !== 'N/A' && (
                <div className="intl-card-isbn">
                  ISBN {isbn}
                </div>
              )}

              {/* Subject Tracings (Standard Library Format) */}
              <div className="intl-card-tracings">
                <span className="tracing-num">1. </span>{category}.{' '}
                {isThesis && <><span className="tracing-num">2. </span>Academic dissertations -- Myanmar.{' '}</>}
                {isTranslated && translator && <><span className="tracing-roman">I. </span>{translator}, tr.{' '}</>}
                {supervisor && <><span className="tracing-roman">I. </span>{supervisor}, advisor.{' '}</>}
                <span className="tracing-roman">{supervisor || (isTranslated && translator) ? 'II. ' : 'I. '}</span>Title.
              </div>

              {/* Accession Numbers & Holdings Reference */}
              <div className="intl-card-holdings-bar">
                <div className="card-accession-tags">
                  <span className="acc-label">TTU Library Holdings:</span>
                  {copies.length > 0 ? (
                    copies.map((c, idx) => (
                      <span key={idx} className={`acc-pill ${c.status === 'available' ? 'acc-available' : 'acc-borrowed'}`}>
                        {c.accession_no} ({c.status})
                      </span>
                    ))
                  ) : (
                    <span className="acc-pill acc-available">ACC-PRIMARY (Available)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Standard Hole Punch Ring at Card Bottom */}
            <div className="intl-card-hole-punch" title="Standard 3x5 Library Index Card Hole Punch">
              <div className="hole-circle"></div>
            </div>
          </div>

          <div className="intl-card-footer-tip">
            <span>💡 Standard 3×5 inch format (ISBD/AACR2). Click <strong>Print Card</strong> to generate an archival shelf card.</span>
            <button 
              className="intl-copy-mini-btn" 
              onClick={() => handleCopy(getCitation('isbd'), 'isbd-card')}
            >
              {copiedKey === 'isbd-card' ? '✓ Copied ISBD' : '📋 Copy ISBD Text'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: STRUCTURED BIBLIOGRAPHIC SPECIFICATION SHEET */}
      {/* ============================================================ */}
      {activeTab === 'bib' && (
        <div className="intl-bib-sheet">
          <div className="bib-sheet-grid">
            {/* Area 1: Control & Classification */}
            <div className="bib-section-card">
              <div className="bib-section-header">
                <span className="bib-area-badge">Area 0</span>
                <h4>Classification & Control Identifiers</h4>
              </div>
              <div className="bib-table">
                <div className="bib-row">
                  <span className="bib-label">Classification / Call No.</span>
                  <span className="bib-value callout-value">{classNo}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">International Standard Book No. (ISBN)</span>
                  <span className="bib-value mono-value">{isbn}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Library Catalog System</span>
                  <span className="bib-value">TTU Central Integrated Library System (ILS)</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Cataloging Standard</span>
                  <span className="bib-value">ISBD / AACR2 Rev. / RDA / MARC 21</span>
                </div>
              </div>
            </div>

            {/* Area 2: Title & Statement of Responsibility */}
            <div className="bib-section-card">
              <div className="bib-section-header">
                <span className="bib-area-badge">Area 1</span>
                <h4>Title & Statement of Responsibility</h4>
              </div>
              <div className="bib-table">
                <div className="bib-row">
                  <span className="bib-label">Title Proper</span>
                  <span className="bib-value font-title">{title}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Primary Author / Creator</span>
                  <span className="bib-value"><strong>{author}</strong></span>
                </div>
                {studentRoll && (
                  <div className="bib-row">
                    <span className="bib-label">Student Roll Number</span>
                    <span className="bib-value mono-value">{studentRoll}</span>
                  </div>
                )}
                {isTranslated && (
                  <>
                    <div className="bib-row">
                      <span className="bib-label">Translation Status</span>
                      <span className="bib-value translation-badge">✓ Translated Work</span>
                    </div>
                    {originalTitle && (
                      <div className="bib-row">
                        <span className="bib-label">Original Title</span>
                        <span className="bib-value italic-value">{originalTitle}</span>
                      </div>
                    )}
                    {originalAuthor && (
                      <div className="bib-row">
                        <span className="bib-label">Original Author</span>
                        <span className="bib-value">{originalAuthor}</span>
                      </div>
                    )}
                    {translator && (
                      <div className="bib-row">
                        <span className="bib-label">Translator(s)</span>
                        <span className="bib-value">{translator}</span>
                      </div>
                    )}
                  </>
                )}
                {supervisor && (
                  <div className="bib-row">
                    <span className="bib-label">Supervisor / Faculty Advisor</span>
                    <span className="bib-value">{supervisor}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Area 3: Edition & Publication (Imprint) */}
            <div className="bib-section-card">
              <div className="bib-section-header">
                <span className="bib-area-badge">Area 2 & 4</span>
                <h4>Edition & Imprint (Publication Details)</h4>
              </div>
              <div className="bib-table">
                {!isThesis && (
                  <div className="bib-row">
                    <span className="bib-label">Edition Statement</span>
                    <span className="bib-value">{edition}</span>
                  </div>
                )}
                <div className="bib-row">
                  <span className="bib-label">Place of Publication</span>
                  <span className="bib-value">{place}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Publisher / Institution</span>
                  <span className="bib-value">{isThesis ? 'Thanlyin Technological University' : publisher}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Year of Publication</span>
                  <span className="bib-value">{year}</span>
                </div>
              </div>
            </div>

            {/* Area 4: Physical Description & Subject */}
            <div className="bib-section-card">
              <div className="bib-section-header">
                <span className="bib-area-badge">Area 5 & 6</span>
                <h4>Physical Description & Subject Heading</h4>
              </div>
              <div className="bib-table">
                <div className="bib-row">
                  <span className="bib-label">Extent / Pagination</span>
                  <span className="bib-value">{pages} pages</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Dimensions / Size</span>
                  <span className="bib-value">{size}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Subject Classification</span>
                  <span className="bib-value category-pill">{category}</span>
                </div>
                <div className="bib-row">
                  <span className="bib-label">Document Type</span>
                  <span className="bib-value">{isThesis ? 'Academic Thesis / Dissertation' : 'Monograph / Print Book'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Area 5: Summary & Scope */}
          <div className="bib-section-card full-width">
            <div className="bib-section-header">
              <span className="bib-area-badge">Area 7</span>
              <h4>Abstract & Bibliographic Notes</h4>
            </div>
            <div className="bib-notes-body">
              <p className="bib-summary-text">{summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MARC 21 BIBLIOGRAPHIC FORMAT RECORD */}
      {/* ============================================================ */}
      {activeTab === 'marc' && (
        <div className="intl-marc-view">
          <div className="marc-toolbar">
            <div className="marc-info">
              <strong>MARC 21 Bibliographic Record</strong>
              <span>Format: Machine-Readable Cataloging (ISO 2709 / MARC21)</span>
            </div>
            <button 
              className="intl-copy-mini-btn"
              onClick={() => {
                const marcText = marcTags.map(m => `${m.tag} ${m.ind1}${m.ind2} ${m.content}`).join('\n');
                handleCopy(marcText, 'marc-all');
              }}
            >
              {copiedKey === 'marc-all' ? '✓ Copied MARC 21' : '📋 Copy MARC 21'}
            </button>
          </div>

          <div className="marc-table-container">
            <table className="marc-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Tag</th>
                  <th style={{ width: '60px' }}>Ind</th>
                  <th style={{ width: '180px' }}>Field Name</th>
                  <th>Data Content (Subfields)</th>
                </tr>
              </thead>
              <tbody>
                {marcTags.map((m, idx) => (
                  <tr key={idx} className={m.tag === 'LDR' || m.tag.startsWith('00') ? 'marc-control-row' : ''}>
                    <td className="marc-tag">
                      <span className="tag-pill">{m.tag}</span>
                    </td>
                    <td className="marc-ind">
                      <span className="ind-code">{m.ind1 === ' ' ? '#' : m.ind1}{m.ind2 === ' ' ? '#' : m.ind2}</span>
                    </td>
                    <td className="marc-desc">{m.desc}</td>
                    <td className="marc-content">
                      {m.content.split(/(\$[a-z0-9])/g).map((part, pIdx) => {
                        if (part.startsWith('$')) {
                          return <span key={pIdx} className="subfield-delimiter">{part}</span>;
                        }
                        return <span key={pIdx}>{part}</span>;
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: DUBLIN CORE METADATA (DCMI) */}
      {/* ============================================================ */}
      {activeTab === 'dc' && (
        <div className="intl-dc-view">
          <div className="marc-toolbar">
            <div className="marc-info">
              <strong>Dublin Core Metadata Element Set (ISO 15836)</strong>
              <span>Standard for digital cross-repository indexing and open archives</span>
            </div>
            <button 
              className="intl-copy-mini-btn"
              onClick={() => {
                const dcText = dcElements.map(dc => `<meta name="${dc.term}" content="${dc.value}" />`).join('\n');
                handleCopy(dcText, 'dc-meta');
              }}
            >
              {copiedKey === 'dc-meta' ? '✓ Copied Meta Tags' : '📋 Copy HTML Meta Tags'}
            </button>
          </div>

          <div className="dc-table-container">
            <table className="dc-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Dublin Core Term</th>
                  <th style={{ width: '200px' }}>Element Label</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {dcElements.map((dc, idx) => (
                  <tr key={idx}>
                    <td className="dc-term mono-value">{dc.term}</td>
                    <td className="dc-label">{dc.label}</td>
                    <td className="dc-value">{dc.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: HOLDINGS & ACCESSION INVENTORY */}
      {/* ============================================================ */}
      {activeTab === 'holdings' && (
        <div className="intl-holdings-view">
          <div className="holdings-header-stats">
            <div className="holding-stat-card">
              <span className="holding-stat-label">Total Copies</span>
              <span className="holding-stat-val">{copies.length || 1}</span>
            </div>
            <div className="holding-stat-card">
              <span className="holding-stat-label">Available on Shelf</span>
              <span className="holding-stat-val available-text">
                {copies.length > 0 ? copies.filter(c => c.status === 'available').length : (book.availableCopies ?? 1)}
              </span>
            </div>
            <div className="holding-stat-card">
              <span className="holding-stat-label">Currently Borrowed</span>
              <span className="holding-stat-val borrowed-text">
                {copies.length > 0 ? copies.filter(c => c.status === 'borrowed').length : (book.borrowedCopies ?? 0)}
              </span>
            </div>
            <div className="holding-stat-card">
              <span className="holding-stat-label">Location / Stacks</span>
              <span className="holding-stat-val">Central Library (Zone A)</span>
            </div>
          </div>

          <div className="holdings-table-container">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Accession No.</th>
                  <th>Status</th>
                  <th>Call Number</th>
                  <th>Acquisition Date</th>
                  <th>Price / Value</th>
                  <th>How Obtained</th>
                  <th>Remarks / Condition</th>
                </tr>
              </thead>
              <tbody>
                {copies.length > 0 ? (
                  copies.map((c, idx) => (
                    <tr key={idx}>
                      <td className="mono-value bold-text">
                        <span className="barcode-icon">🏷️</span> {c.accession_no}
                      </td>
                      <td>
                        <span className={`status-badge-pill ${c.status === 'available' ? 'badge-available' : 'badge-borrowed'}`}>
                          {c.status === 'available' ? '● Available' : '○ On Loan'}
                        </span>
                      </td>
                      <td className="mono-value">{classNo}</td>
                      <td>{c.date_acquired || 'Recorded'}</td>
                      <td>{c.price ? `${Number(c.price).toLocaleString()} MMK` : '—'}</td>
                      <td>{c.how_obtained || 'Library Purchase'}</td>
                      <td className="remark-cell">{c.remark || 'Good Condition'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="mono-value bold-text"><span className="barcode-icon">🏷️</span> ACC-PRIMARY-01</td>
                    <td><span className="status-badge-pill badge-available">● Available</span></td>
                    <td className="mono-value">{classNo}</td>
                    <td>Cataloged</td>
                    <td>Standard</td>
                    <td>University Acquisition</td>
                    <td className="remark-cell">Master Archive Copy</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CITATION MODAL */}
      {/* ============================================================ */}
      {showCitationModal && (
        <div className="citation-modal-overlay" onClick={() => setShowCitationModal(false)}>
          <div className="citation-modal" onClick={e => e.stopPropagation()}>
            <div className="citation-modal-header">
              <div className="citation-modal-title">
                <span>📜</span>
                <h3>Cite Bibliographic Record</h3>
              </div>
              <button className="citation-close-btn" onClick={() => setShowCitationModal(false)}>×</button>
            </div>

            <div className="citation-modal-body">
              <p className="citation-subtitle">Select citation style to format this bibliographic record:</p>

              {/* Style selector pills */}
              <div className="citation-style-selector">
                {[
                  { id: 'apa', label: 'APA 7th' },
                  { id: 'mla', label: 'MLA 9th' },
                  { id: 'chicago', label: 'Chicago 17th' },
                  { id: 'harvard', label: 'Harvard' },
                  { id: 'bibtex', label: 'BibTeX' },
                  { id: 'isbd', label: 'ISBD' }
                ].map(style => (
                  <button
                    key={style.id}
                    className={`citation-style-pill ${citationFormat === style.id ? 'active' : ''}`}
                    onClick={() => setCitationFormat(style.id)}
                  >
                    {style.label}
                  </button>
                ))}
              </div>

              {/* Citation Preview Box */}
              <div className="citation-preview-box">
                <pre className="citation-text">{getCitation(citationFormat)}</pre>
              </div>

              <div className="citation-modal-actions">
                <button 
                  className="citation-copy-btn"
                  onClick={() => handleCopy(getCitation(citationFormat), 'citation-modal')}
                >
                  {copiedKey === 'citation-modal' ? '✓ Copied to Clipboard!' : '📋 Copy Citation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InternationalCatalogCard;
