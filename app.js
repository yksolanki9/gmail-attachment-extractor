import express from 'express';
import 'dotenv/config';

const app = express();

app.get('/', (req, res) => {
  res.send('Welcome');
})

app.listen(3000, () => console.log('Server running on port 3000'));