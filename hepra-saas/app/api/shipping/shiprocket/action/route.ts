import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const base='https://apiv2.shiprocket.in/v1/external';

async function auth(){
 const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.SHIPROCKET_EMAIL,password:process.env.SHIPROCKET_PASSWORD})});
 const d=await r.json();
 if(!r.ok||!d.token)throw new Error('Shiprocket authentication failed');
 return d.token;
}

export async function POST(req:NextRequest){
 try{
  const authHeader=req.headers.get('authorization')||'';
  const bearer=authHeader.replace(/^Bearer\s+/i,'');
  if(!bearer)return NextResponse.json({error:'Authentication required'},{status:401});

  const userClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{Authorization:'Bearer '+bearer}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)return NextResponse.json({error:'Invalid session'},{status:401});

  const {order_id,action}=await req.json();
  if(!order_id||!['pickup','label','tracking'].includes(action))return NextResponse.json({error:'Invalid request'},{status:400});

  const {data:o}=await userClient.from('orders').select('*').eq('id',order_id).maybeSingle();
  if(!o)return NextResponse.json({error:'Order not found'},{status:404});
  const {data:s}=await userClient.from('stores').select('id').eq('id',o.store_id).eq('owner_id',user.id).maybeSingle();
  if(!s)return NextResponse.json({error:'Access denied'},{status:403});
  if(!o.shiprocket_shipment_id)return NextResponse.json({error:'Shiprocket shipment not created yet'},{status:400});

  const token=await auth();
  const sid=Number(o.shiprocket_shipment_id);

  if(action==='pickup'){
   const r=await fetch(base+'/courier/generate/pickup',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({shipment_id:[sid]})});
   const d=await r.json();
   if(!r.ok)return NextResponse.json({error:'Pickup request failed'},{status:502});
   await userClient.from('orders').update({pickup_status:'requested',shipping_status:'pickup requested'}).eq('id',o.id);
   return NextResponse.json({ok:true,data:d});
  }

  if(action==='label'){
   const r=await fetch(base+'/courier/generate/label',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({shipment_id:[sid]})});
   const d=await r.json();
   if(!r.ok)return NextResponse.json({error:'Label generation failed'},{status:502});
   const url=d?.label_url||d?.response?.data?.label_url||null;
   await userClient.from('orders').update({label_url:url,shipping_status:'label generated'}).eq('id',o.id);
   return NextResponse.json({ok:true,label_url:url});
  }

  const r=await fetch(base+'/courier/track/awb/'+encodeURIComponent(o.awb_code||''),{headers:{Authorization:'Bearer '+token}});
  const d=await r.json();
  if(!r.ok)return NextResponse.json({error:'Tracking request failed'},{status:502});
  const track=d?.tracking_data?.shipment_track?.[0]||{};
  await userClient.from('orders').update({shipping_status:track?.current_status||o.shipping_status||'tracking available'}).eq('id',o.id);
  return NextResponse.json({ok:true,status:track?.current_status||null,tracking:d});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Shiprocket action failed'},{status:500})}
}