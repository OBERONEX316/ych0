import { useEffect, useState } from 'react';

export default function useExperiment(key){
  const [variant,setVariant] = useState('A');
  useEffect(()=>{
    let mounted = true;
    fetch('/api/experiments/assign', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key }) })
      .then(r=>r.json()).then(res=>{ if(mounted && res.success) setVariant(res.data.variant||'A');
        fetch('/api/experiments/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, variant: res.data.variant||'A', type:'exposure' }) });
      }).catch(()=>{});
    return ()=>{ mounted=false };
  },[key]);
  return { variant, track: (type)=> fetch('/api/experiments/track',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, variant, type }) }) };
}