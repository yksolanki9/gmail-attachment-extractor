import express from 'express';
import 'dotenv/config';
import { getGoogleAuthURL, getOAuth2Client, getGoogleUser } from './config/google-auth.js';
import { google } from 'googleapis';
import './config/mongoose';

const app = express();
const gmail = google.gmail('v1');

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('pages/index');
});

app.get('/auth/google', (req, res) => {
  res.redirect(getGoogleAuthURL());
});

app.get('/auth/callback', async(req, res) => {
  try {
    const googleUser = await getGoogleUser(req.query);
  
    const { id, email, name } = googleUser.data;
    console.log('USER ID IS', id);

    // let user = await User.findOne({email});

    // if (!user) {
    //   user = new User({
    //     _id: new mongoose.Types.ObjectId(),
    //     googleId: id,
    //     name,
    //     email,
    //     refresh_token: googleUser.refresh_token
    //   });
      
    //   await user.save();
    // }

    // res.render('auth', {url: `http://localhost:3000/calendar/${user._id}`});

    google.options({auth: getOAuth2Client(googleUser.refresh_token)});

    const data = await gmail.users.messages.list({
      userId: email,
      q: 'has:attachment'
    });

    // res.send(googleUser.data);
    res.send(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
})

app.listen(3000, () => console.log('Server running on port 3000'));