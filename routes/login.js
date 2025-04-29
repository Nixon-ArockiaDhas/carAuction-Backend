import express from 'express';
import { loginUser, authenticate, getSidebarItems, authorize } from '../auth/auth.js';

const router = express.Router();

router.post('/login', loginUser);

router.get('/sidebar-items', authenticate, getSidebarItems);

// Example of using authorize middleware
router.get('/admin-only', authenticate, authorize(['admin']), (req, res) => {
  res.send('Hello, admin!');
});

export default router;
