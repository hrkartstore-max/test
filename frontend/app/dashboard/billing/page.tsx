"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";

const plans = [
  {id:"free",name:"FREE",price:0,copy:"Start your online store with the essentials.",features:["Up to 10 products","HEPRA subdomain","Storefront + cart","COD","Basic inventory","Basic customers"]},
  {id:"starter",name:"STARTER",price:299,copy:"For growing businesses that need more selling tools.",features:["Up to 100 products","Custom domain","WhatsApp ordering","UPI + COD","Discounts + coupons","Shiprocket","Basic analytics"]},
  {id:"pro",name:"PRO",price:499,copy:"For businesses ready for advanced selling and growth.",features:["Unlimited products","Online payment gateway","Advanced inventory","Advanced analytics","Full customization","10 staff accounts","AI tools"]},
];

declare global {
  interface Window {
    Razorpay?: any;
    Cashfree?: any;
  }
}

function BillingContent(){
  const searchParams=useSearchParams();
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
      const r=await api("/api/subscription/checkout",{
        method:"POST",
        body:JSON.stringify({planId,billingCycle:"monthly"})
      });
      if(r.mode==="free"){
        await load();
        return;
      }
      if(r.mode==="cashfree"){
        if(!window.Cashfree) throw new Error("Cashfree Checkout has not loaded yet. Please wait a moment and try again.");
        const cashfree=window.Cashfree({mode:process.env.NEXT_PUBLIC_CASHFREE_MODE==="production"?"production":"sandbox"});
        await cashfree.checkout({paymentSessionId:r.paymentSessionId,redirectTarget:"_self"});
        return;
      }
      await load();
    }catch(e:any){ setError(e.message||"Unable to start payment."); }
    finally{ setBusy(""); }
  }

  async function cancel(){
    if(!confirm("Cancel the current subscription?")) return;
    try{
      await api("/api/subscription/cancel",{method:"POST"});
      await load();
    }catch(e:any){ setError(e.message); }
  }

  return <>
    <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
    {searchParams.get("payment")==="processing"&&<div className="notice">Payment submitted. We are confirming your Cashfree payment. Refresh this page after a few seconds if the plan has not updated yet.</div>}
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

      <div className="notice"><b>Plan access is enforced automatically.</b> Free, Starter and Pro limits are checked by the backend, so upgrades take effect across the store after payment confirmation.</div><div className="notice">Secure payments are processed by Cashfree. Your paid plan becomes active after Cashfree confirms the payment through the signed webhook.</div>
    </main>
  </>;
}


export default function Billing(){
  return <Suspense fallback={<main className="dashboard-content"><div className="panel">Loading billing…</div></main>}><BillingContent /></Suspense>;
}
