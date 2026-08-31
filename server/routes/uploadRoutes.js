import { Router } from 'express';
import multer from 'multer';
import { verifyLibrarian } from '../middleware/verifyLibrarian.js';
import { uploadBookCover, MAX_FILE_SIZE } from '../controllers/uploadController.js';
import { uploadThesisPdf, MAX_PDF_SIZE } from '../controllers/thesisController.js';

const router = Router();

// ============================================================
// Multer Configuration
// ============================================================

const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,   // 10 MB for covers
  },
});

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE,    // 50 MB for Thesis PDFs
  },
});

// ============================================================
// Multer error-handling middleware
// ============================================================

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Please upload a smaller file.`,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  next(err);
}

// ============================================================
// Routes
// ============================================================

router.use(verifyLibrarian);

// POST /api/upload/book-cover
router.post(
  '/book-cover',
  uploadCover.single('cover'),
  handleMulterError,
  uploadBookCover,
);

// POST /api/upload/thesis-pdf
// Accepts "file" or "pdf"
router.post(
  '/thesis-pdf',
  uploadPdf.single('file'),
  handleMulterError,
  uploadThesisPdf,
);

export default router;

