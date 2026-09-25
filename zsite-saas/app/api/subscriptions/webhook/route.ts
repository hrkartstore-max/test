import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import crypto from 'crypto';

const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req:NextRequest){
 try{
  const raw=await req.text(),signature=req.headers.get('x-webhook-signature')||'',timestamp=req.headers.get('x-webhook-timestamp')||'';
  const secret=process.env.CASHFREE_CLIENT_SECRET||'';
  const expected=crypto.createHmac('sha256',secret).update(timestamp+raw).digest('base64');
  if(!signature||!timestamp||Buffer.byteLength(signature)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return NextResponse.json({error:'Invalid signature'},{status:401});
  const body=JSON.parse(raw),type=String(body.type||''),data=body.data||{},details=data.subscription_details||{};
  const subscriptionId=details.subscription_id||data.subscription_id;
  if(!subscriptionId)return NextResponse.json({ok:true});
  const db=admin();
  const {data:sub}=await db.from('store_subscriptions').select('*').eq('provider_subscription_id',subscriptionId).maybeSingle();
  if(!sub)return NextResponse.json({ok:true});
  const status=String(details.subscription_status||'').toUpperCase();
  const active=status==='ACTIVE'||type==='SUBSCRIPTION_PAYMENT_SUCCESS';
  const inactive=['ON_HOLD','CUSTOMER_CANCELLED','CUSTOMER_PAUSED','EXPIRED','CANCELLED','CARD_EXPIRED','LINK_EXPIRED'].includes(status);
  await db.from('store_subscriptions').update({status:details.subscription_status||sub.status,current_period_end:details.subscription_expiry_time||sub.current_period_end,updated_at:new Date().toISOString()}).eq('id',sub.id);
  if(active)await db.from('stores').update({plan:sub.plan,billing_interval:sub.billing_interval,subscription_status:'active'}).eq('id',sub.store_id);
  else if(inactive)await db.from('stores').update({plan:'free',billing_interval:'monthly',subscription_status:status==='ON_HOLD'?'past_due':'canceled'}).eq('id',sub.store_id);
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e?.message||'Webhook error'},{status:500});}
}