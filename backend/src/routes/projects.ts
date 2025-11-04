// Project routes
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { projectValidator } from '../validators/project';
import { ProjectController } from '../controllers/project';

const router = Router();
const controller = new ProjectController();

// List projects
router.get('/',
  authenticate,
  controller.listProjects
);

// Get single project
router.get('/:id',
  authenticate,
  controller.getProject
);

// Create project
router.post('/',
  authenticate,
  projectValidator,
  controller.createProject
);

// Update project
router.put('/:id',
  authenticate,
  projectValidator,
  controller.updateProject
);

// Delete project
router.delete('/:id',
  authenticate,
  controller.deleteProject
);

export const projectsRouter = router;