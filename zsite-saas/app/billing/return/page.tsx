'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,Clock3,XCircle} from 'lucide-react';
import {supabase} from '../../../lib/supabase';

export default function BillingReturn(){
 const [status,setStatus]=useState('checking'),[message,setMessage]=useState('');
 useEffect(()=>{
   const p=new URLSearchParams(window.location.search),id=p.get('subscription_id')||'';
   if(!id){setStatus('failed');setMessage('Missing subscription ID');return;}
   const run=async()=>{
     try{
       const {data:{session}}=await supabase().auth.getSession();
       if(!session){setStatus('failed');setMessage('Please sign in again.');return;}
       const r=await fetch('/api/subscriptions/status',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({subscription_id:id})});
       const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to verify subscription');
       setStatus(d.status);setMessage(d.message||'');
     }catch(e:any){setStatus('failed');setMessage(e.message)}
   };
   run();
 },[]);
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f3efe3'}}>
  <section style={{maxWidth:560,textAlign:'center',padding:40,border:'2px solid #111',background:'#fff',boxShadow:'8px 8px 0 #111'}}>
   {status==='active'?<CheckCircle2 size={56}/>:status==='failed'?<XCircle size={56}/>:<Clock3 size={56}/>}
   <h1 style={{fontSize:40,fontWeight:900,margin:'18px 0 8px'}}>{status==='active'?'PLAN ACTIVATED':status==='failed'?'PAYMENT NOT VERIFIED':'VERIFYING SUBSCRIPTION…'}</h1>
   <p>{message||'Please wait while we confirm your Cashfree subscription.'}</p>
   <a href="/" style={{display:'inline-block',marginTop:24,fontWeight:800}}>RETURN TO DASHBOARD →</a>
  </section>
 </main>
}