import { Router } from 'express';
import { gitController } from '../controllers/git';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/:projectId/init', gitController.initRepo);
router.post('/:projectId/commit', gitController.commit);
router.post('/:projectId/push', gitController.push);
router.get('/:projectId/status', gitController.status);
router.get('/:projectId/log', gitController.log);

export const gitRouter = router;