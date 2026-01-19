import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    receiverId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying by conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });

// Compound index for finding messages by sender or receiver
messageSchema.index({ senderId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
