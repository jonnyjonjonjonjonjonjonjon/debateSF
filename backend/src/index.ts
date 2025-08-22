import express from 'express';
import cors from 'cors';
import { debateRouter } from './routes/debate.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.use('/api', debateRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});