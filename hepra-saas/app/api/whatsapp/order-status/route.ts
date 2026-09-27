import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
const templates:any={new:process.env.WHATSAPP_TEMPLATE_ORDER_PLACED||'order_placed',confirmed:process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMED||'order_confirmed',preparing:process.env.WHATSAPP_TEMPLATE_ORDER_PREPARING||'order_preparing',done:process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED||'order_delivered',cancelled:process.env.WHATSAPP_TEMPLATE_ORDER_CANCELLED||'order_cancelled'};

export async function POST(req:NextRequest){
 try{
  const auth=req.headers.get('authorization')||'';
  const token=auth.replace(/^Bearer\s+/i,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const supa=db(); const {data:{user},error:ue}=await supa.auth.getUser(token);
  if(ue||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {order_id,status}=await req.json();
  if(!order_id||!templates[status])return NextResponse.json({error:'Invalid order notification request'},{status:400});
  const {data:order,error}=await supa.from('orders').select('id,store_id,customer_name,customer_phone,total,tracking_url,awb_code').eq('id',order_id).maybeSingle();
  if(error||!order)return NextResponse.json({error:'Order not found'},{status:404});
  const {data:store}=await supa.from('stores').select('owner_id').eq('id',order.store_id).maybeSingle();
  if(!store||store.owner_id!==user.id)return NextResponse.json({error:'Forbidden'},{status:403});

  const access=process.env.WHATSAPP_ACCESS_TOKEN,phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID,version=process.env.WHATSAPP_API_VERSION;
  if(!access||!phoneId||!version){if(log?.id)await supa.from('whatsapp_notification_logs').update({state:'failed',error_message:'WhatsApp Cloud API is not configured',updated_at:new Date().toISOString()}).eq('id',log.id);return NextResponse.json({error:'WhatsApp Cloud API is not configured on the server yet'},{status:503});}

  const phone=String(order.customer_phone||'').replace(/\D/g,'');
  const templateName=templates[status];
  const {data:log}=await supa.from('whatsapp_notification_logs').insert({store_id:order.store_id,order_id:order.id,status,template_name:templateName,customer_phone:phone,state:'pending',attempts:1,last_attempt_at:new Date().toISOString()}).select('id').single();
  if(phone.length!==10)return NextResponse.json({error:'Customer phone is not a valid Indian mobile number'},{status:400});
  const shortId=String(order.id).slice(0,8).toUpperCase();
  const params=[order.customer_name||'Customer',shortId,Number(order.total||0).toLocaleString('en-IN')];
  if(status==='done'&&order.tracking_url)params.push(order.tracking_url);
  if(status==='preparing'&&order.awb_code)params.push(order.awb_code);

  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:'91'+phone,type:'template',template:{name:templates[status],language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:params.map(text=>({type:'text',text:String(text)}))}]}})});
  const data=await response.json();
  if(!response.ok){if(log?.id)await supa.from('whatsapp_notification_logs').update({state:'failed',error_message:data?.error?.message||'WhatsApp message failed',updated_at:new Date().toISOString()}).eq('id',log.id);return NextResponse.json({error:data?.error?.message||'WhatsApp message failed',details:data?.error?.code||null},{status:502});}
  const messageId=data?.messages?.[0]?.id||null;if(log?.id)await supa.from('whatsapp_notification_logs').update({state:'sent',provider_message_id:messageId,updated_at:new Date().toISOString()}).eq('id',log.id);
  return NextResponse.json({ok:true,message_id:messageId});
 }catch(e:any){return NextResponse.json({error:e?.message||'WhatsApp notification failed'},{status:500});}
}