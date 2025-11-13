const mongoose = require('mongoose');

const inventoryOptimizationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
  generatedAt: { type: Date, default: Date.now },
  currentStock: { type: Number, required: true, min: 0 },
  predictedDemand: { type: Number, required: true, min: 0 },
  demandStdDev: { type: Number, required: true, min: 0 },
  leadTimeDays: { type: Number, default: 7, min: 0 },
  serviceLevel: { type: Number, default: 0.95 },
  safetyStock: { type: Number, required: true, min: 0 },
  reorderPoint: { type: Number, required: true, min: 0 },
  eoq: { type: Number, required: true, min: 0 },
  recommendedOrderQty: { type: Number, required: true, min: 0 },
  daysOfCover: { type: Number, required: true, min: 0 },
  classification: { type: String, enum: ['A', 'B', 'C'], default: 'B' },
  notes: { type: String },
}, { timestamps: true });

inventoryOptimizationSchema.index({ productId: 1, generatedAt: -1 });

module.exports = mongoose.model('InventoryOptimization', inventoryOptimizationSchema);
