import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { requestLogger } from './middlewares/logger';
import config from './config';

// Initialize express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Request logging middleware
app.use(requestLogger);

// Parse JSON request bodies
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Register all routes
app.use(routes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});