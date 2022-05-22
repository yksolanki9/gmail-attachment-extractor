import { mongoose } from 'mongoose';

const messageSchema = mongoose.Schema({
  messageId: String,
  userId: String,
  attachmentId: String,
  fileName: String
});

export const Message = mongoose.model('Message', messageSchema);
