import express from 'express';
import cors from 'cors';
import { debateRouter } from './routes/debate.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.vercel.app'] 
    : ['http://localhost:5173']
}));
app.use(express.json());

app.use('/api', debateRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});