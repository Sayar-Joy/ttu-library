import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    identifier: {
      type: String,
      required: [true, 'Student/staff identifier is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    avatar: { type: String, default: '??', maxlength: 4 },
    joined: { type: String, default: () => new Date().toISOString().split('T')[0] },
    activeBorrowCount: { type: Number, default: 0, min: 0 },
    activeReserveCount: { type: Number, default: 0, min: 0 },
    booksBorrowed: { type: Number, default: 0, min: 0 },
    booksDue: { type: Number, default: 0, min: 0 },
    booksReserved: { type: Number, default: 0, min: 0 },
    favourites: [{ type: String }],
    finished: [{ type: String }],
    queryInterested: [{ type: String }],
    genre: [{ type: String }],
  },
  { timestamps: true, _id: false }
);

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    identifier: this.identifier,
    email: this.email,
    avatar: this.avatar,
    joined: this.joined,
    activeBorrowCount: this.activeBorrowCount,
    activeReserveCount: this.activeReserveCount,
    booksBorrowed: this.booksBorrowed,
    booksDue: this.booksDue,
    booksReserved: this.booksReserved,
    favourites: this.favourites,
    finished: this.finished,
    queryInterested: this.queryInterested,
    genre: this.genre,
  };
};

const User = mongoose.model('User', userSchema);

export default User;