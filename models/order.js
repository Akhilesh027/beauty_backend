const mongoose = require("mongoose");

const assignedStaffSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  phone: String
});

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
  assignedStaff: assignedStaffSchema,

  orderId: { type: String, unique: true, required: true },

  orderDate: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'completed'],
    default: 'pending'
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
