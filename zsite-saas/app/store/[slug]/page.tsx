'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Plus, Minus, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type StoreData={id:string;name:string;slug:string;logo_url:string|null;upi_id:string|null;merchant_name:string|null;pickup_postcode:string|null;default_package_weight:number;free_shipping_enabled:boolean;free_shipping_min_order:number;flat_shipping_fee:number;cod_fee:number};
type Category={id:string;name:string;sort_order:number;visible:boolean};
type Item={id:string;name:string;description:string|null;price:number;compare_at_price:number|null;stock:number;image_url:string|null;category_id:string|null};
type CartLine={item:Item;quantity:number};

export default function Storefront({params}:{params:{slug:string}}){
  const [store,setStore]=useState<StoreData|null>(null),[categories,setCategories]=useState<Category[]>([]),[items,setItems]=useState<Item[]>([]);
  const [category,setCategory]=useState('all'),[cart,setCart]=useState<CartLine[]>([]),[cartOpen,setCartOpen]=useState(false),[checkoutOpen,setCheckoutOpen]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''); const [shipping,setShipping]=useState<any[]>([]),[shippingLoading,setShippingLoading]=useState(false),[selectedCourier,setSelectedCourier]=useState<any>(null);
  const [customer,setCustomer]=useState({name:'',phone:'',address:'',pincode:'',city:'',state:'',notes:''}); const [paymentMethod,setPaymentMethod]=useState<'cod'|'upi'>('cod');

  useEffect(()=>{load();},[params.slug]);
  async function load(){
    const client=supabase();
    const {data:st,error:se}=await client.from('stores').select('*').eq('slug',params.slug).maybeSingle();
    if(se||!st){setError(se?.message||'Store not found');setLoading(false);return;}
    const [c,i]=await Promise.all([
      client.from('categories').select('*').eq('store_id',st.id).eq('visible',true).order('sort_order'),
      client.from('items').select('*').eq('store_id',st.id).eq('active',true).gt('stock',0).order('created_at',{ascending:false})
    ]);
    if(c.error||i.error){setError(c.error?.message||i.error?.message||'Unable to load store');setLoading(false);return;}
    setStore(st);setCategories(c.data||[]);setItems(i.data||[]);setLoading(false);
  }
  const visibleItems=useMemo(()=>category==='all'?items:items.filter(i=>i.category_id===category),[items,category]);
  const subtotal=cart.reduce((s,l)=>s+Number(l.item.price)*l.quantity,0); const shippingFee=store?.free_shipping_enabled&&subtotal>=Number(store.free_shipping_min_order||0)?0:(selectedCourier?Number(selectedCourier.rate||0):Number(store?.flat_shipping_fee||0)); const codFee=paymentMethod==='cod'?Number(store?.cod_fee||0):0; const total=subtotal+shippingFee+codFee; const count=cart.reduce((s,l)=>s+l.quantity,0);
  function add(item:Item){setCart(v=>{const old=v.find(l=>l.item.id===item.id);if(old)return v.map(l=>l.item.id===item.id?{...l,quantity:Math.min(l.quantity+1,item.stock)}:l);return [...v,{item,quantity:1}]});}
  function change(id:string,d:number){setCart(v=>v.map(l=>l.item.id===id?{...l,quantity:Math.max(0,Math.min(l.quantity+d,l.item.stock))}:l).filter(l=>l.quantity>0));}
  async function getRates(){if(!store||!customer.pincode)return;setShippingLoading(true);setShipping([]);const r=await fetch('/api/shipping/shiprocket/rates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pickup_postcode:(store as any).pickup_postcode||'',delivery_postcode:customer.pincode,weight:(store as any).default_package_weight||0.5,payment_method:'COD',cod_amount:total})});const d=await r.json();if(r.ok){setShipping(d.couriers||[]);setSelectedCourier(d.couriers?.[0]||null)}else setError(d.error||'Unable to get shipping rates');setShippingLoading(false);}
  async function placeOrder(){
    if(!store||!customer.name||!customer.phone||!cart.length)return;
    const client=supabase();
    const {error:orderError}=await client.rpc('place_public_order',{p_store_id:store.id,p_customer_name:customer.name,p_customer_phone:customer.phone,p_customer_address:customer.address,p_shipping_pincode:customer.pincode,p_shipping_city:customer.city,p_shipping_state:customer.state,p_notes:customer.notes,p_shipping_method:selectedCourier?.name||'Standard',p_shipping_fee:shippingFee,p_cod_fee:codFee,p_payment_method:paymentMethod,p_items:cart.map(l=>({item_id:l.item.id,quantity:l.quantity}))});
    if(orderError){setError(orderError.message);return;}
    setCart([]);setCheckoutOpen(false);setCartOpen(false);setSuccess('Order placed successfully! The store has received your order.');
  }
  if(loading)return <div className="store-loading">Loading store…</div>;
  if(!store)return <div className="store-loading"><b>{error||'Store not found'}</b></div>;
  return <main className="storefront">
    <header className="store-header"><div className="store-brand"><div className="store-logo">{store.logo_url?<img src={store.logo_url} alt=""/>:<span>{store.name.slice(0,1).toUpperCase()}</span>}</div><div><strong>{store.name}</strong><small>Online Store</small></div></div><button className="cart-button" onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/><span>Cart</span>{count>0&&<b>{count}</b>}</button></header>
    <section className="hero"><span className="eyebrow">WELCOME TO {store.name.toUpperCase()}</span><h1>Shop your everyday favourites.</h1><p>Simple shopping with direct ordering.</p></section>
    <div className="category-strip"><button className={category==='all'?'selected':''} onClick={()=>setCategory('all')}>All</button>{categories.map(c=><button className={category===c.id?'selected':''} key={c.id} onClick={()=>setCategory(c.id)}>{c.name}</button>)}</div>
    <section className="products">{visibleItems.length?visibleItems.map(i=><article className="product" key={i.id}><div className="product-image">{i.image_url?<img src={i.image_url} alt={i.name}/>:<span>NO IMAGE</span>}</div><div className="product-body"><small>{categories.find(c=>c.id===i.category_id)?.name||'Collection'}</small><h2>{i.name}</h2>{i.description&&<p>{i.description}</p>}<div className="price"><strong>₹{Number(i.price).toLocaleString('en-IN')}</strong>{i.compare_at_price&&<del>₹{Number(i.compare_at_price).toLocaleString('en-IN')}</del>}</div><button onClick={()=>add(i)}><Plus size={16}/> Add to cart</button></div></article>):<div className="store-empty">No products available.</div>}</section>
    <footer className="store-footer">Powered by HEPRA Store Builder</footer>
    {success&&<div className="success"><CheckCircle2 size={17}/>{success}<button onClick={()=>setSuccess('')}>×</button></div>}
    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><h2>Your cart</h2><button onClick={()=>setCartOpen(false)}><X/></button></div>{cart.length?cart.map(l=><div className="cart-line" key={l.item.id}><div className="grow"><b>{l.item.name}</b><small>₹{Number(l.item.price).toLocaleString('en-IN')}</small></div><div className="qty"><button onClick={()=>change(l.item.id,-1)}><Minus size={13}/></button><span>{l.quantity}</span><button onClick={()=>change(l.item.id,1)}><Plus size={13}/></button></div></div>):<div className="store-empty">Your cart is empty.</div>}<div className="drawer-total"><span>Total</span><strong>₹{total.toLocaleString('en-IN')}</strong></div>{cart.length>0&&<button className="checkout" onClick={()=>setCheckoutOpen(true)}>Continue to checkout <ArrowRight size={17}/></button>}</aside></div>}
    {checkoutOpen&&<div className="overlay"><section className="checkout-box"><div className="drawer-head"><h2>Checkout</h2><button onClick={()=>setCheckoutOpen(false)}><X/></button></div><div className="checkout-total"><div>Subtotal <strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><div>Shipping <strong>{shippingFee===0?'FREE':'₹'+shippingFee.toLocaleString('en-IN')}</strong></div>{codFee>0&&<div>COD fee <strong>₹{codFee.toLocaleString('en-IN')}</strong></div>}<div className="grand">Total <strong>₹{total.toLocaleString('en-IN')}</strong></div></div><input placeholder="Full name *" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/><input placeholder="Phone number *" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/><textarea placeholder="Delivery address" value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/><div className="checkout-grid"><input placeholder="Pincode *" value={customer.pincode} onChange={e=>setCustomer({...customer,pincode:e.target.value})}/><button className="btn" type="button" disabled={!customer.pincode||shippingLoading} onClick={getRates}>{shippingLoading?'Checking…':'Check delivery'}</button><input placeholder="City" value={customer.city} onChange={e=>setCustomer({...customer,city:e.target.value})}/><input placeholder="State" value={customer.state} onChange={e=>setCustomer({...customer,state:e.target.value})}/></div>{shipping.length>0&&<div className="shipping-options"><b>Available delivery options</b>{shipping.slice(0,5).map((x:any)=><button type="button" className={selectedCourier?.id===x.id?'shipping-option selected':'shipping-option'} key={x.id} onClick={()=>setSelectedCourier(x)}><span><b>{x.name}</b><small>{x.etd||'Delivery estimate available'}</small></span><strong>₹{Number(x.rate||0).toLocaleString('en-IN')}</strong></button>)}</div>}<div className="payment-methods"><b>Payment method</b><div><label><input type="radio" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')} disabled={!store.cod_enabled}/> Cash on Delivery</label><label><input type="radio" checked={paymentMethod==='upi'} onChange={()=>setPaymentMethod('upi')} disabled={!store.upi_enabled}/> UPI{paymentMethod==='upi'&&store.upi_id&&<small> Pay to {store.upi_id}</small>}</label></div></div><textarea placeholder="Order notes (optional)" value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})}/><button className="checkout" disabled={!customer.name||!customer.phone||!customer.pincode||(paymentMethod==='cod'&&!store.cod_enabled)||(paymentMethod==='upi'&&!store.upi_enabled)} onClick={placeOrder}>{paymentMethod==='upi'?'Continue with UPI':'Place order'} <ArrowRight size={17}/></button></section></div>}
  </main>
}