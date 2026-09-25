'use client';
import {useState} from 'react';
import {Search,Package,CheckCircle2,Truck,Clock,ArrowLeft} from 'lucide-react';
import Link from 'next/link';

type Order=any;
const steps=[['new','Order placed'],['confirmed','Confirmed'],['preparing','Preparing'],['done','Delivered']];
function normalize(s:string){return String(s||'').toLowerCase();}
export default function TrackOrder(){
 const [phone,setPhone]=useState(''),[orderId,setOrderId]=useState(''),[order,setOrder]=useState<Order|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function track(){
  setError('');setOrder(null);setLoading(true);
  const r=await fetch('/api/orders/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_id:orderId.trim(),phone:phone.replace(/\D/g,'')})});
  const d=await r.json(); if(r.ok)setOrder(d.order); else setError(d.error||'Order not found'); setLoading(false);
 }
 const status=normalize(order?.status); const cancelled=status==='cancelled';
 const current=Math.max(0,steps.findIndex(s=>s[0]===status));
 return <main className="track-page">
  <div className="track-shell">
   <Link href="/" className="track-back"><ArrowLeft size={16}/> Back</Link>
   <header className="track-head"><span className="eyebrow">HEPRA ORDER TRACKING</span><h1>Where is my order?</h1><p>Enter your order ID and the mobile number used at checkout.</p></header>
   <section className="track-search">
    <input placeholder="Order ID" value={orderId} onChange={e=>setOrderId(e.target.value)}/>
    <input inputMode="tel" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={e=>setPhone(e.target.value)}/>
    <button onClick={track} disabled={loading||!orderId.trim()||phone.replace(/\D/g,'').length!==10}><Search size={17}/>{loading?'Checking…':'Track order'}</button>
    {error&&<div className="track-error">{error}</div>}
   </section>
   {order&&<section className="track-card">
    <div className="track-summary"><div><small>ORDER</small><strong>#{String(order.id).slice(0,8).toUpperCase()}</strong></div><div><small>PLACED</small><strong>{new Date(order.created_at).toLocaleDateString('en-IN')}</strong></div><div><small>TOTAL</small><strong>₹{Number(order.total||0).toLocaleString('en-IN')}</strong></div></div>
    {cancelled?<div className="track-cancel"><Package/> <div><b>Order cancelled</b><span>This order is no longer being processed.</span></div></div>:<div className="track-steps">{steps.map((s,i)=><div className={i<=current?'track-step active':'track-step'} key={s[0]}><div className="track-dot">{i<=current?<CheckCircle2 size={17}/>:<Clock size={17}/>}</div><div><b>{s[1]}</b><small>{i<current?'Completed':i===current?'Current status':'Pending'}</small></div></div>)}</div>}
    <div className="track-details"><div><small>PAYMENT</small><b>{String(order.payment_method||'COD').toUpperCase()} · {String(order.payment_status||'pending')}</b></div><div><small>SHIPPING</small><b>{order.shipping_status||order.shipping_method||'Standard'}</b></div>{order.courier_name&&<div><small>COURIER</small><b>{order.courier_name}{order.awb_code?' · '+order.awb_code:''}</b></div>}{order.tracking_url&&<a href={order.tracking_url} target="_blank" rel="noreferrer"><Truck size={16}/> Open courier tracking</a>}</div>
   </section>}
  </div>
 </main>
}