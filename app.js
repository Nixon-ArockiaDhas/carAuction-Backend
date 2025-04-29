import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import usersRoutes from './routes/users.js';
import loginRoutes from './routes/login.js';
import communityRoutes from './routes/community.js';
import saleCalendar from './routes/saleCalendar.js';

const app = express();
const PORT = 4000;
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Use routes
app.use('/api/users', usersRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/saleCalendar', saleCalendar);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
