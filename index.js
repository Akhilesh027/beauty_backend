const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const Product = require('./models/Product.js');
const Cart = require("./models/Cart.js");
const Service = require('./models/Service');
const User = require('./models/User.js');
const order = require('./models/order.js');

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
app.put("/api/cart/update", async (req, res) => {
  const { userId, productId, quantity } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!productId) return res.status(400).json({ error: "productId is required" });
  if (quantity == null || quantity < 1)
    return res.status(400).json({ error: "quantity must be at least 1" });

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(item => item.productId.toString() === productId.toString());
    if (!item) return res.status(404).json({ error: "Product not found in cart" });

    item.quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Cart update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Remove a single product from cart
app.delete("/api/cart/remove", async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!productId) return res.status(400).json({ error: "productId is required" });

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ items: [] });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId.toString());
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Cart remove error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Clear all items in cart
app.delete("/api/cart/clear", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ items: [] });

    cart.items = [];
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Cart clear error:", err);
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

// Remove from cart
app.post("/api/cart/remove", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cart
app.post("/api/cart/clear", async (req, res) => {
  const { userId } = req.body;
  try {
    await Cart.findOneAndUpdate({ userId }, { items: [] });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});