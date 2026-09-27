import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.replace(/^Bearer\s+/i,'');
    if(!token)return NextResponse.json({error:'Authentication required'},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user}}=await db.auth.getUser();
    if(!user)return NextResponse.json({error:'Invalid session'},{status:401});
    const {order_id}=await req.json();
    if(!order_id)return NextResponse.json({error:'order_id is required'},{status:400});
    const {data:order,error:oe}=await db.from('orders').select('*,order_items(*)').eq('id',order_id).maybeSingle();
    if(oe||!order)return NextResponse.json({error:oe?.message||'Order not found'},{status:404});
    const {data:store}=await db.from('stores').select('*').eq('id',order.store_id).eq('owner_id',user.id).maybeSingle();
    if(!store)return NextResponse.json({error:'Store access denied'},{status:403});
    if(!store.shipping_enabled)return NextResponse.json({error:'Shiprocket is disabled for this store'},{status:400});
    if(!process.env.SHIPROCKET_EMAIL||!process.env.SHIPROCKET_PASSWORD||!process.env.SHIPROCKET_PICKUP_LOCATION)return NextResponse.json({error:'Shiprocket server configuration is incomplete'},{status:500});
    const login=await fetch('https://apiv2.shiprocket.in/v1/external/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.SHIPROCKET_EMAIL,password:process.env.SHIPROCKET_PASSWORD})});
    const loginData=await login.json();
    if(!login.ok||!loginData.token)return NextResponse.json({error:'Shiprocket authentication failed',details:loginData},{status:502});
    const fullName=String(order.customer_name||'Customer').trim().split(/\s+/);const first=fullName.shift()||'Customer';const last=fullName.join(' ');
    const payload={
      order_id:String(order.id).slice(0,20),order_date:new Date(order.created_at||Date.now()).toISOString().slice(0,16).replace('T',' '),
      pickup_location:process.env.SHIPROCKET_PICKUP_LOCATION,
      billing_customer_name:first,billing_last_name:last,billing_address:order.customer_address||'Address',
      billing_city:order.shipping_city||'',billing_state:order.shipping_state||'',billing_country:'India',billing_pincode:order.shipping_pincode,
      billing_phone:order.customer_phone,shipping_is_billing:true,shipping_customer_name:first,shipping_last_name:last,
      shipping_address:order.customer_address||'Address',shipping_city:order.shipping_city||'',shipping_state:order.shipping_state||'',shipping_country:'India',shipping_pincode:order.shipping_pincode,
      shipping_phone:order.customer_phone,payment_method:order.payment_status==='paid'?'PREPAID':'COD',sub_total:Number(order.subtotal)+Number(order.shipping_fee||0)+Number(order.cod_fee||0),
      order_items:(order.order_items||[]).map((x:any)=>({name:x.item_name,sku:String(x.item_id),units:Number(x.quantity),selling_price:Number(x.unit_price),discount:0})),
      length:Number(store.default_package_length||15),breadth:Number(store.default_package_breadth||10),height:Number(store.default_package_height||5),weight:Number(store.default_package_weight||0.5)
    };
    const create=await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${loginData.token}`},body:JSON.stringify(payload)});
    const created=await create.json();
    if(!create.ok)return NextResponse.json({error:'Shiprocket order creation failed',details:created},{status:502});
    let awb:any=null;
    if(created.shipment_id){
      const awbRes=await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${loginData.token}`},body:JSON.stringify({shipment_id:created.shipment_id,...(order.courier_company_id?{courier_id:Number(order.courier_company_id)}:{})})});
      awb=await awbRes.json();
    }
    const awbCode=awb?.response?.data?.awb_code||awb?.awb_code||null;const courier=awb?.response?.data?.courier_name||awb?.courier_name||null;
    const {error:ue}=await db.from('orders').update({shiprocket_order_id:String(created.order_id||''),shiprocket_shipment_id:String(created.shipment_id||''),awb_code:awbCode,courier_name:courier,shipping_status:awbCode?'AWB assigned':'created'}).eq('id',order.id);
    if(ue)return NextResponse.json({error:ue.message,shiprocket:created,awb},{status:500});
    return NextResponse.json({ok:true,shiprocket_order_id:created.order_id,shipment_id:created.shipment_id,awb_code:awbCode,courier_name:courier});
  }catch(e:any){return NextResponse.json({error:e?.message||'Shipping integration error'},{status:500});}
}