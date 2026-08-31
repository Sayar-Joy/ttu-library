import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import * as thesisService from '../services/thesisService.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Admin client for storage uploads
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  }
);

const BUCKET_NAME = 'theses';
export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

// Local upload storage directory
const LOCAL_UPLOADS_DIR = join(__dirname, '..', '..', 'public', 'uploads', 'theses');
function ensureLocalUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

/**
 * POST /api/upload/thesis-pdf
 * Uploads a thesis PDF, extracts the first 10 pages into a preview PDF,
 * and uploads to Supabase storage with local fallback.
 */
export async function uploadThesisPdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided. Please upload a file with field name "file" or "pdf".',
      });
    }

    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF documents are allowed for Thesis upload.',
      });
    }

    const fullPdfBuffer = req.file.buffer;
    let totalPages = 10;
    let previewPdfBytes;

    try {
      // Load the full PDF document using pdf-lib
      const pdfDoc = await PDFDocument.load(fullPdfBuffer, { ignoreEncryption: true });
      totalPages = pdfDoc.getPageCount();

      // Create a 10-page preview document
      const previewPdfDoc = await PDFDocument.create();
      const pagesToCopy = Math.min(10, totalPages);
      const pageIndices = Array.from({ length: pagesToCopy }, (_, i) => i);
      const copiedPages = await previewPdfDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => previewPdfDoc.addPage(page));

      previewPdfBytes = await previewPdfDoc.save();
    } catch (pdfErr) {
      console.error('Error processing PDF with pdf-lib:', pdfErr);
      return res.status(422).json({
        success: false,
        message: 'Failed to process PDF document. The file may be password-protected or corrupted.',
      });
    }

    const previewBuffer = Buffer.from(previewPdfBytes);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullFileName = `full_${uniqueSuffix}.pdf`;
    const previewFileName = `preview_10pages_${uniqueSuffix}.pdf`;

    // Save local copy in public/uploads/theses/ as a reliable fallback
    try {
      ensureLocalUploadsDir();
      fs.writeFileSync(join(LOCAL_UPLOADS_DIR, fullFileName), fullPdfBuffer);
      fs.writeFileSync(join(LOCAL_UPLOADS_DIR, previewFileName), previewBuffer);
    } catch (localWriteErr) {
      console.warn('Could not save local PDF copy:', localWriteErr.message);
    }

    let fullPdfUrl = `/uploads/theses/${fullFileName}`;
    let previewPdfUrl = `/uploads/theses/${previewFileName}`;

    // Upload to Supabase Storage 'theses' bucket
    try {
      const [fullUpload, previewUpload] = await Promise.all([
        supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(`full/${fullFileName}`, fullPdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,
          }),
        supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(`preview/${previewFileName}`, previewBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,
          }),
      ]);

      if (!fullUpload.error) {
        const { data: fullUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(`full/${fullFileName}`);
        if (fullUrlData?.publicUrl) fullPdfUrl = fullUrlData.publicUrl;
      }

      if (!previewUpload.error) {
        const { data: previewUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(`preview/${previewFileName}`);
        if (previewUrlData?.publicUrl) previewPdfUrl = previewUrlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('Supabase storage upload warning (using local fallback URL):', storageErr.message);
    }

    const previewPagesCount = Math.min(10, totalPages);

    return res.status(201).json({
      success: true,
      message: `Thesis PDF uploaded successfully. Generated ${previewPagesCount}-page preview.`,
      data: {
        fullPdfUrl,
        previewPdfUrl,
        totalPages,
        previewPagesCount,
        originalName: req.file.originalname,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    console.error('Unexpected error in uploadThesisPdf:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing thesis PDF upload.',
    });
  }
}

/**
 * POST /api/admin/theses
 * Admin creates a new thesis book record.
 */
export async function createThesisHandler(req, res) {
  try {
    const {
      title,
      author,
      student_roll,
      major,
      year,
      supervisor,
      abstract,
      pdf_url,
      preview_pdf_url,
      cover_url,
      total_pages,
      preview_pages_count,
      accession_no,
    } = req.body;

    if (!title || !author || !student_roll || !major || !year) {
      return res.status(400).json({
        success: false,
        message: 'Title, Student Author, Student Roll, Major, and Year are required fields.',
      });
    }

    const newThesis = await thesisService.createThesis({
      title,
      author,
      student_roll,
      major,
      year,
      supervisor,
      abstract,
      pdf_url,
      preview_pdf_url,
      cover_url,
      total_pages,
      preview_pages_count,
      accession_no,
    });

    return res.status(201).json({
      success: true,
      message: 'Thesis created successfully.',
      thesis: newThesis,
    });
  } catch (err) {
    console.error('Error creating thesis:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create thesis record.',
    });
  }
}

/**
 * GET /api/theses or GET /api/admin/theses
 * List all theses with optional filtering and search.
 */
export async function getThesesHandler(req, res) {
  try {
    const { major, year, search, limit, page } = req.query;
    const result = await thesisService.getAllTheses({
      major,
      year,
      search,
      limit,
      page,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Error fetching theses:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve theses.',
    });
  }
}

/**
 * GET /api/theses/:id
 * Retrieve a single thesis record by ID.
 */
export async function getThesisByIdHandler(req, res) {
  try {
    const thesis = await thesisService.getThesisById(req.params.id);
    if (!thesis) {
      return res.status(404).json({
        success: false,
        message: 'Thesis not found.',
      });
    }

    return res.json({
      success: true,
      thesis,
    });
  } catch (err) {
    console.error('Error getting thesis by id:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve thesis details.',
    });
  }
}

/**
 * PATCH /api/admin/theses/:id
 * Update an existing thesis record.
 */
export async function updateThesisHandler(req, res) {
  try {
    const updated = await thesisService.updateThesis(req.params.id, req.body);
    return res.json({
      success: true,
      message: 'Thesis updated successfully.',
      thesis: updated,
    });
  } catch (err) {
    console.error('Error updating thesis:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update thesis.',
    });
  }
}

/**
 * DELETE /api/admin/theses/:id
 * Delete a thesis record.
 */
export async function deleteThesisHandler(req, res) {
  try {
    const result = await thesisService.deleteThesis(req.params.id);
    return res.json({
      success: true,
      message: 'Thesis deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting thesis:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete thesis.',
    });
  }
}

/**
 * GET /api/admin/theses-stats
 * Returns breakdown of theses by major and year.
 */
export async function getThesisStatsHandler(req, res) {
  try {
    const stats = await thesisService.getThesisStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    console.error('Error getting thesis stats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve thesis statistics.',
    });
  }
}
