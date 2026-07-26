import { Router } from 'express';
import multer from 'multer';
import { verifyLibrarian } from '../middleware/verifyLibrarian.js';
import { uploadBookCover, MAX_FILE_SIZE } from '../controllers/uploadController.js';

const router = Router();

// ============================================================
// Multer Configuration
// ============================================================
// Use memoryStorage so the file lives as a Buffer in req.file.buffer.
// This avoids writing temp files to disk and lets us pipe the buffer
// directly into Sharp for processing.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,   // 10 MB — matches raw camera photo sizes
  },
});

// ============================================================
// Multer error-handling middleware
// ============================================================
// Multer throws specific error codes (e.g. LIMIT_FILE_SIZE) that we
// translate into user-friendly JSON responses instead of Express's
// default HTML error page.

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
      });
    }
    // Other multer errors (LIMIT_UNEXPECTED_FILE, etc.)
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // Not a multer error — pass it along
  next(err);
}

// ============================================================
// Routes
// ============================================================

/**
 * Upload Routes
 * ─────────────
 * All routes below are protected by the `verifyLibrarian` middleware.
 * 
 * Base path: /api/upload
 */

// Apply verifyLibrarian to ALL routes on this router
router.use(verifyLibrarian);

// POST /api/upload/book-cover
// Upload and optimise a book cover image.
// Expects a multipart/form-data request with a single file field named "cover".
router.post(
  '/book-cover',
  upload.single('cover'),    // Accept one file under the "cover" field
  handleMulterError,         // Catch multer-specific errors
  uploadBookCover,           // Process, upload, and return the public URL
);

export default router;
