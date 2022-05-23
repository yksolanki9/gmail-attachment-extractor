import { google } from 'googleapis';
import { User } from '../models/User.model.js';
import { getOAuth2Client } from '../config/google-auth.js';

const gmail = google.gmail('v1');

export async function getAttachments(userId, searchQuery) {
  const FILE_FORMAT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const user = await User.findById(userId);
  google.options({auth: getOAuth2Client(user.refresh_token)});

  const messagesList = await gmail.users.messages.list({
    userId: user.email,
    q: `has:attachment xlsx ${searchQuery}`,
    maxResults: 30 //Remove this after testing
  });

  if(!messagesList?.data?.messages?.length) {
    return null;
  }

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

    //This will be undefined when mail has attachment but of different type than xlsx
    if(!attachmentDetails) return;

    //COMMENTING FOR BETTER PERF
    // const attachment = await gmail.users.messages.attachments.get({
    //   id: attachmentDetails.attachmentId,
    //   messageId: message.id,
    //   userId: user.email
    // });

    const obj = {
      userId: user.email,
      messageId: message.id,
      attachmentId: attachmentDetails.attachmentId,
      fileName: attachmentDetails.fileName,
      // data: attachment.data,
    }
    return obj;

    //Save userId, messageId, filename, attachmentid and attachment data in mongodb
  }));
  
  return messagesData.filter((messageData) => !!messageData);
}