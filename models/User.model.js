import { mongoose } from 'mongoose';

const userSchema = mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  refresh_token: String,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
});

export const User = mongoose.model('User', userSchema);
