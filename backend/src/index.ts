import express from 'express';
import cors from 'cors';
import { debateRouter } from './routes/debate.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'https://debate-jr2ns9q59-jon-hughes-projects-24330bac.vercel.app',
    'http://localhost:5173'
  ]
}));
app.use(express.json());

app.use('/api', debateRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});