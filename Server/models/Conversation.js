const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    // Participants in the conversation
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Type of conversation (always 'private' for user-therapist chats)
    type: {
      type: String,
      enum: ["private"],
      default: "private",
    },

    // Last message info for quick display
    lastMessage: {
      content: {
        type: String,
        default: "",
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },

    // Status tracking
    isActive: {
      type: Boolean,
      default: true,
    },

    // Track unread messages for each participant
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    // Add virtual for getting the other participant
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ participants: 1, "lastMessage.timestamp": -1 });

// Static method to find or create conversation between two users
ConversationSchema.statics.findOrCreate = async function (userId, therapistId) {
  let conversation = await this.findOne({
    participants: { $all: [userId, therapistId] },
  }).populate(
    "participants",
    "name firstName lastName role email profilePicture"
  );

  if (!conversation) {
    conversation = await this.create({
      participants: [userId, therapistId],
      unreadCount: new Map([
        [userId.toString(), 0],
        [therapistId.toString(), 0],
      ]),
    });

    // Populate after creation
    conversation = await this.findById(conversation._id).populate(
      "participants",
      "name firstName lastName role email profilePicture"
    );
  }

  return conversation;
};

// Instance method to get the other participant
ConversationSchema.methods.getOtherParticipant = function (currentUserId) {
  return this.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString()
  );
};

// Instance method to increment unread count
ConversationSchema.methods.incrementUnreadCount = function (userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Instance method to reset unread count
ConversationSchema.methods.resetUnreadCount = function (userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

module.exports = mongoose.model("Conversation", ConversationSchema);
