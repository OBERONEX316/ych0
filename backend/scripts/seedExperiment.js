const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Experiment = require('../models/Experiment');
(async()=>{
  await connectDB();
  const key='home_banner';
  let exp=await Experiment.findOne({key});
  if(!exp){ exp=await Experiment.create({ key, variants: [ {name:'A',ratio:50}, {name:'B',ratio:50} ] }); }
  console.log(JSON.stringify(exp));
  process.exit(0);
})()