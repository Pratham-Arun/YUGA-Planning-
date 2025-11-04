import { Router } from 'express';
import { assetsController } from '../controllers/assets';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/:projectId', assetsController.listAssets);
router.post('/:projectId/upload', assetsController.uploadAsset);
router.delete('/:projectId/:assetId', assetsController.deleteAsset);
router.get('/:projectId/:assetId/download', assetsController.downloadAsset);

export const assetsRouter = router;