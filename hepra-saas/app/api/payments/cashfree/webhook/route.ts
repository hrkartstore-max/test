import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req:NextRequest){
  try{
    const raw=await req.text();
    const sig=req.headers.get('x-webhook-signature')||'',ts=req.headers.get('x-webhook-timestamp')||'';
    const secret=process.env.CASHFREE_CLIENT_SECRET||'';
    const expected=crypto.createHmac('sha256',secret).update(ts+raw).digest('base64');
    const valid=!!secret&&!!sig&&!!ts&&Buffer.byteLength(sig)===Buffer.byteLength(expected)&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected));
    if(!valid)return NextResponse.json({error:'Invalid signature'},{status:401});

    const body=JSON.parse(raw);
    const data=body?.data||{},payment=data?.payment||{};
    const cfOrderId=data?.order?.order_id||data?.order_id;
    if(!cfOrderId)return NextResponse.json({ok:true});

    const status=String(body?.type||'').toUpperCase();
    const paymentStatus=String(payment?.payment_status||'').toUpperCase();
    const mappedStatus=status.includes('SUCCESS')||paymentStatus==='SUCCESS'?'paid':status.includes('FAILED')||status.includes('CANCEL')?'failed':'pending';
    const eventTimeRaw=typeof body?.event_time==='string'?body.event_time:'';
    const eventTime=eventTimeRaw&&!Number.isNaN(Date.parse(eventTimeRaw))?new Date(eventTimeRaw).toISOString():null;
    const fingerprint=crypto.createHash('sha256').update(raw).digest('hex');
    const paymentId=payment?.cf_payment_id?String(payment.cf_payment_id):null;

    const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const {data:result,error}=await db.rpc('process_payment_webhook',{
      p_provider:'cashfree',
      p_event_fingerprint:fingerprint,
      p_provider_event_id:null,
      p_gateway_order_id:String(cfOrderId),
      p_webhook_timestamp:eventTime,
      p_payment_status:mappedStatus,
      p_gateway_payment_id:paymentId
    });
    if(error)return NextResponse.json({error:'Webhook processing failed'},{status:500});
    if(result==='retry')return NextResponse.json({error:'Webhook processing incomplete'},{status:500});
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:'Webhook error'},{status:500});}
}
