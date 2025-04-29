import express from 'express';
import { authenticate } from '../auth/auth.js';

const router = express.Router();

// Example route for users
router.get('/', authenticate, (req, res) => {
  res.send('Hello, authenticated user!');
});

export default router;
