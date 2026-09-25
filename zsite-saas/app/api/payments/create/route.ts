import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);}
export async function POST(req:NextRequest){
  try{
    const {order_id,provider}=await req.json();
    if(!order_id)return NextResponse.json({error:'order_id is required'},{status:400});
    const db=admin();
    const {data:order,error}=await db.from('orders').select('*').eq('id',order_id).maybeSingle();
    if(error||!order)return NextResponse.json({error:'Order not found'},{status:404});
    if(order.payment_method!=='upi')return NextResponse.json({error:'Online payment is not selected for this order'},{status:400});
    const selected=provider==='razorpay'||provider==='cashfree'?provider:(process.env.PAYMENT_PROVIDER||'cashfree');
    if(selected==='cashfree'){
      const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
      const cfId=process.env.CASHFREE_CLIENT_ID,cfSecret=process.env.CASHFREE_CLIENT_SECRET;
      if(!cfId||!cfSecret)return NextResponse.json({error:'Cashfree server configuration is incomplete'},{status:500});
      const r=await fetch(base+'/orders',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','x-client-id':cfId,'x-client-secret':cfSecret,'x-api-version':'2025-01-01','x-idempotency-key':crypto.randomUUID()},body:JSON.stringify({order_id:'zs_'+order.id.replaceAll('-','').slice(0,28),order_currency:'INR',order_amount:Number(order.total),customer_details:{customer_id:order.id,customer_name:order.customer_name,customer_phone:order.customer_phone},order_meta:{return_url:(process.env.NEXT_PUBLIC_SITE_URL||'')+'/store/payment-return?order_id={order_id}',notify_url:(process.env.NEXT_PUBLIC_SITE_URL||'')+'/api/payments/cashfree/webhook'}})});
      const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Cashfree order creation failed',details:d},{status:502});
      await db.from('orders').update({gateway_provider:'cashfree',gateway_order_id:d.order_id}).eq('id',order.id);
      return NextResponse.json({provider:'cashfree',order_id:order.id,gateway_order_id:d.order_id,payment_session_id:d.payment_session_id});
    }
    const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
    if(!key||!secret)return NextResponse.json({error:'Razorpay server configuration is incomplete'},{status:500});
    const auth=Buffer.from(key+':'+secret).toString('base64');
    const r=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/json'},body:JSON.stringify({amount:Math.round(Number(order.total)*100),currency:'INR',receipt:order.id.slice(0,40),notes:{store_id:order.store_id,order_id:order.id}})});
    const d=await r.json(); if(!r.ok)return NextResponse.json({error:'Razorpay order creation failed',details:d},{status:502});
    await db.from('orders').update({gateway_provider:'razorpay',gateway_order_id:d.id}).eq('id',order.id);
    return NextResponse.json({provider:'razorpay',order_id:order.id,gateway_order_id:d.id,key_id:key,amount:d.amount,currency:d.currency});
  }catch(e:any){return NextResponse.json({error:e?.message||'Payment initialization failed'},{status:500});}
}