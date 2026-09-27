import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);}
function cleanPhone(value: unknown){return String(value||'').replace(/\D/g,'');}
function validOrderId(value: unknown){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}

export async function POST(req:NextRequest){
 try{
  const {order_id,provider,phone}=await req.json(); const clean=cleanPhone(phone);
  if(!validOrderId(order_id)||clean.length!==10)return NextResponse.json({error:'Valid order ID and mobile number are required'},{status:400});
  const db=admin();
  const {data:order,error}=await db.from('orders').select('id,store_id,customer_name,customer_phone,total,payment_method,payment_status,gateway_provider,gateway_order_id').eq('id',order_id).eq('customer_phone',clean).maybeSingle();
  if(error||!order)return NextResponse.json({error:'Order not found'},{status:404});
  if(order.payment_method!=='upi')return NextResponse.json({error:'Online payment is not selected for this order'},{status:400});
  if(String(order.payment_status||'').toLowerCase()==='paid')return NextResponse.json({error:'Payment is already completed for this order'},{status:409});
  if(order.gateway_order_id)return NextResponse.json({error:'Payment is already initialized for this order'},{status:409});
  const selected=provider==='razorpay'||provider==='cashfree'?provider:(process.env.PAYMENT_PROVIDER||'cashfree');
  if(selected==='cashfree'){
   const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg'; const cfId=process.env.CASHFREE_CLIENT_ID,cfSecret=process.env.CASHFREE_CLIENT_SECRET;
   if(!cfId||!cfSecret)return NextResponse.json({error:'Cashfree server configuration is incomplete'},{status:500});
   const r=await fetch(base+'/orders',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','x-client-id':cfId,'x-client-secret':cfSecret,'x-api-version':'2025-01-01','x-idempotency-key':'order-payment-'+order.id},body:JSON.stringify({order_id:'zs_'+order.id.replaceAll('-','').slice(0,28),order_currency:'INR',order_amount:Number(order.total),customer_details:{customer_id:order.id,customer_name:order.customer_name,customer_phone:clean},order_meta:{return_url:(process.env.NEXT_PUBLIC_SITE_URL||'')+'/store/payment-return?order_id='+encodeURIComponent(order.id)+'&phone='+encodeURIComponent(clean),notify_url:(process.env.NEXT_PUBLIC_SITE_URL||'')+'/api/payments/cashfree/webhook'}})});
   const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Cashfree order creation failed'},{status:502});
   const {error:updateError}=await db.from('orders').update({gateway_provider:'cashfree',gateway_order_id:d.order_id}).eq('id',order.id).is('gateway_order_id',null);
   if(updateError)return NextResponse.json({error:'Unable to initialize payment'},{status:500});
   return NextResponse.json({provider:'cashfree',order_id:order.id,gateway_order_id:d.order_id,payment_session_id:d.payment_session_id});
  }
  const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET; if(!key||!secret)return NextResponse.json({error:'Razorpay server configuration is incomplete'},{status:500});
  const auth=Buffer.from(key+':'+secret).toString('base64');
  const r=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/json'},body:JSON.stringify({amount:Math.round(Number(order.total)*100),currency:'INR',receipt:order.id.slice(0,40),notes:{store_id:order.store_id,order_id:order.id}})});
  const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Razorpay order creation failed'},{status:502});
  const {error:updateError}=await db.from('orders').update({gateway_provider:'razorpay',gateway_order_id:d.id}).eq('id',order.id).is('gateway_order_id',null); if(updateError)return NextResponse.json({error:'Unable to initialize payment'},{status:500});
  return NextResponse.json({provider:'razorpay',order_id:order.id,gateway_order_id:d.id,key_id:key,amount:d.amount,currency:d.currency});
 }catch{return NextResponse.json({error:'Payment initialization failed'},{status:500});}
}