import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import crypto from 'crypto';

const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

type JsonValue=JsonObject|JsonValue[]|string|number|boolean|null;
type JsonObject={ [key:string]: JsonValue };

function canonicalize(value:JsonValue):JsonValue{
 if(Array.isArray(value))return value.map(canonicalize);
 if(value&&typeof value==='object'){
  const obj=value as JsonObject;
  return Object.keys(obj).sort().reduce((out,key)=>{
   out[key]=canonicalize(obj[key]);
   return out;
  },{} as JsonObject);
 }
 return value;
}

export async function POST(req:NextRequest){
 try{
  const raw=await req.text(),signature=req.headers.get('x-webhook-signature')||'',timestamp=req.headers.get('x-webhook-timestamp')||'';
  const secret=process.env.CASHFREE_CLIENT_SECRET||'';
  const expected=crypto.createHmac('sha256',secret).update(timestamp+raw).digest('base64');
  const valid=!!secret&&!!signature&&!!timestamp&&Buffer.byteLength(signature)===Buffer.byteLength(expected)&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
  if(!valid)return NextResponse.json({error:'Invalid signature'},{status:401});

  const body=JSON.parse(raw),type=String(body.type||''),data=body.data||{},details=data.subscription_details||{};
  const subscriptionId=details.subscription_id||data.subscription_id||null;
  if(!subscriptionId)return NextResponse.json({ok:true});

  const status=String(details.subscription_status||'').toUpperCase();
  const active=status==='ACTIVE'||type==='SUBSCRIPTION_PAYMENT_SUCCESS';
  const paymentFailed=['SUBSCRIPTION_PAYMENT_FAILED','SUBSCRIPTION_PAYMENT_CANCELLED'].includes(type);
  const authFailed=type==='SUBSCRIPTION_AUTH_STATUS'&&['FAILED','CANCELLED'].includes(String(data.authorization_details?.authorization_status||'').toUpperCase());
  const inactive=['CUSTOMER_CANCELLED','CUSTOMER_PAUSED','EXPIRED','CANCELLED','CARD_EXPIRED','LINK_EXPIRED'].includes(status);
  const pastDue=status==='ON_HOLD'||paymentFailed;

  const eventTimeRaw=typeof body.event_time==='string'?body.event_time:'';
  const eventTime=eventTimeRaw&&!Number.isNaN(Date.parse(eventTimeRaw))?new Date(eventTimeRaw).toISOString():null;
  const expiryRaw=typeof details.subscription_expiry_time==='string'?details.subscription_expiry_time:'';
  const expiry=expiryRaw&&!Number.isNaN(Date.parse(expiryRaw))?new Date(expiryRaw).toISOString():null;
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(canonicalize(body as JsonValue))).digest('hex');

  const db=admin();
  const {data:result,error}=await db.rpc('process_subscription_webhook',{
   p_provider:'cashfree',
   p_event_fingerprint:fingerprint,
   p_provider_subscription_id:String(subscriptionId),
   p_webhook_timestamp:eventTime,
   p_subscription_status:details.subscription_status?String(details.subscription_status):null,
   p_subscription_expiry_time:expiry,
   p_active:active,
   p_past_due:pastDue,
   p_inactive:inactive,
   p_auth_failed:authFailed
  });
  if(error)return NextResponse.json({error:'Webhook processing failed'},{status:500});
  if(result==='retry')return NextResponse.json({error:'Webhook processing incomplete'},{status:500});
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:'Webhook error'},{status:500});}
}
