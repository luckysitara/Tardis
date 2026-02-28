import express from 'express';
import { 
  getUltraOrder, 
  executeUltraSwap, 
  searchTokens, 
  getShield, 
  getHoldings, 
  getRouters,
  getPrice 
} from '../../controllers/jupiterUltraSwapController';

const router = express.Router();

// GET /api/jupiter/ultra/price
router.get('/price', getPrice);

// GET /api/jupiter/ultra/search
router.get('/search', searchTokens);

// GET /api/jupiter/ultra/shield
router.get('/shield', getShield);

// GET /api/jupiter/ultra/holdings/:address
router.get('/holdings/:address', getHoldings);

// GET /api/jupiter/ultra/routers
router.get('/routers', getRouters);

// GET /api/jupiter/ultra/order
router.get('/order', getUltraOrder);

// POST /api/jupiter/ultra/execute
router.post('/execute', executeUltraSwap);

export default router;
