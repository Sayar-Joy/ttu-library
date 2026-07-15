import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true,
    },
    book: {
      type: String,
      ref: 'Book',
      required: [true, 'Transaction must reference a book'],
      index: true,
    },
    borrowDate: { type: Date, default: Date.now },
    dueDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
      },
    },
    returnDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'returned', 'overdue', 'reserved'],
      default: 'active',
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ book: 1, status: 1 });
transactionSchema.index({ dueDate: 1, status: 1 });

transactionSchema.statics.findActiveByUser = function (userId) {
  return this.find({ user: userId, status: { $in: ['active', 'overdue'] } })
    .populate('book')
    .lean();
};

transactionSchema.statics.findActiveByBook = function (bookId) {
  return this.find({ book: bookId, status: { $in: ['active', 'overdue'] } }).lean();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;