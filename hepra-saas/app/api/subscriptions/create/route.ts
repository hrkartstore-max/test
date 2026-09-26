import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Authentication required'},{status:401});
    const userClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const {data:{user}}=await userClient.auth.getUser(token);
    if(!user)return NextResponse.json({error:'Invalid session'},{status:401});

    const {plan,billing_interval}=await req.json();
    if(!['starter','growth'].includes(plan)||!['monthly','yearly'].includes(billing_interval))
      return NextResponse.json({error:'Invalid plan or billing interval'},{status:400});

    const prices:any={starter:{monthly:299,yearly:2990},growth:{monthly:499,yearly:4990}};
    const amount=prices[plan][billing_interval];
    const db=admin();
    const {data:store}=await db.from('stores').select('id,name,owner_id').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(!store)return NextResponse.json({error:'Store not found. Complete store setup first.'},{status:404});

    const cfId=process.env.CASHFREE_CLIENT_ID,cfSecret=process.env.CASHFREE_CLIENT_SECRET;
    if(!cfId||!cfSecret)return NextResponse.json({error:'Cashfree server configuration is incomplete'},{status:500});

    const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
    const subscriptionId='hepra_'+store.id.replaceAll('-','').slice(0,18)+'_'+Date.now().toString(36);
    const intervalType=billing_interval==='yearly'?'YEAR':'MONTH';
    const returnUrl=(process.env.NEXT_PUBLIC_SITE_URL||'')+'/billing/return';
    const payload={
      subscription_id:subscriptionId,
      customer_details:{
        customer_name:user.user_metadata?.full_name||store.name,
        customer_email:user.email||'',
        customer_phone:user.phone||'9999999999'
      },
      plan_details:{
        plan_name:'HEPRA '+String(plan).toUpperCase()+' '+billing_interval,
        plan_type:'PERIODIC',
        plan_amount:amount,
        plan_max_amount:amount,
        plan_max_cycles:120,
        plan_intervals:1,
        plan_currency:'INR',
        plan_interval_type:intervalType,
        plan_note:'HEPRA '+plan+' '+billing_interval+' subscription'
      },
      authorization_details:{
        authorization_amount:amount,
        authorization_amount_refund:false,
        payment_methods:['upi','card','enach']
      },
      subscription_meta:{
        return_url:returnUrl,
        notification_channel:['EMAIL'],
        session_id_expiry:new Date(Date.now()+30*60*1000).toISOString()
      },
      subscription_expiry_time:new Date(Date.now()+10*365*24*60*60*1000).toISOString(),
      subscription_first_charge_time:new Date().toISOString(),
      subscription_tags:{store_id:store.id,plan,billing_interval}
    };

    const response=await fetch(base+'/subscriptions',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','x-client-id':cfId,'x-client-secret':cfSecret,'x-api-version':'2026-01-01','x-idempotency-key':crypto.randomUUID()},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)return NextResponse.json({error:'Cashfree subscription creation failed',details:data},{status:502});

    const {error:insertError}=await db.from('store_subscriptions').insert({
      store_id:store.id,plan,billing_interval,provider:'cashfree',
      provider_subscription_id:data.subscription_id||subscriptionId,
      provider_cf_subscription_id:data.cf_subscription_id||null,
      status:data.subscription_status||'initialized',amount,currency:'INR'
    });
    if(insertError)return NextResponse.json({error:'Subscription created but could not be saved',details:insertError.message},{status:500});

    return NextResponse.json({subscription_id:data.subscription_id||subscriptionId,subscription_session_id:data.subscription_session_id});
  }catch(e:any){return NextResponse.json({error:e?.message||'Subscription initialization failed'},{status:500});}
}