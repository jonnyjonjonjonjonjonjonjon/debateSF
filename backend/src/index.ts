import express from 'express';
import cors from 'cors';
import { debateRouter } from './routes/debate.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', debateRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});