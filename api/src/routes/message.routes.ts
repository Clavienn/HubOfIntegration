import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';

const router = Router();
const messageController = new MessageController();

router.get('/', messageController.getMessages.bind(messageController));
router.get('/dead-letter', messageController.getDeadLetterMessages.bind(messageController));
router.get('/statistics', messageController.getStatistics.bind(messageController));
router.get('/:id', messageController.getMessageById.bind(messageController));

export default router;