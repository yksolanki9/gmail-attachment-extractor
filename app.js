import express from 'express';
import 'dotenv/config';
import { getGoogleAuthURL, getOAuth2Client, getGoogleUser } from './config/google-auth.js';
import { google } from 'googleapis';
import { User } from './models/User.model.js';
import mongoose from 'mongoose';
import './config/mongoose.js';

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

    let user = await User.findOne({email});

    if (!user) {
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        googleId: id,
        name,
        email,
        refresh_token: googleUser.refresh_token
      });
      
      await user.save();
    }
    res.redirect(`/messages/search/${user._id}`);

    // Add some page here -> Commented for testing
    // res.render('auth', {url: `http://localhost:3000/messages/search/${user._id}`});

    // google.options({auth: getOAuth2Client(googleUser.refresh_token)});

    // const data = await gmail.users.messages.list({
    //   userId: email,
    //   q: 'has:attachment'
    // });

    // res.send(googleUser.data);
    // res.send(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/messages/search/:userId', async(req, res) => {
  // URL FOR TESTING
  // http://localhost:3000/messages/search/628ba16b15244cbf6237821a

  const FILE_FORMAT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  try {
    const user = await User.findById(req.params.userId);
    google.options({auth: getOAuth2Client(user.refresh_token)});

    const messagesList = await gmail.users.messages.list({
      userId: user.email,
      q: 'has:attachment',
      maxResults: 10 //Remove this after testing
    });

    const messagesData = await Promise.all(messagesList.data.messages.map(async (message) => {
      const messageBody = await gmail.users.messages.get({
        id: message.id,
        userId: user.email
      });

      const attachmentDetails = messageBody.data.payload.parts
        .filter((msgPart) => msgPart.mimeType === FILE_FORMAT && msgPart.body.attachmentId)
        .map((msgPart) => ({
          fileName: msgPart.filename,
          attachmentId: msgPart.body.attachmentId
        }))[0];

      //This will be undefined when mail has attachment but of different type than pdf
      if(!attachmentDetails) return;

      const attachment = await gmail.users.messages.attachments.get({
        id: attachmentDetails.attachmentId,
        messageId: message.id,
        userId: user.email
      });

      const obj = {
        userId: user.email,
        messageId: message.id,
        attachmentId: attachmentDetails.attachmentId,
        fileName: attachmentDetails.fileName,
        data: attachment.data,
      }
      return obj;

      //Save userId, messageId, filename, attachmentid and attachment data in mongodb
    }));
    
    const pdfMessagesData = messagesData.filter((messageData) => {
      return !!messageData;
    });

    // pdfMessagesData[0].data.data = pdfMessagesData[0].data.data.replaceAll('-', '+').replaceAll('_', '/');

    return res.send(pdfMessagesData);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
})

app.listen(3000, () => console.log('Server running on port 3000'));