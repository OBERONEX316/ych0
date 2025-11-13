// const tf = require('@tensorflow/tfjs-node'); // 注释掉TensorFlow依赖
const Product = require('../models/Product');
const UserActivity = require('../models/UserActivity');

class AIRecommendationService {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.itemEmbeddings = new Map();
    this.userEmbeddings = new Map();
  }

  // 初始化AI推荐服务
  async initialize() {
    try {
      console.log('🚀 初始化AI推荐服务...');
      
      // 加载或训练推荐模型
      await this.loadOrTrainModel();
      
      // 预计算商品嵌入
      await this.precomputeItemEmbeddings();
      
      this.isModelLoaded = true;
      console.log('✅ AI推荐服务初始化完成');
    } catch (error) {
      console.error('AI推荐服务初始化失败:', error);
      this.isModelLoaded = false;
    }
  }

  // 加载或训练模型
  async loadOrTrainModel() {
    // 这里使用简单的矩阵分解模型作为示例
    // 实际项目中可以使用更复杂的深度学习模型
    this.model = {
      predict: async (userId, itemId) => {
        // 简单的预测函数，返回0-1的偏好分数
        const userPref = this.getUserPreference(userId);
        const itemPref = this.getItemPreference(itemId);
        
        // 计算余弦相似度
        const similarity = this.calculateCosineSimilarity(userPref, itemPref);
        return Math.max(0, Math.min(1, similarity));
      },
      
      // 模型训练方法（简化版）
      train: async (trainingData) => {
        console.log('训练推荐模型...');
        // 实际训练逻辑
        return true;
      }
    };
  }

  // 预计算商品嵌入
  async precomputeItemEmbeddings() {
    try {
      console.log('📊 预计算商品嵌入...');
      
      const products = await Product.find({ isActive: true }).limit(1000);
      
      for (const product of products) {
        const embedding = this.createProductEmbedding(product);
        this.itemEmbeddings.set(product._id.toString(), embedding);
      }
      
      console.log(`✅ 已计算 ${this.itemEmbeddings.size} 个商品的嵌入`);
    } catch (error) {
      console.error('预计算商品嵌入错误:', error);
    }
  }

  // 创建商品嵌入向量
  createProductEmbedding(product) {
    // 基于商品特征创建嵌入向量
    const features = [
      product.price / 1000, // 归一化价格
      product.rating || 3.0, // 评分
      product.salesCount / 100, // 归一化销量
      this.categoryToNumber(product.category), // 分类编码
      this.calculatePopularityScore(product) // 流行度分数
    ];
    
    // 添加一些随机性以区分相似商品
    for (let i = 0; i < 3; i++) {
      features.push(Math.random() * 0.1);
    }
    
    return features;
  }

  // 分类编码
  categoryToNumber(category) {
    const categories = ['electronics', 'clothing', 'home', 'food', 'books', 'sports'];
    return categories.indexOf(category || '') / categories.length;
  }

  // 计算流行度分数
  calculatePopularityScore(product) {
    const ratingWeight = 0.4;
    const salesWeight = 0.3;
    const recencyWeight = 0.3;
    
    const ratingScore = (product.rating || 3) / 5;
    const salesScore = Math.min(1, product.salesCount / 1000);
    
    const daysSinceCreation = (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-daysSinceCreation / 30); // 30天衰减
    
    return ratingWeight * ratingScore + 
           salesWeight * salesScore + 
           recencyWeight * recencyScore;
  }

  // 获取用户偏好向量
  getUserPreference(userId) {
    // 简化版的用户偏好计算
    // 实际中应该基于用户行为历史计算
    if (!this.userEmbeddings.has(userId)) {
      // 创建新的用户嵌入
      const userEmbedding = [
        Math.random() * 0.5 + 0.25, // 价格偏好
        Math.random() * 0.5 + 0.25, // 质量偏好  
        Math.random() * 0.5 + 0.25, // 流行度偏好
        Math.random(), // 分类偏好1
        Math.random(), // 分类偏好2
        Math.random() * 0.1, // 随机性
        Math.random() * 0.1  // 随机性
      ];
      
      this.userEmbeddings.set(userId, userEmbedding);
    }
    
    return this.userEmbeddings.get(userId);
  }

  // 获取商品偏好向量
  getItemPreference(itemId) {
    return this.itemEmbeddings.get(itemId) || this.createDefaultEmbedding();
  }

  // 创建默认嵌入
  createDefaultEmbedding() {
    return [0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.1];
  }

  // 计算余弦相似度
  calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // 基于深度学习的推荐
  async getDeepLearningRecommendations(userId, limit = 12) {
    if (!this.isModelLoaded) {
      return [];
    }

    try {
      // 获取所有活跃商品
      const allProducts = await Product.find({ isActive: true }).limit(200);
      
      // 为每个商品计算预测分数
      const scoredProducts = await Promise.all(
        allProducts.map(async (product) => {
          const score = await this.model.predict(userId, product._id.toString());
          return { product, score };
        })
      );

      // 按分数排序并返回前N个
      return scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.product);

    } catch (error) {
      console.error('深度学习推荐错误:', error);
      return [];
    }
  }

  // 查找相似商品
  async findSimilarItems(itemId, limit = 6) {
    if (!this.isModelLoaded) {
      return [];
    }

    try {
      const targetEmbedding = this.getItemPreference(itemId);
      const allProducts = await Product.find({ isActive: true }).limit(100);
      
      const similarities = await Promise.all(
        allProducts.map(async (product) => {
          if (product._id.toString() === itemId) {
            return { product, similarity: -1 }; // 排除自身
          }
          
          const productEmbedding = this.getItemPreference(product._id.toString());
          const similarity = this.calculateCosineSimilarity(targetEmbedding, productEmbedding);
          
          return { product, similarity };
        })
      );

      return similarities
        .filter(item => item.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.product);

    } catch (error) {
      console.error('查找相似商品错误:', error);
      return [];
    }
  }

  // 创建嵌入向量（公开方法）
  async createEmbedding(data) {
    if (typeof data === 'string') {
      // 文本嵌入
      return this.createTextEmbedding(data);
    } else if (data.price !== undefined) {
      // 商品嵌入
      return this.createProductEmbedding(data);
    }
    
    return this.createDefaultEmbedding();
  }

  // 创建文本嵌入（简化版）
  createTextEmbedding(text) {
    // 简单的文本嵌入实现
    // 实际中应该使用BERT等预训练模型
    const embedding = [];
    
    // 基于文本长度和字符分布
    const lengthFeature = Math.min(1, text.length / 100);
    embedding.push(lengthFeature);
    
    // 添加一些基于字符的简单特征
    const charFeatures = this.analyzeTextCharacters(text);
    embedding.push(...charFeatures);
    
    // 填充到固定长度
    while (embedding.length < 8) {
      embedding.push(Math.random() * 0.1);
    }
    
    return embedding.slice(0, 8);
  }

  // 分析文本字符特征
  analyzeTextCharacters(text) {
    if (!text) return [0, 0, 0];
    
    const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    const digitRatio = (text.match(/[0-9]/g) || []).length / text.length;
    const specialRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
    
    return [alphaRatio, digitRatio, specialRatio];
  }

  // 获取服务状态
  getStatus() {
    return {
      isModelLoaded: this.isModelLoaded,
      itemEmbeddingsCount: this.itemEmbeddings.size,
      userEmbeddingsCount: this.userEmbeddings.size,
      lastUpdated: new Date()
    };
  }
}

// 创建单例实例
const aiRecommendationService = new AIRecommendationService();

 

module.exports = aiRecommendationService;
