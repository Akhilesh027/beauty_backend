// models/Staff.js
const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  skills: [String],
  role: String,
   assignedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  password: String // For demos only; use proper hashing and auth in production
});

module.exports = mongoose.model('Staff', StaffSchema);
