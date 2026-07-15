import mongoose from 'mongoose';

/**
 * Book Schema
 *
 * Holds catalog metadata and inventory counters instead of a flat
 * `status` / `borrowerId` embedded in the book document.
 *
 * totalCopies    – total physical/digital copies the library owns
 * availableCopies – copies currently on the shelf (totalCopies - active borrows)
 */
const bookSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      index: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    pages: {
      type: Number,
      default: 0,
      min: 0,
    },
    cover: {
      type: String,
      default: '#485E78',
    },
    isbn: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // ── Inventory (replaces the old flat `status` field) ──
    totalCopies: {
      type: Number,
      default: 1,
      min: 0,
    },
    availableCopies: {
      type: Number,
      default: 1,
      min: 0,
      validate: {
        validator: function (v) {
          return v <= this.totalCopies;
        },
        message: 'availableCopies cannot exceed totalCopies',
      },
    },

    // ── Statistics ──
    totalSaved: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFinished: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Convenience getter (virtual) ──
    // (returned by toJSON / toObject when configured)
  },
  {
    timestamps: true,
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──

/** Human-readable status derived from inventory counters. */
bookSchema.virtual('status').get(function () {
  if (this.availableCopies === 0 && this.totalCopies > 0) return 'borrowed';
  if (this.availableCopies < 0) return 'borrowed'; // safety net
  return 'available';
});

// ── Indexes ──
bookSchema.index({ genre: 1 });
bookSchema.index({ author: 1 });

const Book = mongoose.model('Book', bookSchema);

export default Book;