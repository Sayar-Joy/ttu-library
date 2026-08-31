import { Router } from 'express';
import { getThesesHandler, getThesisByIdHandler } from '../controllers/thesisController.js';

const router = Router();

// GET /api/theses - List theses (with ?major=&year=&search=&limit=&page=)
router.get('/', getThesesHandler);

// GET /api/theses/:id - Get single thesis details
router.get('/:id', getThesisByIdHandler);

export default router;
