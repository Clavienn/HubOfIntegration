import { Router } from 'express';
import { IngestController } from '../controllers/ingest.controller';
import { validateIngestRequest } from '../middlewares/validation.middleware';

const router = Router();
const ingestController = new IngestController();

router.post('/', validateIngestRequest, ingestController.ingest.bind(ingestController));
router.get('/:id/status', ingestController.getMessageStatus.bind(ingestController));
router.post('/:id/replay', ingestController.replayMessage.bind(ingestController));

export default router;