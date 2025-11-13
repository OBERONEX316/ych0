const mongoose = require('mongoose');

const salesPredictionSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  predictionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  predictionPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  predictedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  predictedRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  confidenceLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  algorithmUsed: {
    type: String,
    enum: ['linear_regression', 'time_series', 'machine_learning', 'seasonal_decomposition', 'ensemble'],
    required: true
  },
  historicalData: [{
    date: Date,
    quantity: Number,
    revenue: Number,
    price: Number
  }],
  factors: {
    seasonality: {
      type: Number,
      default: 1.0
    },
    trend: {
      type: Number,
      default: 0
    },
    promotionalImpact: {
      type: Number,
      default: 1.0
    },
    competitorImpact: {
      type: Number,
      default: 1.0
    },
    marketTrend: {
      type: Number,
      default: 1.0
    }
  },
  accuracyMetrics: {
    mape: Number, // Mean Absolute Percentage Error
    mae: Number,  // Mean Absolute Error
    rmse: Number, // Root Mean Square Error
    r2: Number     // R-squared
  },
  actualResults: {
    quantity: Number,
    revenue: Number,
    updatedAt: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
salesPredictionSchema.index({ productId: 1, predictionDate: -1 });
salesPredictionSchema.index({ predictionPeriod: 1, periodStart: 1 });
salesPredictionSchema.index({ status: 1, predictionDate: -1 });

// Static methods
salesPredictionSchema.statics.getPredictionsByProduct = function(productId, period = 'monthly') {
  return this.find({
    productId,
    predictionPeriod: period,
    status: 'active'
  }).sort({ predictionDate: -1 }).limit(12);
};

salesPredictionSchema.statics.getPredictionsByPeriod = function(startDate, endDate, period = 'monthly') {
  return this.find({
    periodStart: { $gte: startDate },
    periodEnd: { $lte: endDate },
    predictionPeriod: period,
    status: 'active'
  }).populate('productId', 'name category price');
};

salesPredictionSchema.statics.getAccuracyReport = function(productId, period = 'monthly') {
  return this.find({
    productId,
    predictionPeriod: period,
    status: 'completed',
    'actualResults.quantity': { $exists: true }
  }).sort({ predictionDate: -1 }).limit(24);
};

// Instance methods
salesPredictionSchema.methods.updateActualResults = function(actualQuantity, actualRevenue) {
  this.actualResults = {
    quantity: actualQuantity,
    revenue: actualRevenue,
    updatedAt: new Date()
  };
  this.status = 'completed';
  
  // Calculate accuracy metrics
  const quantityError = Math.abs(this.predictedQuantity - actualQuantity) / actualQuantity;
  const revenueError = Math.abs(this.predictedRevenue - actualRevenue) / actualRevenue;
  
  this.accuracyMetrics = {
    mape: (quantityError + revenueError) / 2 * 100,
    mae: Math.abs(this.predictedQuantity - actualQuantity),
    rmse: Math.sqrt(Math.pow(this.predictedQuantity - actualQuantity, 2)),
    r2: 1 - (Math.pow(this.predictedQuantity - actualQuantity, 2) / Math.pow(actualQuantity, 2))
  };
  
  return this.save();
};

salesPredictionSchema.methods.getConfidenceRating = function() {
  if (this.confidenceLevel >= 0.9) return 'Very High';
  if (this.confidenceLevel >= 0.8) return 'High';
  if (this.confidenceLevel >= 0.7) return 'Medium';
  if (this.confidenceLevel >= 0.6) return 'Low';
  return 'Very Low';
};

module.exports = mongoose.model('SalesPrediction', salesPredictionSchema);