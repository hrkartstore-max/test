'use client';

import { useState } from 'react';
import { Check, ArrowRight, Zap } from 'lucide-react';

const plans = [
  {key:'free',name:'FREE',color:'#15803d',price:'₹0',note:'Start selling online with the essentials.',features:['10 products','Basic storefront','HEPRA subdomain','Orders','COD','UPI','Basic dashboard','1 category']},
  {key:'starter',name:'STARTER',color:'#2563eb',price:'₹299',note:'For small businesses ready to build a real store.',features:['Everything in Free','100 products','Custom domain','Unlimited categories','UPI + COD','Discounts & coupons','Shiprocket','Order management','Basic reports','Store customization']},
  {key:'growth',name:'GROWTH',color:'#7c3aed',price:'₹499',note:'For growing stores that need more automation.',featured:true,features:['Everything in Starter','Unlimited products','Advanced discounts','Customer management','Analytics','Abandoned-cart features','WhatsApp tools','Multiple payment gateways','Advanced shipping']}
];

export default function PricingPage(){
 const [annual,setAnnual]=useState(false);
 const displayPrice=(key:string,monthly:string)=>{if(!annual)return monthly;if(key==='starter')return '₹2,990';if(key==='growth')return '₹4,990';return '₹0';};
 const checkout=(key:string)=>key==='free'?'/setup':'/billing?plan='+key+'&interval='+(annual?'yearly':'monthly');
 return <main className="pricing-page">
  <nav className="pricing-nav"><a href="/pricing" className="pricing-logo"><span>H</span> HEPRA</a><div className="pricing-navlinks"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="/connect">Login</a><a href="/setup" className="pricing-nav-cta">START FREE <ArrowRight size={14}/></a></div></nav>
  <section className="pricing-hero"><div className="pricing-kicker">INDIA-FIRST STORE BUILDER · HEPRA</div><h1>BUILD YOUR<br/><em>ONLINE STORE.</em></h1><p>Launch your store, accept orders, collect payments and manage shipping — without the complexity.</p><div className="pricing-hero-actions"><a href="/setup" className="pricing-main-cta">START FREE <ArrowRight size={17}/></a><a href="#pricing" className="pricing-text-link">SEE PRICING ↓</a></div></section>
  <section className="pricing-strip" id="features"><div><b>01</b><span>STORE</span><small>Build your storefront</small></div><div><b>02</b><span>SELL</span><small>UPI · COD · ORDERS</small></div><div><b>03</b><span>SHIP</span><small>Shiprocket ready</small></div><div><b>04</b><span>GROW</span><small>Analytics & automation</small></div></section>
  <section className="pricing-section" id="pricing"><div className="pricing-heading"><div><div className="pricing-kicker">SIMPLE PRICING</div><h2>CHOOSE YOUR<br/>PLAN.</h2></div><div className="billing-toggle"><button className={!annual?'active':''} onClick={()=>setAnnual(false)}>MONTHLY</button><button className={annual?'active':''} onClick={()=>setAnnual(true)}>YEARLY <span>SAVE</span></button></div></div>{annual&&<div className="annual-note">YEARLY BILLING · STARTER ₹2,990/YEAR · GROWTH ₹4,990/YEAR</div>}<div className="pricing-grid">{plans.map(plan=><article key={plan.key} className={'plan-card '+(plan.featured?'featured':'')}>{plan.featured&&<div className="featured-label"><Zap size={12}/> MOST FEATURED</div>}<div className="plan-top"><span className="plan-dot" style={{background:plan.color}}/><span>{plan.name}</span></div><div className="plan-price"><strong>{displayPrice(plan.key,plan.price)}</strong><span>{plan.key==='free'?'/ forever':annual?'/ year':'/ month'}</span></div><p className="plan-note">{plan.note}</p><a href={checkout(plan.key)} className="plan-cta">{plan.key==='free'?'START FREE':'CHOOSE '+plan.name} <ArrowRight size={14}/></a><div className="plan-divider"/><ul>{plan.features.map(feature=><li key={feature}><Check size={14}/><span>{feature}</span></li>)}</ul></article>)}</div></section>
  <section className="pricing-bottom"><div><div className="pricing-kicker">NO CONFUSION</div><h2>START SMALL.<br/>GROW WHEN<br/><em>YOU'RE READY.</em></h2></div><p>Use Free to launch. Move to Starter when you need a custom domain and more selling tools. Upgrade to Growth when your store needs unlimited products, analytics and automation.</p></section>
  <footer className="pricing-footer"><strong>HEPRA · STORE BUILDER</strong><span>BUILT FOR INDIAN BUSINESSES</span><a href="/connect">LOGIN →</a></footer>
 </main>;
}
