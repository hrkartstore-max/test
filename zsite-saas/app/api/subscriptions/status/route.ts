import { NextRequest,NextResponse } from 'next/server';
import {createClient} from '@supabase/supabase-js';

const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req:NextRequest){
 try{
  const auth=req.headers.get('authorization')||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token)return NextResponse.json({error:'Authentication required'},{status:401});
  const userClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const {data:{user}}=await userClient.auth.getUser(token);
  if(!user)return NextResponse.json({error:'Invalid session'},{status:401});
  const {subscription_id}=await req.json();
  const db=admin();
  const {data:sub}=await db.from('store_subscriptions').select('*').eq('provider_subscription_id',subscription_id).maybeSingle();
  if(!sub)return NextResponse.json({error:'Subscription not found'},{status:404});
  const {data:store}=await db.from('stores').select('id,owner_id').eq('id',sub.store_id).eq('owner_id',user.id).maybeSingle();
  if(!store)return NextResponse.json({error:'Forbidden'},{status:403});
  const cfId=process.env.CASHFREE_CLIENT_ID,cfSecret=process.env.CASHFREE_CLIENT_SECRET;
  const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
  const r=await fetch(base+'/subscriptions/'+encodeURIComponent(subscription_id),{headers:{'Accept':'application/json','x-client-id':cfId!,'x-client-secret':cfSecret!,'x-api-version':'2026-01-01'}});
  const d=await r.json();
  if(!r.ok)return NextResponse.json({error:'Cashfree subscription verification failed',details:d},{status:502});
  const status=String(d.subscription_status||'').toUpperCase();
  const active=status==='ACTIVE';
  await db.from('store_subscriptions').update({status:d.subscription_status||sub.status,provider_cf_subscription_id:d.cf_subscription_id||sub.provider_cf_subscription_id,current_period_end:d.subscription_expiry_time||null,updated_at:new Date().toISOString()}).eq('id',sub.id);
  if(active)await db.from('stores').update({plan:sub.plan,billing_interval:sub.billing_interval,subscription_status:'active'}).eq('id',sub.store_id);
  return NextResponse.json({status:active?'active':status==='ON_HOLD'||status==='BANK_APPROVAL_PENDING'?'pending':'failed',message:active?'Your plan is now active.':'Subscription status: '+(status||'PENDING')});
 }catch(e:any){return NextResponse.json({error:e?.message||'Subscription verification failed'},{status:500});}
}