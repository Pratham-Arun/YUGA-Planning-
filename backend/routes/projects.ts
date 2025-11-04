import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validate-request';
import { projectService } from '../services/project';
import { authenticateToken } from '../middleware/auth';
import { Types } from 'mongoose';

const router = Router();

// Validation middleware
const projectValidation = [
    body('name')
        .trim()
        .notEmpty()
        .isLength({ min: 1, max: 100 })
        .withMessage('Project name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('settings')
        .optional()
        .isObject()
        .withMessage('Settings must be an object'),
    validateRequest
];

// Routes
router.post('/',
    authenticateToken,
    projectValidation,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const project = await projectService.create({
                ...req.body,
                owner: new Types.ObjectId(req.user.id)
            });
            res.status(201).json(project);
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:id',
    authenticateToken,
    projectValidation,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const project = await projectService.update(
                req.params.id,
                new Types.ObjectId(req.user.id),
                req.body
            );
            res.json(project);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await projectService.delete(
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
            const project = await projectService.findById(
                req.params.id,
                new Types.ObjectId(req.user.id)
            );
            res.json(project);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/',
    authenticateToken,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString(),
        query('tags').optional().isString(),
        validateRequest
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit, search, tags } = req.query;
            const result = await projectService.findAll({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                search: search as string,
                tags: tags ? (tags as string).split(',') : undefined,
                owner: new Types.ObjectId(req.user.id)
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/:id/collaborators/:userId',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const project = await projectService.addCollaborator(
                req.params.id,
                new Types.ObjectId(req.user.id),
                new Types.ObjectId(req.params.userId)
            );
            res.json(project);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id/collaborators/:userId',
    authenticateToken,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const project = await projectService.removeCollaborator(
                req.params.id,
                new Types.ObjectId(req.user.id),
                new Types.ObjectId(req.params.userId)
            );
            res.json(project);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/:id/duplicate',
    authenticateToken,
    [
        body('newName')
            .trim()
            .notEmpty()
            .isLength({ min: 1, max: 100 })
            .withMessage('New project name must be between 1 and 100 characters'),
        validateRequest
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const project = await projectService.duplicate(
                req.params.id,
                new Types.ObjectId(req.user.id),
                req.body.newName
            );
            res.status(201).json(project);
        } catch (error) {
            next(error);
        }
    }
);

export { router as projectRouter };