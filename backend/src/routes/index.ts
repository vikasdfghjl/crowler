import { Router } from 'express';
import * as crawlController from '../controllers/crawlController';
import * as proxyController from '../controllers/proxyController';

const router = Router();

// Crawl endpoint
router.post('/api/crawl', crawlController.crawlWebsite);

// Proxy endpoint for fetching file content
router.get('/api/proxy', proxyController.proxyFile);

export default router;