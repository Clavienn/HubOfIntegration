// src/routes/route.routes.ts
import { Router } from 'express';
import { RouteController } from '../controllers/route.controller';
import { validateRoute } from '../middlewares/validation.middleware';

const router = Router();
const routeController = new RouteController();


router.patch('/action/:id/enable', routeController.enableRoute.bind(routeController));
router.patch('/action/:id/disable', routeController.disableRoute.bind(routeController));


// Routes des routes d'intégration
router.get('/', routeController.getRoutes.bind(routeController));
router.get('/:id', routeController.getRouteById.bind(routeController));
router.post('/', validateRoute, routeController.createRoute.bind(routeController));
router.put('/:id', validateRoute, routeController.updateRoute.bind(routeController));
router.delete('/:id', routeController.deleteRoute.bind(routeController));


export default router;