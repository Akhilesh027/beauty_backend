// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cart: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      title: String,
      price: Number,
      quantity: Number,
    },
  ],
  address: {
    fullName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    phone: String,
  },
  paymentType: { type: String, default: "Cash on Delivery" },
  amounts: {
    subtotal: Number,
    shipping: Number,
    tax: Number,
    total: Number,
  },
  orderId: String,
  orderDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
