const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const Product = require('./models/Product.js');
const Cart = require("./models/Cart.js");
const Service = require('./models/Service');
const User = require('./models/User.js');
const order = require('./models/order.js');
const Staf = require('./models/Staff.js');
const Staff = require('./models/Staff.js');
const Package = require('./models/Package.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1000000 } // 1MB limit
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://akhileshreddy811_db_user:VHRFkBeOLRl3FjpH@cluster0.f0nzozu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log(err));

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, age, gender } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      firstName,
      lastName,
      email,
      password,
      age,
      gender
    });

    await user.save();

    // Generate JWT token
    const payload = {
      id: user.id
    };

    const token = jwt.sign(payload, 'BANNU9', {
      expiresIn: '7d'
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload = {
      id: user.id
    };

    const token = jwt.sign(payload, 'BANNU9', {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/bookings', async (req, res) => {
  try {
    const services = await order.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId || userId.trim() === '') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const bookings = await order.find({ userId }).sort({ orderDate: -1 });
    
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/Users', async (req, res) => {
  try {
    const services = await User.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET a specific service
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new service
app.post('/api/services', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, duration, status, description } = req.body;
    
    const service = new Service({
      name,
      category,
      price,
      duration,
      status,
      description,
      image: req.file ? req.file.filename : ''
    });

    const newService = await service.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT (update) a service
app.put('/api/services/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, duration, status, description } = req.body;
    
    const updateData = {
      name,
      category,
      price,
      duration,
      status,
      description
    };

    // If a new image was uploaded, add it to the update data
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(updatedService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a service
app.delete('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search services
app.get('/api/services/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const services = await Service.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get all products with optional filtering
app.get('/api/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let filter = {};
    
    // Apply filters if provided
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product statistics
app.get('/api/products/stats', async (req, res) => {
  try {
    const stats = await Product.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new product
app.post('/api/products', async (req, res) => {
  try {
    // Generate SKU if not provided
    if (!req.body.sku) {
      req.body.sku = await Product.generateNextSKU();
    }

    // Whitelist fields (to prevent saving unexpected props)
    const {
      name,
      description,
      type,
      category,
      subCategory,
      sku,
      price,
      oldPrice,
      discount,
      stock,
      maxStock,
      image,
      overview,
      thingsToKnow,
      procedure,
      precautions,
      faqs,
      rating,
      time,
      tag
    } = req.body;

    const productData = {
      name,
      description,
      type,
      category,
      subCategory,
      sku,
      price,
      oldPrice,
      discount,
      stock,
      maxStock,
      image,
      overview: Array.isArray(overview) ? overview : [],
      thingsToKnow: Array.isArray(thingsToKnow) ? thingsToKnow : [],
      procedure: Array.isArray(procedure) ? procedure : [],
      precautions: Array.isArray(precautions) ? precautions : [],
      faqs: Array.isArray(faqs) ? faqs : [],
      rating: rating || 4.8,
      time: time || '60 mins',
      tag: tag || ''
    };

    const product = new Product(productData);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: savedProduct
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'SKU must be unique' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU must be unique' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Service Management API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }
  
  res.status(500).json({ message: err.message });
});

// Get user cart
// Assuming Express app is already set up and Cart is your Mongoose model

// Get cart by userId
app.get("/api/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    res.json(cart || { userId: req.params.userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product to cart or increase quantity
app.post("/api/cart/add", async (req, res) => {
  const { userId, product } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!product) return res.status(400).json({ error: "product is required" });

  try {
    let cart = await Cart.findOne({ userId });

if (!cart) {
  cart = new Cart({ userId, products: [{ ...product, quantity: 1 }] });
} else {
  if (!cart.products) cart.products = [];

  const existingItem = cart.products.find(
    (item) => item.productId.toString() === product.productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.products.push({ ...product, quantity: 1 });
  }
}

await cart.save();
res.json(cart);

  } catch (err) {
    console.error("Cart add error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update quantity of a product in cart
// Update product quantity in cart
app.put("/api/cart/update/:userId/:productId/:quantity", async (req, res) => {
  const { userId, productId, quantity } = req.params;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!productId) return res.status(400).json({ error: "productId is required" });
  if (!quantity || Number(quantity) < 1)
    return res.status(400).json({ error: "quantity must be at least 1" });

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );
    if (!item) return res.status(404).json({ error: "Product not found in cart" });

    item.quantity = Number(quantity);
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Cart update error:", err);
    res.status(500).json({ error: err.message });
  }
});
// Remove from cart (DELETE /api/cart/remove/:userId/:productId)
app.delete("/api/cart/remove/:userId/:productId", async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    if (!cart.products) cart.products = [];

    // Find product index
    const index = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove product
    cart.products.splice(index, 1);
    await cart.save();

    // ✅ Always return `products`
    res.json({ products: cart.products });
  } catch (err) {
    console.error("Remove Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Clear cart (DELETE /api/cart/clear/:userId)
app.delete("/api/cart/clear/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { products: [] },
      { new: true }
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // ✅ Always return `products`
    res.json({ products: cart.products });
  } catch (err) {
    console.error("Clear Cart Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/orders/create", async (req, res) => {
  try {
    const newOrder = new order(req.body);
    await newOrder.save();
    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.post('/api/auth/send-otp', async (req, res) => {
    const { emailOrMobile } = req.body;
  if (!emailOrMobile) return res.status(400).json({ message: 'Email or mobile required' });

  const otp = '1234'; // Dummy OTP for testing

  let user = await User.findOne({ emailOrMobile });
  if (!user) user = new User({ emailOrMobile });
  user.otp = otp;
  await user.save();
  console.log(`Dummy OTP for ${emailOrMobile}: ${otp}`); // Always 1234
  res.json({ message: 'OTP sent', userId: user._id });

});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.otp === otp) {
    user.otp = null; // clear OTP after verification
    await user.save();
    return res.json({ message: 'OTP verified', userId: user._id });
  } else {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
});




app.post('/api/staff/register', async (req, res) => {
  try {
    const { name, phone, email, skills, role, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingStaff = await Staff.findOne({ phone });
    if (existingStaff) {
      return res.status(409).json({ error: 'Staff with this phone already exists' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = new Staff({ name, phone, email, skills, role, password: hashedPassword });
    await staff.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login route with JWT token issuance
app.post('/api/staff/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Replace OTP verification with real method in production
    if (otp !== '1234') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const staff = await Staff.findOne({ phone });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Generate JWT token with staff ID and role
    const token = jwt.sign(
      { staffId: staff._id, role: staff.role }, 
      process.env.JWT_SECRET || 'BANNU9', 
      { expiresIn: '7d' }
    );

    res.json({
      staff: {
        id: staff._id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        skills: staff.skills,
        role: staff.role,
      },
      authToken: token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Fetch single staff
app.get('/api/staff/:id', async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  res.json(staff);
});

// Fetch all staff
app.get('/api/staff', async (req, res) => {
  const staffList = await Staff.find();
  res.json(staffList);
});

// PATCH /api/bookings/:id/assign - Assign staff to a booking
app.patch('/api/bookings/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    // Validate input
    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    // Check if booking exists
    const booking = await order.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Update booking with assigned staff
    booking.assignedStaff = {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone
    };

    // Update status to assigned if it was unassigned
    if (booking.status === 'unassigned' || !booking.status) {
      booking.status = 'assigned';
    }

    const updatedBooking = await booking.save();

    res.json({
      message: 'Staff assigned successfully',
      assignedStaff: updatedBooking.assignedStaff,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error assigning staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/bookings - Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await order.find().sort({ orderDate: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/bookings/assigned/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    // Find bookings where assignedStaff._id matches userId
    const bookings = await order.find({ 'assignedStaff._id': userId });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
});
// Get dashboard stats for a staff user
app.get('/api/dashboard/stats/:staffId', async (req, res) => {
  try {
    const staffId = req.params.staffId;
    
    // Example: count bookings by status for this staff user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAppointments = await order.countDocuments({
      'assignedStaff._id': staffId,
      orderDate: { $gte: today }
    });
    
    const completed = await order.countDocuments({
      'assignedStaff._id': staffId,
      status: 'completed'
    });
    
    const pending = await order.countDocuments({
      'assignedStaff._id': staffId,
      status: 'pending'
    });

    // Example earnings aggregation, assuming `amounts.total`
    const earningsAgg = await order.aggregate([
      { $match: { 'assignedStaff._id': staffId, status: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$amounts.total' } } }
    ]);
    const totalEarnings = earningsAgg.length ? earningsAgg[0].totalEarnings : 0;

    // Example rating, placeholder
    const rating = 4.5;

    res.json({ todayAppointments, completed, pending, totalEarnings, rating });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// Get bookings assigned to staff user filtered by optional status
app.get('/api/bookings/assigned/:staffId', async (req, res) => {
  try {
    const staffId = req.params.staffId;
    const status = req.query.status; // e.g., 'pending', 'upcoming', 'completed'

    const filter = { 'assignedStaff._id': staffId };
    if (status) {
      filter.status = status;
    }

    const bookings = await order.find(filter).sort({ orderDate: 1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching bookings' });
  }
});

// Accept a pending booking
app.post('/api/bookings/:bookingId/accept', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Update booking status to accepted
    const booking = await order.findByIdAndUpdate(bookingId, { status: 'confirmed' }, { new: true });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking accepted', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error accepting booking' });
  }
});

// Reject a pending booking
app.post('/bookings/:bookingId/reject', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Update booking status to rejected or canceled
    const booking = await order.findByIdAndUpdate(bookingId, { status: 'rejected' }, { new: true });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking rejected', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error rejecting booking' });
  }
});
// Complete a booking
app.post('/api/bookings/:bookingId/complete', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await order.findByIdAndUpdate(
      bookingId,
      { status: 'completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking marked as completed', booking });
  } catch (error) {
    res.status(500).json({ error: 'Server error completing booking' });
  }
});

// Mark booking as not completed
app.post('/api/bookings/:bookingId/not_completed', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await order.findByIdAndUpdate(
      bookingId,
      { status: 'not_completed' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking marked as not completed', booking });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating booking' });
  }
});
// Get all packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find().populate('services.productId', 'name');
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages.' });
  }
});

// Get all products (services) - from your products API or here for convenience
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}, 'name');  // select only name field
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create a new package
app.post('/api/packages', async (req, res) => {
  try {
    const { name, services, amount } = req.body;

    // Ensure services is an array of product IDs
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one service.' });
    }

    // Fetch service details from products to embed service names (optional)
    const serviceDocs = await Product.find({ _id: { $in: services } }, 'name');

    const servicesWithName = serviceDocs.map((s) => ({
      productId: s._id,
      name: s.name,
    }));

    const newPackage = new Package({
      name,
      services: servicesWithName,
      amount,
    });

    await newPackage.save();

    res.json({ message: 'Package created successfully.', package: newPackage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create package.' });
  }
});

// Update package
app.put('/api/packages/:id', async (req, res) => {
  try {
    const { name, services, amount } = req.body;
    const id = req.params.id;

    const serviceDocs = await Product.find({ _id: { $in: services } }, 'name');
    const servicesWithName = serviceDocs.map((s) => ({
      productId: s._id,
      name: s.name,
    }));

    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      { name, services: servicesWithName, amount },
      { new: true }
    );

    if (!updatedPackage) return res.status(404).json({ error: 'Package not found' });

    res.json({ message: 'Package updated.', package: updatedPackage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update package.' });
  }
});
app.get('/api/packages/:packageId', async (req, res) => {
  const { packageId } = req.params;
  if (!packageId) return res.status(400).json({ error: 'packageId is required' });

  try {
    const pkg = await Package.findById(packageId).populate('services'); // example Mongoose call
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  } catch (err) {
    console.error('Get package error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get("/api/products/:ids", async (req, res) => {
  const ids = req.params.ids.split(",");
  try {
    const products = await Product.find({ _id: { $in: ids } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Delete package
app.delete('/api/packages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Package.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ error: 'Package not found' });

    res.json({ message: 'Package deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package.' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});