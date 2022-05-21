import express from 'express';
import 'dotenv/config';
import { getGoogleAuthURL, getOAuth2Client, getGoogleUser } from './config/google-auth.js';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('pages/index');
});

app.get('/auth/google', (req, res) => {
  res.redirect(getGoogleAuthURL());
});

app.get('/auth/callback', (req, res) => {
  res.send('User authenticated successfully');
})

app.listen(3000, () => console.log('Server running on port 3000'));