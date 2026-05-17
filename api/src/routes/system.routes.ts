import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';
import { validateSystemConfig } from '../middlewares/validation.middleware';

const router = Router();
const systemController = new SystemController();

router.get('/', systemController.getSystems.bind(systemController));
router.post('/', validateSystemConfig, systemController.createSystem.bind(systemController));
router.get('/:id', systemController.getSystemById.bind(systemController));
router.put('/:id', validateSystemConfig, systemController.updateSystem.bind(systemController));
router.patch('/:id/enable', systemController.enableSystem.bind(systemController));
router.patch('/:id/disable', systemController.disableSystem.bind(systemController));
router.delete('/:id', systemController.deleteSystem.bind(systemController));
router.post('/:id/rotate-key', systemController.rotateApiKey.bind(systemController));
router.post('/:id/test-webhook', systemController.testWebhook.bind(systemController));

export default router;