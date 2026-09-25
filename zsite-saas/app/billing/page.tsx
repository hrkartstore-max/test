'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Check} from 'lucide-react';
import {supabase} from '../../lib/supabase';

export default function BillingPage(){
 const [plan,setPlan]=useState<'starter'|'growth'>('starter'),[annual,setAnnual]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const p=new URLSearchParams(window.location.search);setPlan(p.get('plan')==='growth'?'growth':'starter');setAnnual(p.get('interval')==='yearly');setLoading(false)},[]);
 const amount=plan==='starter'?(annual?2990:299):(annual?4990:499);
 async function start(){
  setBusy(true);setError('');
  try{
   const {data:{session}}=await supabase().auth.getSession();
   if(!session){window.location.href='/connect?next='+encodeURIComponent('/billing?plan='+plan+'&interval='+(annual?'yearly':'monthly'));return;}
   const r=await fetch('/api/subscriptions/create',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({plan,billing_interval:annual?'yearly':'monthly'})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to start subscription');
   await new Promise<void>((resolve,reject)=>{if((window as any).Cashfree){resolve();return;}const s=document.createElement('script');s.src='https://sdk.cashfree.com/js/v3/cashfree.js';s.onload=()=>resolve();s.onerror=()=>reject(new Error('Cashfree SDK failed to load'));document.body.appendChild(s)});
   const cf=(window as any).Cashfree({mode:process.env.NEXT_PUBLIC_CASHFREE_ENV==='production'?'production':'sandbox'});
   const result=await cf.subscriptionsCheckout({subsSessionId:d.subscription_session_id,redirectTarget:'_self'});
   if(result?.error)throw new Error(result.error.message||'Cashfree checkout failed');
  }catch(e:any){setError(e.message||'Unable to start checkout');setBusy(false)}
 }
 if(loading)return null;
 return <main style={{minHeight:'100vh',background:'#f3efe3',padding:24,color:'#111722'}}>
  <div style={{maxWidth:760,margin:'0 auto'}}>
   <a href="/pricing" style={{display:'inline-flex',gap:8,alignItems:'center',fontWeight:800,marginBottom:30}}><ArrowLeft size={16}/> Back to pricing</a>
   <div style={{background:'#fff',border:'2px solid #111',boxShadow:'9px 9px 0 #111',padding:32}}>
    <div style={{fontSize:12,fontWeight:900,letterSpacing:2}}>HEPRA STORE BUILDER · BILLING</div>
    <h1 style={{fontSize:'clamp(40px,8vw,72px)',lineHeight:.9,margin:'16px 0'}}>UPGRADE<br/><em>YOUR STORE.</em></h1>
    <div style={{display:'flex',gap:8,margin:'24px 0',flexWrap:'wrap'}}>
      <button onClick={()=>setPlan('starter')} style={{padding:'12px 18px',fontWeight:900,border:'2px solid #111',background:plan==='starter'?'#2563eb':'#fff',color:plan==='starter'?'#fff':'#111'}}>STARTER</button>
      <button onClick={()=>setPlan('growth')} style={{padding:'12px 18px',fontWeight:900,border:'2px solid #111',background:plan==='growth'?'#7c3aed':'#fff',color:plan==='growth'?'#fff':'#111'}}>GROWTH</button>
      <button onClick={()=>setAnnual(v=>!v)} style={{padding:'12px 18px',fontWeight:900,border:'2px solid #111',background:annual?'#111':'#fff',color:annual?'#fff':'#111'}}>{annual?'YEARLY · SAVE':'MONTHLY'}</button>
    </div>
    <div style={{fontSize:54,fontWeight:900}}>₹{amount.toLocaleString('en-IN')} <small style={{fontSize:14,fontWeight:700}}>{annual?'/ year':'/ month'}</small></div>
    <div style={{display:'grid',gap:10,margin:'22px 0'}}>{(plan==='starter'?['100 products','Custom domain','Unlimited categories','Discounts & coupons','Shiprocket','Order management']:['Unlimited products','Advanced discounts','Analytics','WhatsApp tools','Multiple payment gateways','Advanced shipping']).map(x=><div key={x} style={{display:'flex',gap:9,fontWeight:700}}><Check size={17}/>{x}</div>)}</div>
    {error&&<div style={{padding:12,border:'1px solid #b42318',marginBottom:14}}>{error}</div>}
    <button onClick={start} disabled={busy} style={{width:'100%',padding:18,border:0,background:'#111',color:'#fff',fontWeight:900,fontSize:16,display:'flex',justifyContent:'center',gap:8,alignItems:'center'}}>{busy?'OPENING CASHFREE…':'CONTINUE TO SECURE PAYMENT'}<ArrowRight size={18}/></button>
    <p style={{fontSize:11,opacity:.65,marginTop:14}}>Recurring billing is handled by Cashfree. HEPRA never receives your card or UPI mandate credentials.</p>
   </div>
  </div>
 </main>
}
