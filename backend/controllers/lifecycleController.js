const lifecycleService = require('../services/lifecycleService');
const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');

exports.computeUser = async (req,res)=>{
  try{ const doc = await lifecycleService.computeForUser(req.params.userId || req.user.id); res.json({ success:true, data: doc }); }
  catch(e){ res.status(500).json({ success:false, error:e.message }); }
};

exports.segmentIssueCoupon = async (req,res)=>{
  try{
    const { segment } = req.body; // platinum/gold/silver/bronze
    const users = await require('../models/UserLifecycle').find({ segment }).limit(100).select('userId');
    const now = new Date(); const until = new Date(now.getTime()+14*24*3600*1000);
    const code = `SEG-${segment.toUpperCase()}-${Date.now()}`;
    const discount = segment==='platinum'?20: segment==='gold'?15: segment==='silver'?10:5;
    const coupon = await Coupon.create({ code, name:`${segment}分层优惠`, description:`${segment}分层专属优惠`, discountType:'percentage', discountValue:discount, validFrom: now, validUntil: until, isActive:true, isPublic:false, createdBy: req.user.id });
    for(const u of users){
      await UserCoupon.create({ user: u.userId, coupon: coupon._id, status:'available' });
    }
    res.json({ success:true, data:{ couponId: coupon._id, code, segment, issued: users.length } });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
};
