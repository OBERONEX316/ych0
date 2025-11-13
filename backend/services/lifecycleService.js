const Order = require('../models/Order');
const UserLifecycle = require('../models/UserLifecycle');

function calcSegment(r,f,m){
  if (r<=7 && f>=5 && m>=2000) return 'platinum';
  if (r<=14 && f>=3 && m>=1000) return 'gold';
  if (r<=30 && f>=2 && m>=300) return 'silver';
  return 'bronze';
}

async function computeForUser(userId){
  const orders = await Order.find({ user: userId, status: { $in: ['confirmed','shipped','delivered','completed'] } }).sort({ createdAt: -1 });
  const now = Date.now();
  const recencyDays = orders.length>0 ? Math.round((now - orders[0].createdAt.getTime())/ (24*3600*1000)) : 999;
  const frequency = orders.length;
  const monetary = orders.reduce((s,o)=> s + (o.finalPrice || o.totalPrice || 0), 0);
  const segment = calcSegment(recencyDays, frequency, monetary);
  const doc = await UserLifecycle.findOneAndUpdate({ userId }, { recencyDays, frequency, monetary, segment, updatedAt: new Date() }, { upsert: true, new: true });
  return doc;
}

async function batchCompute(limit=1000){
  const users = await Order.distinct('user');
  const out = [];
  for (const uid of users.slice(0,limit)){
    out.push(await computeForUser(uid));
  }
  return out;
}

module.exports = { computeForUser, batchCompute };
