import { mongoose } from 'mongoose'; 
import 'dotenv/config';

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.once('open', () => console.log('MongoDB connected successfully'));

export { db };