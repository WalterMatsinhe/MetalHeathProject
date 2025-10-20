const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    // Reference to the conversation this message belongs to
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    // Message sender
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Message content
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000, // Limit message length
    },

    // Message type for future extensibility
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    // Read status for each participant
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Message status
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    // For system messages or special formatting
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    // Add virtual for sender info
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 });

// Virtual for checking if message is read by a specific user
MessageSchema.virtual("isReadBy").get(function () {
  return (userId) => {
    return this.readBy.some(
      (read) => read.user.toString() === userId.toString()
    );
  };
});

// Static method to mark messages as read
MessageSchema.statics.markAsRead = async function (conversationId, userId) {
  return await this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      "readBy.user": { $ne: userId },
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date(),
        },
      },
      $set: { status: "read" },
    }
  );
};

// Instance method to check if message is read by user
MessageSchema.methods.isReadByUser = function (userId) {
  return this.readBy.some((read) => read.user.toString() === userId.toString());
};

// Pre-save middleware to update conversation's last message
MessageSchema.pre("save", async function (next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Conversation = mongoose.model("Conversation");
      await Conversation.findByIdAndUpdate(this.conversation, {
        $set: {
          "lastMessage.content": this.content,
          "lastMessage.sender": this.sender,
          "lastMessage.timestamp": this.createdAt || new Date(),
        },
      });
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Message", MessageSchema);
