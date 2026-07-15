import { Router } from 'express';
import { verifyLibrarian } from '../middleware/verifyLibrarian.js';

// ── Controllers ───────────────────────────────────────────────
import { getAllUsers, getUserDetails } from '../controllers/adminUserController.js';
import { addBookRecord, addPhysicalCopy, getInventoryStatus, updateCopyStatus } from '../controllers/adminCatalogController.js';
import { processReturn, markFinePaid } from '../controllers/adminTransactionController.js';

const router = Router();

/**
 * Admin / Librarian Routes
 * ────────────────────────
 * All routes below are protected by the `verifyLibrarian` middleware.
 * The middleware verifies the Supabase Auth JWT and confirms the
 * caller's role is 'librarian' in the `users` table.
 *
 * Base path: /api/admin
 */

// Apply verifyLibrarian to ALL routes on this router
router.use(verifyLibrarian);

// ============================================================
// User Management
// ============================================================

// GET /api/admin/users
// Fetch all students with active borrow counts
// Query params: ?search=<name|id|email>&page=1&limit=50
router.get('/users', getAllUsers);

// GET /api/admin/users/:userId
// Fetch a specific student's profile, active borrows, and unpaid fines
router.get('/users/:userId', getUserDetails);

// ============================================================
// Catalog & Inventory Management
// ============================================================

// POST /api/admin/books
// Add a new book record to the catalog
// Body: { title, author, isbn?, publisher?, edition?, publication_year?, class_no?, cover_url? }
router.post('/books', addBookRecord);

// POST /api/admin/physical-copies
// Add a new physical copy to inventory
// Body: { accession_no, book_id, date_acquired?, price?, how_obtained?, remark?, status? }
router.post('/physical-copies', addPhysicalCopy);

// GET /api/admin/inventory
// Fetch paginated inventory list with book details
// Query params: ?status=available|borrowed|lost|maintenance&search=<title|author>&page=1&limit=25
router.get('/inventory', getInventoryStatus);

// PATCH /api/admin/physical-copies/:accessionNo/status
// Manually change a physical copy's status
// Body: { status: 'available' | 'borrowed' | 'lost' | 'maintenance' }
router.patch('/physical-copies/:accessionNo/status', updateCopyStatus);

// ============================================================
// Transaction & Fine Management
// ============================================================

// POST /api/admin/returns/:accessionNo
// Process a book return by accession number
// Calculates fine, updates transaction, marks copy as available
router.post('/returns/:accessionNo', processReturn);

// PATCH /api/admin/fines/:transactionId/pay
// Mark a transaction's fine as paid
router.patch('/fines/:transactionId/pay', markFinePaid);

export default router;
