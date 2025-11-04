import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
import { validateRequest } from '../middleware/validate-request';
import { authenticateToken } from '../middleware/auth';
import { assetService } from '../services/asset';
import { Types } from 'mongoose';
import { AssetType } from '../models/Asset';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

// Extend Express Request type to include file from multer
declare global {
    namespace Express {
        interface Request {
            file?: Express.Multer.File;
        }
    }
}

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: async function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yuga-'));
            cb(null, tempDir);
        },
        filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Validation middleware
const createAssetValidation = [
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('type').isIn(Object.values(AssetType)),
    body('project').isMongoId(),
    body('tags').optional().isArray(),
    validateRequest
];

const updateAssetValidation = [
    body('name').optional().trim().notEmpty().isLength({ max: 255 }),
    body('tags').optional().isArray(),
    body('metadata').optional().isObject(),
    validateRequest
];

// Routes
router.post('/',
    authenticateToken,
    upload.single('file'),
    createAssetValidation,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const asset = await assetService.create({
                name: req.body.name,
                type: req.body.type,
                filePath: req.file.path,
                owner: new Types.ObjectId(req.user.id),
                project: new Types.ObjectId(req.body.project),
                tags: req.body.tags
            });

            // Cleanup temp file after upload
            await fs.unlink(req.file.path);

            res.status(201).json(asset);
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id',
    authenticateToken,
    updateAssetValidation,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const asset = await assetService.update(
                req.params.id,
                new Types.ObjectId(req.user.id),
                req.body
            );
            res.json(asset);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await assetService.delete(
                req.params.id,
                new Types.ObjectId(req.user.id)
            );
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const asset = await assetService.findById(
                req.params.id,
                new Types.ObjectId(req.user.id)
            );
            res.json(asset);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                page,
                limit,
                search,
                type,
                project,
                tags
            } = req.query;

            const result = await assetService.findAll({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                search: search as string,
                type: type as AssetType,
                project: project ? new Types.ObjectId(project as string) : undefined,
                tags: tags ? (tags as string).split(',') : undefined
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:id/download',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const downloadUrl = await assetService.generateDownloadUrl(
                req.params.id,
                new Types.ObjectId(req.user.id)
            );
            res.json({ downloadUrl });
        } catch (error) {
            next(error);
        }
    }
);

export { router as assetRouter };