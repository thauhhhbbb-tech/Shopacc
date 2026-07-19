const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  game: {
    type: String,
    required: true,
    enum: ['Free Fire', 'Liên Quân', 'GARCONT', 'Roblox', 'Minecraft', 'Khác'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  stock: {
    type: Number,
    default: 1,
    min: 0,
  },
  description: String,
  images: [String],
  accountDetails: {
    username: String,
    password: String,
    // Có thể thêm các trường đặc biệt theo game
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual để tính giá sau giảm
ProductSchema.virtual('finalPrice').get(function () {
  return this.price * (1 - this.discount / 100);
});

module.exports = mongoose.model('Product', ProductSchema);
