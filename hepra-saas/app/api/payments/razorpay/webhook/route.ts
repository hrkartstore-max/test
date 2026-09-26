import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req:NextRequest){
  const raw=await req.text(); const sig=req.headers.get('x-razorpay-signature')||''; const secret=process.env.RAZORPAY_WEBHOOK_SECRET||process.env.RAZORPAY_KEY_SECRET||'';
  const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
  if(!secret||!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return NextResponse.json({error:'Invalid signature'},{status:401});
  const body=JSON.parse(raw); const entity=body?.payload?.payment?.entity; const event=String(body?.event||'');
  const gatewayOrderId=entity?.order_id;
  if(!gatewayOrderId)return NextResponse.json({ok:true});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const {data:order}=await db.from('orders').select('id').eq('gateway_order_id',gatewayOrderId).maybeSingle();
  if(order)await db.from('orders').update({payment_status:event==='payment.captured'||event==='order.paid'?'paid':event.includes('failed')?'failed':'pending',gateway_payment_id:entity?.id||null}).eq('id',order.id);
  return NextResponse.json({ok:true});
}