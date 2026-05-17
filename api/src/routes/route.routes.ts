// src/routes/route.routes.ts
import { Router } from 'express';
import { RouteController } from '../controllers/route.controller';
import { validateRoute } from '../middlewares/validation.middleware';

const router = Router();
const routeController = new RouteController();

console.log('🔵 INITIALISATION DU ROUTEUR ROUTE');

// Route de test simple pour vérifier que le routeur fonctionne
router.get('/test', (req, res) => {
  console.log('✅ Route /test atteinte!');
  res.json({ message: 'Route router works!' });
});

// Routes d'action
router.patch('/action/:id/enable', (req, res, next) => {
  console.log('🎯 PATCH /action/:id/enable atteint! ID:', req.params.id);
  routeController.enableRoute(req, res, next);
});

router.patch('/action/:id/disable', (req, res, next) => {
  console.log('🎯 PATCH /action/:id/disable atteint! ID:', req.params.id);
  routeController.disableRoute(req, res, next);
});

// Routes normales
router.get('/', routeController.getRoutes.bind(routeController));
router.get('/:id', routeController.getRouteById.bind(routeController));
router.post('/', validateRoute, routeController.createRoute.bind(routeController));
router.put('/:id', validateRoute, routeController.updateRoute.bind(routeController));
router.delete('/:id', routeController.deleteRoute.bind(routeController));

// Afficher toutes les routes enregistrées
console.log('Routes enregistrées dans route.routes.ts:');
router.stack.forEach((layer: any) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
    console.log(`  ${methods} ${layer.route.path}`);
  } else if (layer.name === 'bound dispatch') {
    console.log(`  Middleware: ${layer.regexp}`);
  }
});

export default router;