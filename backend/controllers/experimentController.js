const { validationResult } = require('express-validator');
const Experiment = require('../models/Experiment');
const ExperimentAssignment = require('../models/ExperimentAssignment');
const ExperimentEvent = require('../models/ExperimentEvent');

exports.create = async (req,res)=>{
  const errors = validationResult(req); if(!errors.isEmpty()) return res.status(400).json({success:false,errors:errors.array()});
  const { key, variants } = req.body; const exp = await Experiment.create({ key, variants });
  res.json({ success:true, data: exp });
};

exports.assign = async (req,res)=>{
  const { key } = req.body; const sessionId = req.cookies?.behavior_session_id || req.body.sessionId || `sid_${Date.now()}`;
  const userId = req.user?._id || null; const exp = await Experiment.findOne({ key, status: 'active' }); if(!exp) return res.status(404).json({success:false,message:'not found'});
  let assignment = await ExperimentAssignment.findOne({ experiment: exp._id, sessionId });
  if(!assignment){
    const total = exp.variants.reduce((s,v)=>s+v.ratio,0); let r = Math.random()*total; let picked = exp.variants[0].name; for(const v of exp.variants){ if(r<=v.ratio){ picked=v.name; break } r-=v.ratio }
    assignment = await ExperimentAssignment.create({ experiment: exp._id, userId, sessionId, variant: picked });
  }
  res.json({ success:true, data: { variant: assignment.variant } });
};

exports.track = async (req,res)=>{
  const { key, variant, type } = req.body; const sessionId = req.cookies?.behavior_session_id || req.body.sessionId || `sid_${Date.now()}`; const userId = req.user?._id || null;
  const exp = await Experiment.findOne({ key }); if(!exp) return res.status(404).json({success:false});
  await ExperimentEvent.create({ experiment: exp._id, variant, type, userId, sessionId });
  res.json({ success:true });
};

exports.stats = async (req,res)=>{
  const { key, successType } = req.query; const exp = await Experiment.findOne({ key }); if(!exp) return res.status(404).json({success:false});
  const variants = exp.variants.map(v=>v.name);
  const data = {};
  for(const v of variants){
    const total = await ExperimentEvent.countDocuments({ experiment: exp._id, variant: v });
    const success = await ExperimentEvent.countDocuments({ experiment: exp._id, variant: v, type: successType || 'conversion' });
    data[v]={ total, success };
  }
  const names = Object.keys(data);
  if(names.length>=2){
    const a = data[names[0]], b = data[names[1]];
    const r = await significanceLocal(a.success,a.total,b.success,b.total);
    res.json({ success:true, data: { variants: data, significance: r } });
  } else {
    res.json({ success:true, data: { variants: data } });
  }
};

async function significanceLocal(a_success,a_total,b_success,b_total){
  const axios = require('axios');
  try{
    const r = await axios.post(process.env.ANALYTICS_URL || 'http://localhost:8000/api/ab/significance',{a_success,a_total,b_success,b_total});
    return r.data;
  }catch(e){
    const pa=a_success/a_total, pb=b_success/b_total; const p=(a_success+b_success)/(a_total+b_total); const se=Math.sqrt(p*(1-p)*(1/a_total+1/b_total)); const z=se>0?(pb-pa)/se:0; const p_value=2*(1-0.5*(1+erf(Math.abs(z)/Math.sqrt(2)))); return { z, p_value, lift: pb-pa, fallback:true };
  }
}
function erf(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const sign=x<0?-1:1; const absx=Math.abs(x); const t=1.0/(1.0+p*absx); const y=1.0-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-absx*absx); return sign*y; }