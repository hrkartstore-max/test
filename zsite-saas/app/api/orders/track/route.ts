import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function POST(req:NextRequest){
 try{
  const {order_id,phone}=await req.json(); const cleanPhone=String(phone||'').replace(/\D/g,'');
  if(!order_id||cleanPhone.length!==10)return NextResponse.json({error:'Valid order ID and mobile number are required'},{status:400});
  const s=db();
  const {data:order,error}=await s.from('orders').select('id,store_id,customer_name,customer_phone,status,payment_status,payment_method,total,created_at,shipping_method,shipping_fee,cod_fee,shiprocket_order_id,shiprocket_shipment_id,awb_code,courier_name,tracking_url,shipping_status').eq('id',order_id).eq('customer_phone',cleanPhone).maybeSingle();
  if(error||!order)return NextResponse.json({error:'Order not found. Check the order ID and mobile number.'},{status:404});
  return NextResponse.json({order});
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to track order'},{status:500});}
}