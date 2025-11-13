const InventoryOptimization = require('../models/InventoryOptimization');
const SalesPrediction = require('../models/SalesPrediction');
const Product = require('../models/Product');

class InventoryOptimizationService {
  async generateForProduct(productId, period = 'monthly', options = {}) {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const leadTimeDays = options.leadTimeDays || 7;
    const serviceLevel = options.serviceLevel || 0.95;
    const z = this.serviceLevelToZ(serviceLevel);

    const recentPredictions = await SalesPrediction.getPredictionsByProduct(productId, period);
    const latest = recentPredictions[0];

    let predictedDemand = latest ? latest.predictedQuantity : 0;
    let demandStdDev = 0;
    const history = latest ? latest.historicalData : [];
    if (history && history.length > 2) {
      const quantities = history.map(h => h.quantity).filter(q => q >= 0);
      const mean = quantities.reduce((s, q) => s + q, 0) / quantities.length;
      const variance = quantities.reduce((s, q) => s + Math.pow(q - mean, 2), 0) / quantities.length;
      demandStdDev = Math.sqrt(variance);
    }

    const demandPerDay = this.periodDemandPerDay(predictedDemand, period);
    const sigmaPerDay = this.periodDemandPerDay(demandStdDev, period);

    const safetyStock = Math.max(0, Math.round(z * sigmaPerDay * Math.sqrt(leadTimeDays)));
    const reorderPoint = Math.max(0, Math.round(demandPerDay * leadTimeDays + safetyStock));

    const holdingCostRate = options.holdingCostRate || 0.2;
    const unitPrice = product.price || 1;
    const holdingCost = unitPrice * holdingCostRate;
    const orderingCost = options.orderingCost || 50;
    const annualDemand = this.periodToAnnual(predictedDemand, period);
    const eoq = Math.max(0, Math.round(Math.sqrt((2 * annualDemand * orderingCost) / (holdingCost || 1))));

    const recommendedOrderQty = Math.max(0, Math.round(Math.max(eoq, reorderPoint - product.stock)));
    const daysOfCover = demandPerDay > 0 ? Math.round(product.stock / demandPerDay) : 0;

    const classification = this.classifyABC(product, predictedDemand, latest ? latest.predictedRevenue : 0);

    const doc = await InventoryOptimization.create({
      productId,
      period,
      currentStock: product.stock,
      predictedDemand,
      demandStdDev,
      leadTimeDays,
      serviceLevel,
      safetyStock,
      reorderPoint,
      eoq,
      recommendedOrderQty,
      daysOfCover,
      classification,
      notes: ''
    });
    return doc;
  }

  async generateForAll(period = 'monthly', options = {}) {
    const products = await Product.find({ isActive: true });
    const results = [];
    for (const p of products) {
      try {
        const r = await this.generateForProduct(p._id, period, options);
        results.push({ productId: p._id, success: true, suggestion: r });
      } catch (e) {
        results.push({ productId: p._id, success: false, error: e.message });
      }
    }
    return results;
  }

  async getLatestSuggestions(period = 'monthly', limit = 50) {
    const suggestions = await InventoryOptimization.find({ period })
      .populate('productId', 'name category price stock')
      .sort({ generatedAt: -1 })
      .limit(limit);
    return suggestions;
  }

  serviceLevelToZ(sl) {
    if (sl >= 0.99) return 2.33;
    if (sl >= 0.98) return 2.05;
    if (sl >= 0.95) return 1.64;
    if (sl >= 0.90) return 1.28;
    return 0.84;
  }

  periodDemandPerDay(value, period) {
    switch (period) {
      case 'daily': return value;
      case 'weekly': return value / 7;
      default: return value / 30;
    }
  }

  periodToAnnual(value, period) {
    switch (period) {
      case 'daily': return value * 365;
      case 'weekly': return value * 52;
      default: return value * 12;
    }
  }

  classifyABC(product, predictedDemand, predictedRevenue) {
    const revenue = predictedRevenue || product.price * predictedDemand;
    if (revenue >= 50000) return 'A';
    if (revenue >= 10000) return 'B';
    return 'C';
  }
}

module.exports = new InventoryOptimizationService();
