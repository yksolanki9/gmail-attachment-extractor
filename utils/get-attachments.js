import { google } from 'googleapis';
import { User } from '../models/User.model.js';
import { getOAuth2Client } from '../config/google-auth.js';
import { v4 as uuidv4 } from 'uuid';
import { writeFile} from 'node:fs/promises';
import { Base64 } from 'js-base64';
import { Message } from '../models/Message.model.js';
import mongoose from 'mongoose';

const gmail = google.gmail('v1');

export async function getAttachments(userId, searchQuery) {
  try {
    const FILE_FORMAT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
    const user = await User.findById(userId);
    google.options({auth: getOAuth2Client(user.refresh_token)});
  
    const messagesList = await gmail.users.messages.list({
      userId: user.email,
      q: `in:inbox has:attachment xlsx ${searchQuery}`
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
  
      const attachment = await gmail.users.messages.attachments.get({
        id: attachmentDetails.attachmentId,
        messageId: message.id,
        userId: user.email
      });

      const savedMessage = await Message.findOne({
        messageId: message.id
      });

      //If an attachment is already saved in nodejs, dont save it again
      if(!savedMessage) {
        const decodedData = Base64.toUint8Array(attachment.data.data);
        const storedFileName = uuidv4() + '.xlsx';
        await writeFile(`attachments/${storedFileName}`, decodedData);
    
        const messageData = new Message({
          _id: mongoose.Types.ObjectId(),
          userId: user.email,
          messageId: message.id,
          attachmentId: attachmentDetails.attachmentId,
          fileName: storedFileName,
          originalFileName: attachmentDetails.fileName
        });
  
        await messageData.save();
  
        await User.findByIdAndUpdate(userId, {
          '$push': {
            'messages': messageData._id
          }
        })
      }
  
      return {
        originalFileName: attachmentDetails.fileName
      };
    }));
    
    return messagesData.filter((messageData) => !!messageData);
  } catch(err) {
    throw Error(err);
  }
}