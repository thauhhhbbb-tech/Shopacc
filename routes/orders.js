const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

// Tạo đơn hàng
router.post('/', auth, async (req, res) => {
  try {
    const { items, paymentMethod, shippingInfo, note } = req.body;
    // Kiểm tra tồn kho
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Sản phẩm ${item.product} không tồn tại` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Sản phẩm ${product.name} không đủ hàng` });
      }
      const price = product.finalPrice || product.price;
      total += price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtTime: price,
      });
    }

    // Nếu thanh toán bằng số dư
    if (paymentMethod === 'balance') {
      const user = await User.findById(req.user._id);
      if (user.balance < total) {
        return res.status(400).json({ message: 'Số dư không đủ' });
      }
      user.balance -= total;
      await user.save();
    }

    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount: total,
      paymentMethod,
      shippingInfo,
      note,
      status: paymentMethod === 'balance' ? 'paid' : 'pending',
      paymentStatus: paymentMethod === 'balance' ? 'success' : 'pending',
    });
    await order.save();

    // Trừ stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy đơn hàng của user hiện tại
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.product', 'name game images');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Lấy tất cả đơn hàng
router.get('/all', auth, admin, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'username email').populate('items.product', 'name');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Cập nhật trạng thái đơn hàng
router.put('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status, updatedAt: Date.now() }, { new: true });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
