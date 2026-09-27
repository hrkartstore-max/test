import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req:NextRequest){
  try{
    const raw=await req.text();
    const sig=req.headers.get('x-razorpay-signature')||'';
    const eventId=req.headers.get('x-razorpay-event-id')||null;
    const secret=process.env.RAZORPAY_WEBHOOK_SECRET||'';
    if(!secret)return NextResponse.json({error:'Razorpay webhook configuration is incomplete'},{status:503});
    const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
    const valid=!!sig&&Buffer.byteLength(sig)===Buffer.byteLength(expected)&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected));
    if(!valid)return NextResponse.json({error:'Invalid signature'},{status:401});

    const body=JSON.parse(raw);
    const entity=body?.payload?.payment?.entity;
    const event=String(body?.event||'');
    const gatewayOrderId=entity?.order_id;
    if(!gatewayOrderId)return NextResponse.json({ok:true});

    const createdAt=typeof body?.created_at==='number'?new Date(body.created_at*1000):null;
    const webhookTimestamp=createdAt&&!Number.isNaN(createdAt.getTime())?createdAt.toISOString():null;
    const fingerprint=crypto.createHash('sha256').update(raw).digest('hex');
    const paymentStatus=event==='payment.captured'||event==='order.paid'?'paid':event.includes('failed')?'failed':'pending';

    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const {data:result,error}=await db.rpc('process_payment_webhook',{
      p_provider:'razorpay',
      p_event_fingerprint:fingerprint,
      p_provider_event_id:eventId,
      p_gateway_order_id:String(gatewayOrderId),
      p_webhook_timestamp:webhookTimestamp,
      p_payment_status:paymentStatus,
      p_gateway_payment_id:entity?.id?String(entity.id):null
    });
    if(error)return NextResponse.json({error:'Webhook processing failed'},{status:500});
    if(result==='retry')return NextResponse.json({error:'Webhook processing incomplete'},{status:500});
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:'Webhook error'},{status:500});}
}
