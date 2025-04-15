const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  duration: { type: String },
  thumbnail: { type: String },
  addedAt: { type: Date, default: Date.now }
});

const playlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
  songs: [songSchema],
  createdAt: { type: Date, default: Date.now }
});

// Ensure unique playlist names per user
playlistSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Playlist', playlistSchema);
