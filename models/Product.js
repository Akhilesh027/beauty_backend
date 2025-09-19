const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Product type is required'],
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
  },
  subCategory: {
    type: String,
    required: false
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9-]+$/, 'SKU can only contain letters, numbers, and hyphens']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  oldPrice: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.maxStock;
      },
      message: 'Stock cannot exceed max stock'
    }
  },
  maxStock: {
    type: Number,
    required: [true, 'Max stock is required'],
    min: [1, 'Max stock must be at least 1']
  },
  status: {
    type: String,
    enum: ['active', 'low', 'out'],
    default: 'active'
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/40'
  },
  overview: {
    type: [String], // Array of features
    default: []
  },
  thingsToKnow: {
    type: [String], // Array of notes
    default: []
  },
  procedure: [
    {
      title: { type: String, default: '' },
      desc: { type: String, default: '' },
      img: { type: String, default: '' }
    }
  ],
  precautions: {
    type: [String], // Aftercare instructions
    default: []
  },
  faqs: [
    {
      question: { type: String, default: '' },
      answer: { type: String, default: '' }
    }
  ],
  rating: {
    type: Number,
    default: 4.8,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  time: {
    type: String,
    default: '60 mins'
  },
  tag: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save middleware to automatically set status based on stock levels
productSchema.pre('save', function(next) {
  if (this.stock === 0) {
    this.status = 'out';
  } else if (this.stock / this.maxStock < 0.2) {
    this.status = 'low';
  } else {
    this.status = 'active';
  }
  next();
});

// Static method to get product statistics
productSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        lowStockCount: {
          $sum: { $cond: [{ $eq: ['$status', 'low'] }, 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$status', 'out'] }, 1, 0] }
        },
        categoriesCount: { $addToSet: '$category' }
      }
    },
    {
      $project: {
        _id: 0,
        totalProducts: 1,
        lowStockCount: 1,
        outOfStockCount: 1,
        categoriesCount: { $size: '$categoriesCount' }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : { 
    totalProducts: 0, 
    lowStockCount: 0, 
    outOfStockCount: 0, 
    categoriesCount: 0 
  };
};

// Method to generate next SKU
productSchema.statics.generateNextSKU = async function() {
  const lastProduct = await this.findOne().sort({ createdAt: -1 });
  if (!lastProduct) {
    return 'PRD-001';
  }
  
  const lastNumber = parseInt(lastProduct.sku.split('-')[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  return `PRD-${nextNumber}`;
};

module.exports = mongoose.model('Product', productSchema);