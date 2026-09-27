import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
function cleanPhone(value: unknown){return String(value||'').replace(/\D/g,'');}
function validOrderId(value: unknown){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export async function POST(req:NextRequest){
 try{
  const {order_id,provider,phone}=await req.json(); const clean=cleanPhone(phone);
  if(!validOrderId(order_id)||clean.length!==10)return NextResponse.json({error:'Valid order ID and mobile number are required'},{status:400});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const {data:order,error}=await db.from('orders').select('id,payment_status,payment_method,gateway_provider,gateway_order_id').eq('id',order_id).eq('customer_phone',clean).maybeSingle();
  if(error||!order)return NextResponse.json({error:'Order not found'},{status:404});
  if(order.payment_method!=='upi')return NextResponse.json({error:'Online payment is not selected'},{status:400});
  if(!order.gateway_order_id)return NextResponse.json({error:'Payment has not been initialized for this order'},{status:409});
  const selected=provider==='cashfree'||provider==='razorpay'?provider:order.gateway_provider;
  if(selected!==order.gateway_provider)return NextResponse.json({error:'Payment provider mismatch'},{status:400});
  if(String(order.payment_status||'').toLowerCase()==='paid')return NextResponse.json({status:'paid'});
  if(selected==='cashfree'){
   const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
   const h={'Content-Type':'application/json','Accept':'application/json','x-client-id':process.env.CASHFREE_CLIENT_ID||'','x-client-secret':process.env.CASHFREE_CLIENT_SECRET||'','x-api-version':'2025-01-01'};
   const r=await fetch(base+'/orders/'+encodeURIComponent(order.gateway_order_id),{headers:h}); const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Cashfree status check failed'},{status:502});
   const s=String(d.order_status||'').toUpperCase(); const status=s==='PAID'?'paid':s==='ACTIVE'?'pending':s==='EXPIRED'||s==='TERMINATED'?'failed':String(order.payment_status||'pending');
   if(status!==order.payment_status)await db.from('orders').update({payment_status:status}).eq('id',order.id);
   return NextResponse.json({status});
  }
  if(selected==='razorpay'){
   const key=process.env.RAZORPAY_KEY_ID||'',secret=process.env.RAZORPAY_KEY_SECRET||''; if(!key||!secret)return NextResponse.json({error:'Razorpay server configuration is incomplete'},{status:500});
   const auth=Buffer.from(key+':'+secret).toString('base64'); const r=await fetch('https://api.razorpay.com/v1/orders/'+encodeURIComponent(order.gateway_order_id)+'/payments',{headers:{Authorization:'Basic '+auth}}); const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Razorpay status check failed'},{status:502});
   const paid=Array.isArray(d.items)&&d.items.some((x:any)=>x.status==='captured'||x.status==='authorized');
   if(paid&&order.payment_status!=='paid')await db.from('orders').update({payment_status:'paid',gateway_payment_id:d.items.find((x:any)=>x.status==='captured'||x.status==='authorized')?.id||null}).eq('id',order.id);
   return NextResponse.json({status:paid?'paid':String(order.payment_status||'pending')});
  }
  return NextResponse.json({error:'Unsupported provider'},{status:400});
 }catch{return NextResponse.json({error:'Payment status check failed'},{status:500});}
}