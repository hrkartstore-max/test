"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";

type Product={id?:string;_id?:string;name:string;price:number;stock?:number;image?:string;status?:string};
type Store={id:string;name:string;slug:string;category?:string;theme?:string;published?:boolean};

const API="https://fdimdbtoeecewbgrskvk.supabase.co/functions/v1/hepra-store";

export default function Storefront(){
 const params=useParams<{slug:string}>();
 const [store,setStore]=useState<Store|null>(null),[products,setProducts]=useState<Product[]>([]),[cart,setCart]=useState<Product[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{const r=await fetch(`${API}?slug=${encodeURIComponent(params.slug)}`,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.message||"Store not found");setStore(d.store||d);setProducts(Array.isArray(d.products)?d.products:[])}catch(e:any){setError(e.message||"Unable to load store")}finally{setLoading(false)}})()},[params.slug]);
 const total=useMemo(()=>cart.reduce((s,p)=>s+Number(p.price||0),0),[cart]);
 function add(p:Product){setCart(x=>[...x,p])}
 if(loading)return <main className="public-store"><div className="store-loading">Loading store…</div></main>;
 if(error||!store)return <main className="public-store"><div className="store-error"><h1>Store unavailable</h1><p>{error||"This store could not be found."}</p></div></main>;
 return <main className="public-store">
  <header className="store-header"><a href="/" className="store-brand">HEPRA</a><div><b>{store.name}</b><span>{store.category||"Online Store"}</span></div><button className="cart-button" onClick={()=>document.getElementById("cart")?.scrollIntoView({behavior:"smooth"})}>Cart ({cart.length})</button></header>
  <section className="store-hero"><span>ONLINE STORE</span><h1>{store.name}</h1><p>Shop directly from our store. Simple, fast and mobile-friendly.</p></section>
  <section className="store-products"><div className="store-section-head"><div><small>CATALOG</small><h2>Featured products</h2></div><span>{products.length} products</span></div>
   {products.length===0?<div className="store-empty">No products available yet.</div>:<div className="store-grid">{products.map(p=><article className="store-card" key={p.id||p._id}><div className="store-image">{p.image?<img src={p.image} alt={p.name}/>:<span>HEPRA</span>}</div><div className="store-card-body"><h3>{p.name}</h3><strong>₹{Number(p.price||0).toLocaleString("en-IN")}</strong><button disabled={p.stock===0} onClick={()=>add(p)}>{p.stock===0?"Out of stock":"Add to cart"}</button></div></article>)}</div>}
  </section>
  <section id="cart" className="store-cart"><div><small>YOUR CART</small><h2>Cart</h2></div>{cart.length===0?<p>Your cart is empty.</p>:<><div className="cart-items">{cart.map((p,i)=><div key={i}><span>{p.name}</span><b>₹{Number(p.price||0).toLocaleString("en-IN")}</b></div>)}</div><div className="cart-total"><span>Total</span><strong>₹{total.toLocaleString("en-IN")}</strong></div><button className="checkout-button" onClick={()=>alert("Checkout flow will be connected to the public order API next.")}>Continue to checkout</button></>}</section>
  <footer className="store-footer">Powered by <b>HEPRA</b></footer>
 </main>
}