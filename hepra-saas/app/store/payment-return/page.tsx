'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,Clock3,XCircle,ArrowLeft} from 'lucide-react';

export default function PaymentReturn(){
 const [status,setStatus]=useState('checking'),[error,setError]=useState('');
 const params=typeof window!=='undefined'?new URLSearchParams(window.location.search):null;
 const orderId=params?.get('order_id')||'';
 useEffect(()=>{if(!orderId){setStatus('failed');setError('Missing order ID');return;}let n=0;const check=async()=>{n++;try{const r=await fetch('/api/payments/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:orderId})});const d=await r.json();if(d.status==='paid'){setStatus('paid');return;}if(d.status==='failed'){setStatus('failed');return;}if(n<6)setTimeout(check,2500);else setStatus('pending')}catch(e:any){setError(e?.message||'Unable to verify payment');setStatus('failed')}};check()},[orderId]);
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><section style={{maxWidth:520,textAlign:'center',padding:32,borderRadius:24,border:'1px solid #e5e7eb'}}>{status==='paid'?<><CheckCircle2 size={52}/><h1>Payment successful</h1><p>Your payment was verified successfully. Order ID: {orderId}</p></>:status==='failed'?<><XCircle size={52}/><h1>Payment not verified</h1><p>{error||'The payment was not completed.'}</p></>:<><Clock3 size={52}/><h1>Verifying payment…</h1><p>Please wait while we confirm the gateway response.</p></>}<a href="/" style={{display:'inline-flex',gap:8,marginTop:20,alignItems:'center'}}><ArrowLeft size={16}/> Back to store</a></section></main>
}