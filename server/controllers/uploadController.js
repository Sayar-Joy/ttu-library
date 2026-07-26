import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

// We create a fresh, dedicated admin client for uploads.
// Using the global client from '../supabase.js' can cause RLS 403 errors
// because the global client's internal auth state gets mutated when
// users call the /api/auth/login endpoint on the backend.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  }
);

// ============================================================
// Constants
// ============================================================

/** Supabase Storage bucket where processed cover images are stored. */
const BUCKET_NAME = 'book-covers';

/** Maximum width (px) for resized images. Height scales proportionally. */
const MAX_WIDTH = 500;

/** WebP compression quality (1–100). 80 is a good balance of size vs. clarity. */
const WEBP_QUALITY = 80;

/** Allowed MIME types for uploaded images. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/bmp',
]);

/** Maximum raw upload size (10 MB). Enforced by multer. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// Controller: uploadBookCover
// ============================================================

/**
 * POST /api/admin/upload/book-cover
 *
 * Accepts a single image upload (field name: "cover"), processes it
 * through Sharp (resize + WebP conversion + compression), then stores
 * the optimised buffer in the Supabase "book-covers" bucket.
 *
 * Returns the public URL so the caller can persist it alongside the
 * book record in the database.
 *
 * Response on success (201):
 * {
 *   success: true,
 *   message: "Book cover uploaded successfully.",
 *   data: {
 *     path:      "covers/1721808000000.webp",
 *     publicUrl: "https://<project>.supabase.co/storage/v1/object/public/book-covers/covers/1721808000000.webp"
 *   }
 * }
 */
export async function uploadBookCover(req, res) {
  try {
    // ── 1. Validate that a file was provided ──────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image with the field name "cover".',
      });
    }

    // ── 2. Validate MIME type ─────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type "${req.file.mimetype}". Allowed types: JPEG, PNG, WebP, GIF, TIFF, BMP.`,
      });
    }

    // ── 3. Process image with Sharp ───────────────────────────
    //    • Resize to a max width of 500 px (aspect ratio preserved).
    //    • Convert to WebP format for smaller file sizes.
    //    • Compress at quality 80 for a good size/quality trade-off.
    let optimisedBuffer;

    try {
      optimisedBuffer = await sharp(req.file.buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (sharpError) {
      console.error('❌ Sharp processing error:', sharpError);
      return res.status(422).json({
        success: false,
        message: 'Failed to process the image. The file may be corrupt or in an unsupported format.',
      });
    }

    // ── 4. Generate a unique filename ─────────────────────────
    //    Using a timestamp + random suffix to guarantee uniqueness
    //    even under concurrent uploads.
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `covers/${uniqueSuffix}.webp`;

    // ── 5. Upload the optimised buffer to Supabase Storage ────
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, optimisedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',      // Cache for 1 hour
        upsert: false,             // Never overwrite existing files
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(502).json({
        success: false,
        message: 'Failed to upload the image to cloud storage. Please try again later.',
      });
    }

    // ── 6. Retrieve the public URL ────────────────────────────
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('❌ Could not retrieve public URL for path:', filePath);
      return res.status(500).json({
        success: false,
        message: 'Image was uploaded but the public URL could not be generated.',
      });
    }

    // ── 7. Return the result ──────────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Book cover uploaded successfully.',
      data: {
        path: filePath,
        publicUrl: urlData.publicUrl,
      },
    });
  } catch (error) {
    // Catch-all for truly unexpected errors
    console.error('❌ Unexpected error in uploadBookCover:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while uploading the book cover.',
    });
  }
}
