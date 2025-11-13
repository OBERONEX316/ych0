const assert = require('assert');
const svc = require('../services/inventoryOptimizationService');
function approx(a,b,tol=1e-2){return Math.abs(a-b)<=tol}
assert(approx(svc.serviceLevelToZ(0.95),1.64,0.05));
assert(approx(svc.periodDemandPerDay(30,'monthly'),1,0.01));
assert(svc.classifyABC({price:1000},100,100000)==='A');
console.log('tests passed')