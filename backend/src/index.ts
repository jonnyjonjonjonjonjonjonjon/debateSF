import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { debateRouter } from './routes/debate.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
    'https://debate-sf3-ajti3sbp9-jon-hughes-projects-24330bac.vercel.app',
    'https://debate-dzps7d911-jon-hughes-projects-24330bac.vercel.app',
    'https://debate-sf-4.vercel.app',
    'http://localhost:5173'
  ];

console.log('Environment ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
console.log('Parsed allowed origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', debateRouter);

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Backend v1.12.13 running on port ${PORT}`);
});