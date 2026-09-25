import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req:NextRequest){
  const raw=await req.text();
  const sig=req.headers.get('x-webhook-signature')||'',ts=req.headers.get('x-webhook-timestamp')||'';
  const secret=process.env.CASHFREE_CLIENT_SECRET||'';
  const expected=crypto.createHmac('sha256',secret).update(ts+raw).digest('base64');
  if(!secret||!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return NextResponse.json({error:'Invalid signature'},{status:401});
  const body=JSON.parse(raw); const data=body?.data||{}; const cfOrderId=data?.order?.order_id||data?.order_id; const payment=data?.payment||{};
  if(!cfOrderId)return NextResponse.json({ok:true});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const status=String(body?.type||'').toUpperCase();
  const paid=status.includes('SUCCESS')||String(payment?.payment_status||'').toUpperCase()==='SUCCESS';
  const failed=status.includes('FAILED')||status.includes('CANCEL');
  const {data:order}=await db.from('orders').select('id').eq('gateway_order_id',cfOrderId).maybeSingle();
  if(order)await db.from('orders').update({payment_status:paid?'paid':failed?'failed':'pending',gateway_payment_id:payment?.cf_payment_id?String(payment.cf_payment_id):null}).eq('id',order.id);
  return NextResponse.json({ok:true});
}