"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { api } from "../../../lib/api";

const plans = [
  {id:"starter",name:"Basic",price:200,copy:"Perfect for small businesses getting started online",features:["Up to 100 products","Easy-to-use Admin Panel","WhatsApp Ordering","UPI QR Code / COD","Mobile-responsive online store","WhatsApp support"]},
  {id:"pro",name:"Pro",price:999,copy:"Perfect for businesses looking to grow online",features:["Unlimited products","Custom domain","WhatsApp Ordering","UPI + Cards + COD","Mobile-responsive online store","Priority support"]},
  {id:"business",name:"Pro+",price:1999,copy:"Perfect for businesses ready to automate & scale",features:["Everything in Pro","WhatsApp Business API","Promotion templates + chatbot","POS billing software","Payment gateway","Custom domain","Priority support"]}
];

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function Billing(){
  const [sub,setSub]=useState<any>(null);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  async function load(){
    try { setSub(await api("/api/subscription")); }
    catch(e:any){ setError(e.message); }
  }

  useEffect(()=>{ load(); },[]);

  async function choose(planId:string){
    setBusy(planId);
    setError("");
    try{
      const cfg=await api("/api/payments/config");

      if(cfg.provider==="razorpay"){
        const r=await api("/api/payments/razorpay/subscription-order",{
          method:"POST",
          body:JSON.stringify({planId,billingCycle:"monthly"})
        });

        if(!window.Razorpay) throw new Error("Razorpay Checkout has not loaded yet. Please wait a moment and try again.");

        const checkout=new window.Razorpay({
          key:r.keyId,
          order_id:r.orderId,
          amount:r.amount,
          currency:r.currency,
          name:"HEPRA",
          description:`HEPRA ${planId} subscription`,
          theme:{color:"#171717"},
          handler:async(response:any)=>{
            try{
              await api("/api/payments/razorpay/verify",{
                method:"POST",
                body:JSON.stringify({
                  paymentId:response.razorpay_payment_id,
                  orderId:response.razorpay_order_id,
                  signature:response.razorpay_signature
                })
              });
              await load();
            }catch(e:any){ setError(e.message); }
            finally{ setBusy(""); }
          },
          modal:{ondismiss:()=>setBusy("")}
        });

        checkout.open();
        return;
      }

      await api("/api/subscription/checkout",{
        method:"POST",
        body:JSON.stringify({planId,billingCycle:"monthly"})
      });
      await load();
    }catch(e:any){
      setError(e.message);
    }finally{
      if(!window.Razorpay || busy!==planId) setBusy("");
    }
  }

  async function cancel(){
    if(!confirm("Cancel the current subscription?")) return;
    try{
      await api("/api/subscription/cancel",{method:"POST"});
      await load();
    }catch(e:any){ setError(e.message); }
  }

  return <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    <main className="dashboard-content">
      <div className="panel-head">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1 style={{fontSize:32,margin:"8px 0"}}>Billing & plans</h1>
          <span>Choose the plan that fits your store.</span>
        </div>
        {sub&&<div className="plan-pill">{sub.subscription.status} · {sub.subscription.planId}</div>}
      </div>

      {error&&<div className="error-box">{error}</div>}

      {sub&&<div className="billing-current panel">
        <div>
          <small>CURRENT PLAN</small>
          <h2>{sub.plan?.name}</h2>
          <p>{sub.subscription.status==="trialing"?"14-day local trial":"Subscription is active."}</p>
        </div>
        <div>
          <span>Renews {sub.subscription.renewsAt?new Date(sub.subscription.renewsAt).toLocaleDateString():"—"}</span>
          {sub.subscription.status!=="cancelled"&&<button className="button button-light" onClick={cancel}>Cancel</button>}
        </div>
      </div>}

      <div className="pricing-grid billing-grid">
        {plans.map(p=><div className={`price-card ${sub?.subscription?.planId===p.id?"featured":""}`} key={p.id}>
          <h3>{p.name}</h3>
          <p>{p.copy}</p>
          <strong>₹{p.price}<small>/month</small></strong>
          <ul>{p.features.map(x=><li key={x}>✓ {x}</li>)}</ul>
          <button
            className="button button-dark full"
            disabled={busy===p.id||sub?.subscription?.planId===p.id}
            onClick={()=>choose(p.id)}
          >
            {busy===p.id?"Opening checkout…":sub?.subscription?.planId===p.id?"Current plan":`Choose ${p.name}`}
          </button>
        </div>)}
      </div>

      <div className="notice">
        If Razorpay keys are configured on the backend, this button opens Razorpay Checkout.
        Without keys, HEPRA stays in local development mode.
      </div>
    </main>
  </>;
}
