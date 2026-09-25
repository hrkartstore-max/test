'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Package, Tags, Percent, CreditCard, BarChart3, Store, Settings, Truck, Plus, Search, Trash2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Item={id:string;name:string;description:string|null;price:number;compare_at_price:number|null;stock:number;category_id:string|null;active:boolean;image_url:string|null};
type Cat={id:string;name:string;sort_order:number;visible:boolean};

const nav=[['Orders',ShoppingCart],['Items',Package],['Categories',Tags],['Discounts',Percent],['Payments',CreditCard],['Shipping',Truck],['Reports',BarChart3],['zPOS',Store],['zStock',Package]] as const;

export default function Home(){
  const [tab,setTab]=useState('Orders');
  const [items,setItems]=useState<Item[]>([]);
  const [cats,setCats]=useState<Cat[]>([]);
  const [search,setSearch]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [newName,setNewName]=useState('');
  const [newPrice,setNewPrice]=useState('');
  const [newStock,setNewStock]=useState('10');
  const [newCat,setNewCat]=useState('');
  const [store,setStore]=useState<any>(null);
  const [user,setUser]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true); setError('');
    const client=supabase();
    const {data:{user}}=await client.auth.getUser();
    setUser(user);
    if(!user){setLoading(false);return;}
    let {data:st,error:storeError}=await client.from('stores').select('*').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(storeError){setError(storeError.message);setLoading(false);return;}
    if(!st){
      const slug=(user.email?.split('@')[0]||'my-store').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,7);
      const created=await client.from('stores').insert({owner_id:user.id,name:'My Store',slug}).select().single();
      if(created.error){setError(created.error.message);setLoading(false);return;}
      st=created.data;
    }
    setStore(st);
    const [c,i]=await Promise.all([
      client.from('categories').select('*').eq('store_id',st.id).order('sort_order'),
      client.from('items').select('*').eq('store_id',st.id).order('created_at',{ascending:false})
    ]);
    if(c.error||i.error){setError(c.error?.message||i.error?.message||'Unable to load store data');}
    setCats(c.data||[]); setItems(i.data||[]);
    if((c.data||[]).length) setNewCat(c.data[0].id);
    setLoading(false);
  }

  const filtered=useMemo(()=>items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())),[items,search]);

  async function addItem(){
    if(!store||!newName||!newPrice){setError('Enter item name and price.');return;}
    setSaving(true);setError('');
    const client=supabase();
    const {data,error}=await client.from('items').insert({store_id:store.id,name:newName,price:Number(newPrice),stock:Number(newStock)||0,category_id:newCat||null,active:true}).select().single();
    if(error)setError(error.message);else{setItems(v=>[data,...v]);setNewName('');setNewPrice('');setNewStock('10');setShowAdd(false);}
    setSaving(false);
  }

  async function addCategory(name:string){
    if(!store||!name.trim())return;
    const {data,error}=await supabase().from('categories').insert({store_id:store.id,name:name.trim(),sort_order:cats.length*10,visible:true}).select().single();
    if(error)setError(error.message);else{setCats(v=>[...v,data]);setNewCat(data.id);}
  }

  async function deleteCategory(id:string){
    const {error}=await supabase().from('categories').delete().eq('id',id);
    if(error)setError(error.message);else setCats(v=>v.filter(x=>x.id!==id));
  }

  async function toggleCategory(c:Cat){
    const {error}=await supabase().from('categories').update({visible:!c.visible}).eq('id',c.id);
    if(error)setError(error.message);else setCats(v=>v.map(x=>x.id===c.id?{...x,visible:!x.visible}:x));
  }

  async function signOut(){await supabase().auth.signOut();location.href='/connect';}

  if(loading)return <div className="loading">Connecting to Supabase…</div>;
  if(!user)return <div className="loading"><div><b>Sign in required</b><p>Connect your merchant account first.</p><button className="btn primary" onClick={()=>location.href='/connect'}>Open login</button></div></div>;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandrow"><div className="logo">H</div><div className="brandtext"><div>HEPRA</div><div className="muted">Store Builder</div></div></div></div>
      <div className="nav">{nav.map(([label,Icon])=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}><Icon size={14}/><span>{label}{label.startsWith('z')&&<em style={{fontSize:8,marginLeft:5,color:'#5146e5'}}>NEW</em>}</span></button>)}</div>
      <div className="footer"><div className="live">● Taking orders</div><button className="nav" style={{border:0,background:'transparent',padding:0}} onClick={signOut}><LogOut size={13}/><span className="hide-mobile">Sign out</span></button></div>
    </aside>
    <main className="main">
      <div className="top"><span>⌂ / {tab}</span><span>{store?.name||'My Store'}　↗</span></div>
      <section className="content">
        {error&&<div className="error">{error}<button onClick={()=>setError('')}>×</button></div>}
        <div className="setup"><h2>Finish setting up your store 🚀</h2><p>{items.length>0?'Your catalog is live — keep building your store.':'Add your first product to start selling.'}</p><div className="setupgrid"><div className="setupitem"><b>Store</b><span>{store?.name} · /{store?.slug}</span></div><div className="setupitem"><b>Products</b><span>{items.length} items connected to Supabase</span></div><div className="setupitem"><b>Categories</b><span>{cats.length} storefront categories</span></div><div className="setupitem"><b>Payments</b><span>Configure UPI from Payments</span></div></div></div>
        {tab==='Orders'&&<Orders store={store}/>}
        {tab==='Items'&&<Items items={filtered} cats={cats} search={search} setSearch={setSearch} showAdd={showAdd} setShowAdd={setShowAdd} store={store} setItems={setItems} setError={setError} newName={newName} setNewName={setNewName} newPrice={newPrice} setNewPrice={setNewPrice} newStock={newStock} setNewStock={setNewStock} newCat={newCat} setNewCat={setNewCat} addItem={addItem} saving={saving}/>}
        {tab==='Categories'&&<Categories cats={cats} addCategory={addCategory} deleteCategory={deleteCategory} toggleCategory={toggleCategory}/>}
        {tab==='Discounts'&&<Coming title="Discounts"/>}
        {tab==='Payments'&&<Payments store={store} setStore={setStore}/>} {tab==='Shipping'&&<Shipping store={store} setStore={setStore}/>}
        {['Reports','zPOS','zStock'].includes(tab)&&<Coming title={tab}/>}
      </section>
      <div className="mobilebar">{nav.slice(0,5).map(([label,Icon])=><button className={tab===label?'active':''} key={label} onClick={()=>setTab(label)}><Icon size={15}/><br/>{label}</button>)}</div>
    </main>
  </div>
}

function Orders({store}:{store:any}){const [orders,setOrders]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [selected,setSelected]=useState<any>(null);const [filter,setFilter]=useState('all');
useEffect(()=>{load();},[store?.id]);async function load(){if(!store)return;setLoading(true);const {data,error}=await supabase().from('orders').select('*,order_items(*)').eq('store_id',store.id).order('created_at',{ascending:false});if(!error)setOrders(data||[]);setLoading(false);}
async function status(id:string,status:string){const {error}=await supabase().from('orders').update({status}).eq('id',id);if(!error)setOrders(v=>v.map(o=>o.id===id?{...o,status}:o));}
const shown=filter==='all'?orders:orders.filter(o=>o.status===filter);const revenue=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total||0),0);
return <><div className="pagehead"><div><h1>Orders</h1><p>{orders.length} total · {orders.filter(o=>!['done','cancelled'].includes(o.status)).length} open</p></div><div className="actions"><button className="btn" onClick={load}>↻ Refresh</button></div></div><div className="cards">{[['TODAY’S ORDERS',String(orders.length)],['TOTAL REVENUE','₹'+revenue.toLocaleString('en-IN')],['OPEN QUEUE',String(orders.filter(o=>!['done','cancelled'].includes(o.status)).length)],['AVG TICKET',orders.length?'₹'+Math.round(revenue/orders.length).toLocaleString('en-IN'):'₹0']].map(x=><div className="stat" key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div><div className="panel"><div className="toolbar">{['all','new','confirmed','preparing','done','cancelled'].map(s=><button key={s} className={`pill ${filter===s?'selected':''}`} onClick={()=>setFilter(s)}>{s==='all'?'All':s[0].toUpperCase()+s.slice(1)} {s==='all'?orders.length:orders.filter(o=>o.status===s).length}</button>)}</div>{loading?<div className="empty">Loading orders…</div>:shown.length?shown.map(o=><div className="row" key={o.id} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}><div className="grow"><b>{o.customer_name}</b><div className="muted">{o.customer_phone} · {new Date(o.created_at).toLocaleString('en-IN')}</div></div><span>₹{Number(o.total).toLocaleString('en-IN')}</span><span className="pill">{o.status}</span>{o.awb_code&&<span className="pill">AWB {o.awb_code}</span>}</div>):<div className="empty"><div className="big">🛒</div><b>No orders here</b><br/>Customer orders will appear here.</div>}</div>{selected&&<div className="overlay"><section className="checkout-box"><div className="drawer-head"><h2>Order details</h2><button onClick={()=>setSelected(null)}>×</button></div><p><b>{selected.customer_name}</b><br/>{selected.customer_phone}<br/>{selected.customer_address}<br/>{selected.shipping_city} {selected.shipping_state} {selected.shipping_pincode}</p><div className="panel" style={{margin:'10px 0'}}>{(selected.order_items||[]).map((x:any)=><div className="row" key={x.id}><div className="grow">{x.item_name} × {x.quantity}</div><span>₹{Number(x.total).toLocaleString('en-IN')}</span></div>)}</div><p><b>Total ₹{Number(selected.total).toLocaleString('en-IN')}</b></p><div className="actions">{['new','confirmed','preparing','done','cancelled'].map(s=><button className="btn" key={s} onClick={()=>{status(selected.id,s);setSelected({...selected,status:s})}}>{s}</button>)}</div><button className="btn primary" style={{marginTop:10}} onClick={()=>setSelected(null)}>Close</button></section></div>}</>}

function Items(p:any){
  const [editing,setEditing]=useState<Item|null>(null);
  const [form,setForm]=useState<any>({name:'',description:'',price:'',compare_at_price:'',stock:'10',category_id:'',active:true,image_url:null});
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  function openNew(){setEditing(null);setFile(null);setForm({name:'',description:'',price:'',compare_at_price:'',stock:'10',category_id:p.cats[0]?.id||'',active:true,image_url:null});p.setShowAdd(true);}
  function openEdit(i:Item){setEditing(i);setFile(null);setForm({name:i.name,description:i.description||'',price:i.price,compare_at_price:i.compare_at_price||'',stock:i.stock,category_id:i.category_id||'',active:i.active,image_url:i.image_url});p.setShowAdd(true);}
  async function save(){
    if(!form.name||!form.price){p.setError?.('Enter item name and price.');return;}
    setBusy(true);const client=supabase();let image=form.image_url||null;
    const {data:{user}}=await client.auth.getUser();
    if(file&&user){const path=user.id+'/products/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const up=await client.storage.from('store-media').upload(path,file,{upsert:true});if(up.error){p.setError?.(up.error.message);setBusy(false);return;}image=client.storage.from('store-media').getPublicUrl(path).data.publicUrl;}
    const payload={name:form.name.trim(),description:form.description||null,price:Number(form.price),compare_at_price:form.compare_at_price?Number(form.compare_at_price):null,stock:Number(form.stock)||0,category_id:form.category_id||null,active:!!form.active,image_url:image};
    let result;
    if(editing) result=await client.from('items').update(payload).eq('id',editing.id).select().single();
    else result=await client.from('items').insert({...payload,store_id:p.store.id}).select().single();
    if(result.error)p.setError?.(result.error.message);else{p.setItems?.((v:any[])=>editing?v.map(x=>x.id===editing.id?result.data:x):[result.data,...v]);p.setShowAdd(false);setEditing(null);}
    setBusy(false);
  }
  async function remove(i:Item){if(!confirm('Delete this item?'))return;const {error}=await supabase().from('items').delete().eq('id',i.id);if(error)p.setError?.(error.message);else p.setItems?.((v:any[])=>v.filter(x=>x.id!==i.id));}
  return <><div className="pagehead"><div><h1>Items</h1><p>{p.items.length} shown · live from Supabase</p></div><div className="actions"><button className="btn primary" onClick={openNew}><Plus size={12}/> New item</button></div></div>
  <div className="panel"><div className="toolbar"><Search size={14} color="#8a8c99"/><input className="input" value={p.search} onChange={e=>p.setSearch(e.target.value)} placeholder="Search items by name..."/></div>
  {p.items.length?p.items.map((i:Item)=><div className="row" key={i.id}>{i.image_url?<img src={i.image_url} alt="" style={{width:38,height:38,objectFit:'cover',borderRadius:8}}/>:<div style={{width:38,height:38,borderRadius:8,background:'#f1f2f6'}}/>}<div className="grow"><b>{i.name}</b><div className="muted">{p.cats.find((c:Cat)=>c.id===i.category_id)?.name||'Uncategorized'} · {i.stock} in stock</div></div><span>₹{Number(i.price).toLocaleString('en-IN')}</span><span className="pill">{i.active?'Active':'Draft'}</span><button className="btn" onClick={()=>openEdit(i)}>Edit</button><button className="iconbtn" onClick={()=>remove(i)}><Trash2 size={13}/></button></div>):<div className="empty"><div className="big">▱</div>No items yet</div>}</div>
  {p.showAdd&&<div className="panel"><div className="panelhead">{editing?'Edit item':'Add item'} <button className="btn" onClick={()=>p.setShowAdd(false)}>Close</button></div>
  <div className="formgrid"><div className="field"><label>Item name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Premium Hoodie"/></div><div className="field"><label>Price (₹)</label><input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} inputMode="decimal" placeholder="999"/></div><div className="field"><label>Sale / compare price (₹)</label><input value={form.compare_at_price} onChange={e=>setForm({...form,compare_at_price:e.target.value})} inputMode="decimal" placeholder="1299"/></div><div className="field"><label>Stock</label><input value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} inputMode="numeric"/></div><div className="field"><label>Category</label><select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Uncategorized</option>{p.cats.map((c:Cat)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Product image</label><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></div><div className="field" style={{gridColumn:'1/-1'}}><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Short product description"/></div><label style={{fontSize:10}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active on storefront</label></div>
  <div style={{padding:'0 13px 13px'}}><button className="btn primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save item'}</button></div></div>}</>}

function Categories({cats,addCategory,deleteCategory,toggleCategory}:{cats:Cat[];addCategory:(n:string)=>void;deleteCategory:(id:string)=>void;toggleCategory:(c:Cat)=>void}){const [name,setName]=useState('');return <><div className="pagehead"><div><h1>Categories</h1><p>Live categories stored in Supabase.</p></div></div><div className="panel">{cats.map(c=><div className="row" key={c.id}><div className="grow"><b>{c.name}</b><div className="muted">Sort {c.sort_order}</div></div><label style={{fontSize:9}}><input type="checkbox" checked={c.visible} onChange={()=>toggleCategory(c)}/> Visible</label><button className="iconbtn" onClick={()=>deleteCategory(c.id)}><Trash2 size={13}/></button></div>)}<div style={{padding:13}}><b style={{fontSize:11}}>Add category</b><div style={{display:'flex',gap:7,marginTop:7}}><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarees"/><button className="btn primary" onClick={()=>{addCategory(name);setName('')}}>Add category</button></div></div></div></>}

function Payments({store,setStore}:{store:any;setStore:(v:any)=>void}){const [upi,setUpi]=useState(store?.upi_id||'');const [merchant,setMerchant]=useState(store?.merchant_name||store?.name||'');const [saving,setSaving]=useState(false);const save=async()=>{setSaving(true);const {data,error}=await supabase().from('stores').update({upi_id:upi,merchant_name:merchant}).eq('id',store.id).select().single();if(!error)setStore(data);setSaving(false)};return <><div className="pagehead"><div><h1>Payments</h1><p>Configure direct UPI / QR payments for your storefront.</p></div></div><div className="panel"><div className="panelhead">UPI / QR code <span className="muted">Direct merchant payment</span></div><div className="formgrid"><div className="field"><label>UPI ID</label><input value={upi} onChange={e=>setUpi(e.target.value)} placeholder="yourname@upi"/></div><div className="field"><label>Merchant name</label><input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="My Store"/></div></div><div style={{padding:'0 13px 13px',textAlign:'right'}}><button className="btn primary" onClick={save}>{saving?'Saving…':'Save UPI details'}</button></div></div></>}

function Coming({title}:{title:string}){return <div className="panel"><div className="empty"><div className="big">✨</div><b>{title}</b><br/>Module scaffold is ready for the next database integration.</div></div>}

function Shipping({store,setStore}:{store:any;setStore:(v:any)=>void}){const [enabled,setEnabled]=useState(!!store?.shipping_enabled);const [pickup,setPickup]=useState(store?.pickup_postcode||'');const [weight,setWeight]=useState(store?.default_package_weight||0.5);const [length,setLength]=useState(store?.default_package_length||15);const [breadth,setBreadth]=useState(store?.default_package_breadth||10);const [height,setHeight]=useState(store?.default_package_height||5);const [saving,setSaving]=useState(false);async function save(){setSaving(true);const {data,error}=await supabase().from('stores').update({shipping_enabled:enabled,pickup_postcode:pickup,default_package_weight:Number(weight),default_package_length:Number(length),default_package_breadth:Number(breadth),default_package_height:Number(height)}).eq('id',store.id).select().single();if(!error)setStore(data);setSaving(false)}return <><div className="pagehead"><div><h1>Shipping</h1><p>Shiprocket shipping partner integration.</p></div></div><div className="panel"><div className="panelhead">Shiprocket <span className="muted">Platform API connection</span></div><div className="formgrid"><div className="field"><label>Integration</label><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable Shiprocket</label></div><div className="field"><label>Pickup pincode</label><input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="600001"/></div><div className="field"><label>Default weight (kg)</label><input value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal"/></div><div className="field"><label>Length (cm)</label><input value={length} onChange={e=>setLength(e.target.value)} inputMode="decimal"/></div><div className="field"><label>Breadth (cm)</label><input value={breadth} onChange={e=>setBreadth(e.target.value)} inputMode="decimal"/></div><div className="field"><label>Height (cm)</label><input value={height} onChange={e=>setHeight(e.target.value)} inputMode="decimal"/></div></div><div style={{padding:'0 13px 13px'}}><button className="btn primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save shipping settings'}</button></div><div className="muted" style={{padding:13,fontSize:10}}>Shiprocket API credentials stay server-side in Vercel environment variables. Never put the API password or token in browser code or GitHub.</div></div></>}
