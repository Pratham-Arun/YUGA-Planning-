import { Router } from 'express';
import { compileController } from '../controllers/compile';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/:projectId', compileController.compileProject);
router.get('/:projectId/status/:jobId', compileController.getCompileStatus);
router.get('/:projectId/logs/:jobId', compileController.getCompileLogs);

export const compileRouter = router;