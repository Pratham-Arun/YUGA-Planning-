// AI Generation Router
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { generateValidator } from '../validators/ai';
import { AIController } from '../controllers/ai';

const router = Router();
const controller = new AIController();

// Route definitions
router.post('/generate',
  authenticate,
  generateValidator,
  controller.generate
);

router.get('/job/:jobId',
  authenticate,
  controller.getJobStatus
);

router.post('/debug',
  authenticate,
  controller.debug
);

export const aiRouter = router;