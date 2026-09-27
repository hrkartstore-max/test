import { NextRequest, NextResponse } from 'next/server';
const base='https://apiv2.shiprocket.in/v1/external';

async function token(){
 const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.SHIPROCKET_EMAIL,password:process.env.SHIPROCKET_PASSWORD})});
 const d=await r.json();
 if(!r.ok||!d.token)throw new Error('Shiprocket authentication failed');
 return d.token;
}

export async function POST(req:NextRequest){
 try{
  const {pickup_postcode,delivery_postcode,weight,payment_method='COD',cod_amount=0}=await req.json();
  const pickup=String(pickup_postcode||'').replace(/\D/g,'');
  const delivery=String(delivery_postcode||'').replace(/\D/g,'');
  const numericWeight=Number(weight);
  const numericCod=Number(cod_amount);
  if(!/^\d{6}$/.test(pickup)||!/^\d{6}$/.test(delivery)||!Number.isFinite(numericWeight)||numericWeight<=0||!Number.isFinite(numericCod)||numericCod<0||!['COD','PREPAID'].includes(String(payment_method).toUpperCase()))
    return NextResponse.json({error:'Invalid shipping rate request'},{status:400});

  const t=await token();
  const u=new URLSearchParams({
   pickup_postcode:pickup,
   delivery_postcode:delivery,
   weight:String(numericWeight),
   cod:String(String(payment_method).toUpperCase()==='COD'?1:0),
   declared_value:String(numericCod||1),
   is_return:'0'
  });
  const r=await fetch(base+'/courier/serviceability/?'+u.toString(),{headers:{Authorization:'Bearer '+t}});
  const d=await r.json();
  if(!r.ok)return NextResponse.json({error:'Courier serviceability failed'},{status:502});
  const list=d?.data?.available_courier_companies||[];
  return NextResponse.json({couriers:list.map((x:any)=>({id:x.courier_company_id,name:x.courier_name,rate:x.rate,freight_charge:x.freight_charge,cod_charges:x.cod_charges,etd:x.etd,estimated_delivery_date:x.etd||null,local_region:x.local_region}))});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Rate lookup failed'},{status:500})}
}