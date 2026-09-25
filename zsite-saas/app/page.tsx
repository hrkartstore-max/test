'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Package, Tags, Percent, CreditCard, BarChart3, Store, Settings, Truck, Plus, Search, Trash2, LogOut, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Item={id:string;name:string;description:string|null;price:number;compare_at_price:number|null;stock:number;category_id:string|null;active:boolean;image_url:string|null};
type Cat={id:string;name:string;sort_order:number;visible:boolean};

const nav=[['Dashboard',BarChart3],['Orders',ShoppingCart],['Customers',Store],['Items',Package],['Categories',Tags],['Discounts',Percent],['Payments',CreditCard],['Shipping',Truck],['Plan',CreditCard],['Reports',BarChart3],['WhatsApp',MessageCircle],['Notification Logs',MessageCircle],['Store Customizer',Settings],['zPOS',Store],['zStock',Package]] as const;

export default function Home(){
  const [tab,setTab]=useState('Dashboard');
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
    const productLimit=store?.plan==='growth'?Infinity:store?.plan==='starter'?100:10;
    if(items.length>=productLimit){setError(`Your ${String(store?.plan||'free').toUpperCase()} plan allows ${productLimit===Infinity?'unlimited':productLimit} products. Upgrade your plan to add more.`);return;}
    setSaving(true);setError('');
    const client=supabase();
    const {data,error}=await client.from('items').insert({store_id:store.id,name:newName,price:Number(newPrice),stock:Number(newStock)||0,category_id:newCat||null,active:true}).select().single();
    if(error)setError(error.message);else{setItems(v=>[data,...v]);setNewName('');setNewPrice('');setNewStock('10');setShowAdd(false);}
    setSaving(false);
  }

  async function addCategory(name:string){
    if(!store||!name.trim())return;
    const categoryLimit=store?.plan==='free'?1:Infinity;
    if(cats.length>=categoryLimit){setError('FREE plan includes 1 category. Upgrade to Starter for unlimited categories.');return;}
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

  if(loading)return <div className="loading"><div><b>BUILD YOUR STORE</b><p>Connecting to Supabase and preparing your merchant workspace…</p></div></div>;
  if(!user)return <div className="loading"><div><b>Sign in required</b><p>Connect your merchant account first.</p><button className="btn primary" onClick={()=>location.href='/connect'}>Open login</button></div></div>;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandrow"><div className="logo">H</div><div className="brandtext"><div>HEPRA</div><div className="muted">Store Builder</div></div></div></div>
      <div className="nav">{nav.map(([label,Icon])=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}><Icon size={14}/><span>{label}{label.startsWith('z')&&<em style={{fontSize:8,marginLeft:5,color:'#5146e5'}}>NEW</em>}</span></button>)}</div>
      <div className="footer"><div className="live">● Taking orders</div><button className="nav" style={{border:0,background:'transparent',padding:0}} onClick={signOut}><LogOut size={13}/><span className="hide-mobile">Sign out</span></button></div>
    </aside>
    <main className="main">
      <div className="top"><span>⌂ / {tab}</span><span>{store?.name||'My Store'} · <b style={{textTransform:'uppercase'}}>{store?.plan||'free'}</b>　↗</span></div>
      <section className="content">
        {error&&<div className="error">{error}<button onClick={()=>setError('')}>×</button></div>}
        <div className="setup"><h2>Finish setting up your store 🚀</h2><p>{items.length>0?'Your catalog is live — keep building your store.':'Add your first product to start selling.'}</p><div className="setupgrid"><div className="setupitem"><b>Store</b><span>{store?.name} · /{store?.slug}</span></div><div className="setupitem"><b>Products</b><span>{items.length} items connected to Supabase</span></div><div className="setupitem"><b>Categories</b><span>{cats.length} storefront categories</span></div><div className="setupitem"><b>Payments</b><span>Configure UPI from Payments</span></div></div></div>
        {tab==='Dashboard'&&<Dashboard store={store} items={items} cats={cats}/>}\n        {tab==='Orders'&&<Orders store={store}/>}\n        {tab==='Customers'&&<Customers store={store}/>}
        {tab==='Items'&&<Items items={filtered} cats={cats} search={search} setSearch={setSearch} showAdd={showAdd} setShowAdd={setShowAdd} store={store} setItems={setItems} setError={setError} newName={newName} setNewName={setNewName} newPrice={newPrice} setNewPrice={setNewPrice} newStock={newStock} setNewStock={setNewStock} newCat={newCat} setNewCat={setNewCat} addItem={addItem} saving={saving}/>}
        {tab==='Categories'&&<Categories cats={cats} addCategory={addCategory} deleteCategory={deleteCategory} toggleCategory={toggleCategory}/>}
        {tab==='Discounts'&&<Discounts store={store} setError={setError}/>}
        {tab==='Payments'&&<Payments store={store} setStore={setStore}/>} {tab==='Shipping'&&<Shipping store={store} setStore={setStore}/>} {tab==='Plan'&&<Plan store={store} items={items} cats={cats}/>}
        {tab==='Reports'&&<Reports store={store} items={items}/>}\n      {tab==='WhatsApp'&&<WhatsApp store={store} setStore={setStore}/>}\n      {tab==='Notification Logs'&&<NotificationLogs store={store}/>}\n      {tab==='Store Customizer'&&<StoreCustomizer store={store} setStore={setStore}/>}\n        {['zPOS','zStock'].includes(tab)&&<Coming title={tab}/>}
      </section>
      <div className="mobilebar">{nav.slice(0,5).map(([label,Icon])=><button className={tab===label?'active':''} key={label} onClick={()=>setTab(label)}><Icon size={15}/><br/>{label}</button>)}</div>
    </main>
  </div>
}

function Orders({store}:{store:any}){const [orders,setOrders]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [selected,setSelected]=useState<any>(null);const [filter,setFilter]=useState('all');
useEffect(()=>{load();},[store?.id]);async function load(){if(!store)return;setLoading(true);const {data,error}=await supabase().from('orders').select('*,order_items(*)').eq('store_id',store.id).order('created_at',{ascending:false});if(!error)setOrders(data||[]);setLoading(false);}
async function status(id:string,status:string){const {error}=await supabase().from('orders').update({status}).eq('id',id);if(!error){setOrders(v=>v.map(o=>o.id===id?{...o,status}:o));const {data:{session}}=await supabase().auth.getSession();if(session)fetch('/api/whatsapp/order-status',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:id,status})}).catch(()=>{});}}
const shown=filter==='all'?orders:orders.filter(o=>o.status===filter);const revenue=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total||0),0);
return <><div className="pagehead"><div><h1>Orders</h1><p>{orders.length} total · {orders.filter(o=>!['done','cancelled'].includes(o.status)).length} open</p></div><div className="actions"><button className="btn" onClick={load}>↻ Refresh</button></div></div><div className="cards">{[['TODAY’S ORDERS',String(orders.length)],['TOTAL REVENUE','₹'+revenue.toLocaleString('en-IN')],['OPEN QUEUE',String(orders.filter(o=>!['done','cancelled'].includes(o.status)).length)],['AVG TICKET',orders.length?'₹'+Math.round(revenue/orders.length).toLocaleString('en-IN'):'₹0']].map(x=><div className="stat" key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div><div className="panel"><div className="toolbar">{['all','new','confirmed','preparing','done','cancelled'].map(s=><button key={s} className={`pill ${filter===s?'selected':''}`} onClick={()=>setFilter(s)}>{s==='all'?'All':s[0].toUpperCase()+s.slice(1)} {s==='all'?orders.length:orders.filter(o=>o.status===s).length}</button>)}</div>{loading?<div className="empty">Loading orders…</div>:shown.length?shown.map(o=><div className="row" key={o.id} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}><div className="grow"><b>{o.customer_name}</b><div className="muted">{o.customer_phone} · {new Date(o.created_at).toLocaleString('en-IN')}</div></div><span>₹{Number(o.total).toLocaleString('en-IN')}</span><span className="pill">{o.status}</span>{o.awb_code&&<span className="pill">AWB {o.awb_code}</span>}{o.shipping_status&&<span className="pill">{o.shipping_status}</span>}</div>):<div className="empty"><div className="big">🛒</div><b>No orders here</b><br/>Customer orders will appear here.</div>}</div>{selected&&<div className="overlay"><section className="checkout-box"><div className="drawer-head"><h2>Order details</h2><button onClick={()=>setSelected(null)}>×</button></div><p><b>{selected.customer_name}</b><br/>{selected.customer_phone}<br/>{selected.customer_address}<br/>{selected.shipping_city} {selected.shipping_state} {selected.shipping_pincode}</p><div className="panel" style={{margin:'10px 0'}}>{(selected.order_items||[]).map((x:any)=><div className="row" key={x.id}><div className="grow">{x.item_name} × {x.quantity}</div><span>₹{Number(x.total).toLocaleString('en-IN')}</span></div>)}</div><p><b>Total ₹{Number(selected.total).toLocaleString('en-IN')}</b></p><p className="muted">Payment: <b>{String(selected.payment_method||'cod').toUpperCase()}</b> · Status: <b>{selected.payment_status}</b>{selected.gateway_provider&&<> · Gateway: {selected.gateway_provider}</>}</p>{selected.awb_code&&<div className="muted">Courier: {selected.courier_name||'Assigned'} · AWB: {selected.awb_code}</div>}<div className="actions"><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'label'})});const d=await r.json();if(r.ok){setSelected({...selected,label_url:d.label_url,shipping_status:'label generated'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,label_url:d.label_url,shipping_status:'label generated'}:o));if(d.label_url)window.open(d.label_url,'_blank')}else alert(d.error||'Label failed')}}>Label</button><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'pickup'})});const d=await r.json();if(r.ok){setSelected({...selected,pickup_status:'requested',shipping_status:'pickup requested'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,pickup_status:'requested',shipping_status:'pickup requested'}:o))}else alert(d.error||'Pickup failed')}}>Request pickup</button><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'tracking'})});const d=await r.json();if(r.ok){setSelected({...selected,shipping_status:d.status||selected.shipping_status});setOrders(v=>v.map(o=>o.id===selected.id?{...o,shipping_status:d.status||o.shipping_status}:o))}else alert(d.error||'Tracking failed')}}>Refresh tracking</button><button className="btn primary" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/create',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({order_id:selected.id})});const d=await r.json();if(r.ok){setSelected({...selected,awb_code:d.awb_code,courier_name:d.courier_name,shipping_status:d.awb_code?'AWB assigned':'created'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,...d}:o));}else alert(d.error||'Shipping failed')}}>Ship with Shiprocket</button>{['new','confirmed','preparing','done','cancelled'].map(s=><button className="btn" key={s} onClick={()=>{status(selected.id,s);setSelected({...selected,status:s})}}>{s}</button>)}</div><button className="btn primary" style={{marginTop:10}} onClick={()=>setSelected(null)}>Close</button></section></div>}</>}

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

function Payments({store,setStore}:{store:any;setStore:(v:any)=>void}){const [upi,setUpi]=useState(store?.upi_id||'');const [merchant,setMerchant]=useState(store?.merchant_name||store?.name||'');const [provider,setProvider]=useState(store?.payment_provider||'cashfree');const [saving,setSaving]=useState(false);const save=async()=>{setSaving(true);const {data,error}=await supabase().from('stores').update({upi_id:upi,merchant_name:merchant,payment_provider:provider,upi_enabled:!!upi}).eq('id',store.id).select().single();if(!error)setStore(data);setSaving(false)};return <><div className="pagehead"><div><h1>Payments</h1><p>Cashfree + Razorpay + direct UPI configuration.</p></div></div><div className="panel"><div className="panelhead">Online payment gateway <span className="muted">Server-side credentials stay in Vercel environment variables</span></div><div className="formgrid"><div className="field"><label>Preferred gateway</label><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="cashfree">Cashfree Payments</option><option value="razorpay">Razorpay</option></select></div><div className="field"><label>UPI ID</label><input value={upi} onChange={e=>setUpi(e.target.value)} placeholder="yourname@upi"/></div><div className="field"><label>Merchant name</label><input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="My Store"/></div></div><div style={{padding:'0 13px 13px',textAlign:'right'}}><button className="btn primary" onClick={save}>{saving?'Saving…':'Save payment settings'}</button></div></div></>}
function Discounts({store,setError}:{store:any;setError:(s:string)=>void}){
 const [rows,setRows]=useState<any[]>([]); const [editing,setEditing]=useState<any>(null); const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false);
 const blank={code:'',kind:'percentage',value:'10',max_discount:'',minimum_order:'0',first_order_only:false,show_on_storefront:true,active:true,starts_at:'',ends_at:'',usage_limit:''};
 const [form,setForm]=useState<any>(blank);
 useEffect(()=>{load()},[store?.id]);
 async function load(){if(!store)return;const {data,error}=await supabase().from('discounts').select('*').eq('store_id',store.id).order('created_at',{ascending:false});if(error)setError(error.message);else setRows(data||[]);}
 function edit(x:any){setEditing(x);setForm({...x,value:String(x.value),max_discount:x.max_discount??'',minimum_order:x.minimum_order??0,usage_limit:x.usage_limit??'',starts_at:x.starts_at?String(x.starts_at).slice(0,16):'',ends_at:x.ends_at?String(x.ends_at).slice(0,16):''});setOpen(true)}
 function fresh(){setEditing(null);setForm(blank);setOpen(true)}
 async function save(){if(!form.code.trim()||Number(form.value)<=0){setError('Enter a valid coupon code and discount value.');return}setSaving(true);const payload={store_id:store.id,code:form.code.trim().toUpperCase(),kind:form.kind,value:Number(form.value),max_discount:form.max_discount===''?null:Number(form.max_discount),minimum_order:Number(form.minimum_order)||0,first_order_only:!!form.first_order_only,show_on_storefront:!!form.show_on_storefront,active:!!form.active,starts_at:form.starts_at?new Date(form.starts_at).toISOString():null,ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,usage_limit:form.usage_limit===''?null:Number(form.usage_limit)};
 const q=editing?supabase().from('discounts').update(payload).eq('id',editing.id).eq('store_id',store.id).select().single():supabase().from('discounts').insert(payload).select().single();const {data,error}=await q;if(error)setError(error.message);else{setRows(v=>editing?v.map(x=>x.id===editing.id?data:x):[data,...v]);setOpen(false)}setSaving(false)}
 async function remove(x:any){if(!confirm('Delete coupon '+x.code+'?'))return;const {error}=await supabase().from('discounts').delete().eq('id',x.id).eq('store_id',store.id);if(error)setError(error.message);else setRows(v=>v.filter(y=>y.id!==x.id))}
 return <><div className="pagehead"><div><h1>Discounts</h1><p>{rows.length} coupons · create offers customers can use at checkout.</p></div><button className="btn primary" onClick={fresh}><Plus size={12}/> New coupon</button></div>
 <div className="cards"><div className="stat"><small>ACTIVE</small><strong>{rows.filter(x=>x.active).length}</strong></div><div className="stat"><small>STORE OFFERS</small><strong>{rows.filter(x=>x.show_on_storefront&&x.active).length}</strong></div><div className="stat"><small>USAGE</small><strong>{rows.reduce((s,x)=>s+Number(x.usage_count||0),0)}</strong></div><div className="stat"><small>EXPIRED</small><strong>{rows.filter(x=>x.ends_at&&new Date(x.ends_at)<new Date()).length}</strong></div></div>
 <div className="panel">{rows.length?rows.map(x=><div className="row" key={x.id}><div className="grow"><b>{x.code}</b><div className="muted">{x.kind==='percentage'?x.value+'% off':'₹'+Number(x.value).toLocaleString('en-IN')+' off'} · Min ₹{Number(x.minimum_order||0).toLocaleString('en-IN')}{x.first_order_only?' · First order':''}</div></div><span className="pill">{x.usage_count||0}{x.usage_limit?'/'+x.usage_limit:''} used</span><span className="pill">{x.active?'Active':'Off'}</span><button className="btn" onClick={()=>edit(x)}>Edit</button><button className="iconbtn" onClick={()=>remove(x)}><Trash2 size={13}/></button></div>):<div className="empty"><div className="big">%</div><b>No coupons yet</b><br/>Create your first discount code.</div>}</div>
 {open&&<div className="panel"><div className="panelhead">{editing?'Edit coupon':'New coupon'} <button className="btn" onClick={()=>setOpen(false)}>Close</button></div><div className="formgrid">
 <div className="field"><label>Coupon code</label><input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="WELCOME10"/></div>
 <div className="field"><label>Discount type</label><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="percentage">Percentage %</option><option value="fixed">Fixed ₹</option></select></div>
 <div className="field"><label>Discount value</label><input value={form.value} onChange={e=>setForm({...form,value:e.target.value})} inputMode="decimal"/></div>
 <div className="field"><label>Maximum discount</label><input value={form.max_discount} onChange={e=>setForm({...form,max_discount:e.target.value})} inputMode="decimal" placeholder="Optional"/></div>
 <div className="field"><label>Minimum order</label><input value={form.minimum_order} onChange={e=>setForm({...form,minimum_order:e.target.value})} inputMode="decimal"/></div>
 <div className="field"><label>Usage limit</label><input value={form.usage_limit} onChange={e=>setForm({...form,usage_limit:e.target.value})} inputMode="numeric" placeholder="Unlimited"/></div>
 <div className="field"><label>Starts</label><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></div>
 <div className="field"><label>Ends</label><input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></div>
 <label style={{fontSize:10}}><input type="checkbox" checked={form.first_order_only} onChange={e=>setForm({...form,first_order_only:e.target.checked})}/> First order only</label>
 <label style={{fontSize:10}}><input type="checkbox" checked={form.show_on_storefront} onChange={e=>setForm({...form,show_on_storefront:e.target.checked})}/> Show on storefront</label>
 <label style={{fontSize:10}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label>
 </div><div style={{padding:'0 13px 13px'}}><button className="btn primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save coupon'}</button></div></div>}</>
}

function Coming({title}:{title:string}){return <div className="panel"><div className="empty"><div className="big">✨</div><b>{title}</b><br/>Module scaffold is ready for the next database integration.</div></div>}

function Shipping({store,setStore}:{store:any;setStore:(v:any)=>void}){const [enabled,setEnabled]=useState(!!store?.shipping_enabled);const [pickup,setPickup]=useState(store?.pickup_postcode||'');const [weight,setWeight]=useState(store?.default_package_weight||0.5);const [length,setLength]=useState(store?.default_package_length||15);const [breadth,setBreadth]=useState(store?.default_package_breadth||10);const [height,setHeight]=useState(store?.default_package_height||5);const [free,setFree]=useState(!!store?.free_shipping_enabled);const [min,setMin]=useState(store?.free_shipping_min_order||0);const [flat,setFlat]=useState(store?.flat_shipping_fee||0);const [cod,setCod]=useState(store?.cod_fee||0);const [codEnabled,setCodEnabled]=useState(store?.cod_enabled!==false);const [upiEnabled,setUpiEnabled]=useState(!!store?.upi_enabled);const [saving,setSaving]=useState(false);async function save(){setSaving(true);const {data,error}=await supabase().from('stores').update({shipping_enabled:enabled,pickup_postcode:pickup,default_package_weight:Number(weight),default_package_length:Number(length),default_package_breadth:Number(breadth),default_package_height:Number(height),free_shipping_enabled:free,free_shipping_min_order:Number(min)||0,flat_shipping_fee:Number(flat)||0,cod_fee:Number(cod)||0,cod_enabled:codEnabled,upi_enabled:upiEnabled}).eq('id',store.id).select().single();if(!error)setStore(data);setSaving(false)}return <><div className="pagehead"><div><h1>Shipping</h1><p>Shiprocket + shipping pricing settings.</p></div></div><div className="panel"><div className="panelhead">Shiprocket <span className="muted">Courier integration</span></div><div className="formgrid"><div className="field"><label>Integration</label><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable Shiprocket</label></div><div className="field"><label>Pickup pincode</label><input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="600001"/></div><div className="field"><label>Default weight (kg)</label><input value={weight} onChange={e=>setWeight(e.target.value)}/></div><div className="field"><label>Length (cm)</label><input value={length} onChange={e=>setLength(e.target.value)}/></div><div className="field"><label>Breadth (cm)</label><input value={breadth} onChange={e=>setBreadth(e.target.value)}/></div><div className="field"><label>Height (cm)</label><input value={height} onChange={e=>setHeight(e.target.value)}/></div></div></div><div className="panel"><div className="panelhead">Payment methods <span className="muted">Available at checkout</span></div><div className="formgrid"><div className="field"><label><input type="checkbox" checked={codEnabled} onChange={e=>setCodEnabled(e.target.checked)}/> Enable Cash on Delivery</label></div><div className="field"><label><input type="checkbox" checked={upiEnabled} onChange={e=>setUpiEnabled(e.target.checked)}/> Enable UPI</label></div></div></div><div className="panel"><div className="panelhead">Shipping pricing <span className="muted">Applied at checkout</span></div><div className="formgrid"><div className="field"><label>Flat shipping fee (₹)</label><input value={flat} onChange={e=>setFlat(e.target.value)}/></div><div className="field"><label>COD fee (₹)</label><input value={cod} onChange={e=>setCod(e.target.value)}/></div><div className="field"><label>Free shipping</label><label><input type="checkbox" checked={free} onChange={e=>setFree(e.target.checked)}/> Enable free shipping</label></div><div className="field"><label>Free shipping minimum order (₹)</label><input value={min} onChange={e=>setMin(e.target.value)}/></div></div><div style={{padding:'0 13px 13px'}}><button className="btn primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save shipping settings'}</button></div></div></>}use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Package, Tags, Percent, CreditCard, BarChart3, Store, Settings, Truck, Plus, Search, Trash2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Item={id:string;name:string;description:string|null;price:number;compare_at_price:number|null;stock:number;category_id:string|null;active:boolean;image_url:string|null};
type Cat={id:string;name:string;sort_order:number;visible:boolean};

const nav=[['Orders',ShoppingCart],['Items',Package],['Categories',Tags],['Discounts',Percent],['Payments',CreditCard],['Shipping',Truck],['Plan',CreditCard],['Reports',BarChart3],['zPOS',Store],['zStock',Package]] as const;

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
return <><div className="pagehead"><div><h1>Orders</h1><p>{orders.length} total · {orders.filter(o=>!['done','cancelled'].includes(o.status)).length} open</p></div><div className="actions"><button className="btn" onClick={load}>↻ Refresh</button></div></div><div className="cards">{[['TODAY’S ORDERS',String(orders.length)],['TOTAL REVENUE','₹'+revenue.toLocaleString('en-IN')],['OPEN QUEUE',String(orders.filter(o=>!['done','cancelled'].includes(o.status)).length)],['AVG TICKET',orders.length?'₹'+Math.round(revenue/orders.length).toLocaleString('en-IN'):'₹0']].map(x=><div className="stat" key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong></div>)}</div><div className="panel"><div className="toolbar">{['all','new','confirmed','preparing','done','cancelled'].map(s=><button key={s} className={`pill ${filter===s?'selected':''}`} onClick={()=>setFilter(s)}>{s==='all'?'All':s[0].toUpperCase()+s.slice(1)} {s==='all'?orders.length:orders.filter(o=>o.status===s).length}</button>)}</div>{loading?<div className="empty">Loading orders…</div>:shown.length?shown.map(o=><div className="row" key={o.id} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}><div className="grow"><b>{o.customer_name}</b><div className="muted">{o.customer_phone} · {new Date(o.created_at).toLocaleString('en-IN')}</div></div><span>₹{Number(o.total).toLocaleString('en-IN')}</span><span className="pill">{o.status}</span>{o.awb_code&&<span className="pill">AWB {o.awb_code}</span>}{o.shipping_status&&<span className="pill">{o.shipping_status}</span>}</div>):<div className="empty"><div className="big">🛒</div><b>No orders here</b><br/>Customer orders will appear here.</div>}</div>{selected&&<div className="overlay"><section className="checkout-box"><div className="drawer-head"><h2>Order details</h2><button onClick={()=>setSelected(null)}>×</button></div><p><b>{selected.customer_name}</b><br/>{selected.customer_phone}<br/>{selected.customer_address}<br/>{selected.shipping_city} {selected.shipping_state} {selected.shipping_pincode}</p><div className="panel" style={{margin:'10px 0'}}>{(selected.order_items||[]).map((x:any)=><div className="row" key={x.id}><div className="grow">{x.item_name} × {x.quantity}</div><span>₹{Number(x.total).toLocaleString('en-IN')}</span></div>)}</div><p><b>Total ₹{Number(selected.total).toLocaleString('en-IN')}</b></p>{selected.awb_code&&<div className="muted">Courier: {selected.courier_name||'Assigned'} · AWB: {selected.awb_code}</div>}<div className="actions"><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'label'})});const d=await r.json();if(r.ok){setSelected({...selected,label_url:d.label_url,shipping_status:'label generated'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,label_url:d.label_url,shipping_status:'label generated'}:o));if(d.label_url)window.open(d.label_url,'_blank')}else alert(d.error||'Label failed')}}>Label</button><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'pickup'})});const d=await r.json();if(r.ok){setSelected({...selected,pickup_status:'requested',shipping_status:'pickup requested'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,pickup_status:'requested',shipping_status:'pickup requested'}:o))}else alert(d.error||'Pickup failed')}}>Request pickup</button><button className="btn" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/action',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({order_id:selected.id,action:'tracking'})});const d=await r.json();if(r.ok){setSelected({...selected,shipping_status:d.status||selected.shipping_status});setOrders(v=>v.map(o=>o.id===selected.id?{...o,shipping_status:d.status||o.shipping_status}:o))}else alert(d.error||'Tracking failed')}}>Refresh tracking</button><button className="btn primary" onClick={async()=>{const {data:{session}}=await supabase().auth.getSession();if(!session)return;const r=await fetch('/api/shipping/shiprocket/create',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({order_id:selected.id})});const d=await r.json();if(r.ok){setSelected({...selected,awb_code:d.awb_code,courier_name:d.courier_name,shipping_status:d.awb_code?'AWB assigned':'created'});setOrders(v=>v.map(o=>o.id===selected.id?{...o,...d}:o));}else alert(d.error||'Shipping failed')}}>Ship with Shiprocket</button>{['new','confirmed','preparing','done','cancelled'].map(s=><button className="btn" key={s} onClick={()=>{status(selected.id,s);setSelected({...selected,status:s})}}>{s}</button>)}</div><button className="btn primary" style={{marginTop:10}} onClick={()=>setSelected(null)}>Close</button></section></div>}</>}

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


function Plan({store,items,cats}:{store:any;items:Item[];cats:Cat[]}){
  const [subscription,setSubscription]=useState<any>(null);
  const [loadingSub,setLoadingSub]=useState(false);
  const plan=String(store?.plan||'free');
  const limits:any={free:{name:'FREE',price:'₹0',products:10,categories:1,color:'#15803d'},starter:{name:'STARTER',price:'₹299',products:100,categories:Infinity,color:'#2563eb'},growth:{name:'GROWTH',price:'₹499',products:Infinity,categories:Infinity,color:'#7c3aed'}};
  const current=limits[plan]||limits.free;
  const productLimit=current.products===Infinity?'Unlimited':current.products;
  const productPct=current.products===Infinity?0:Math.min(100,(items.length/current.products)*100);

  useEffect(()=>{
    let cancelled=false;
    async function loadSubscription(){
      if(!store?.id||plan==='free'){setSubscription(null);return;}
      setLoadingSub(true);
      const {data,error}=await supabase().from('store_subscriptions').select('provider_subscription_id,billing_interval,status,amount,currency,current_period_end,created_at').eq('store_id',store.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(!cancelled)setSubscription(error?null:data||null);
      if(!cancelled)setLoadingSub(false);
    }
    loadSubscription();
    return ()=>{cancelled=true};
  },[store?.id,plan]);

  const status=String(store?.subscription_status||subscription?.status||'active').toLowerCase();
  const statusLabel=status==='past_due'?'PAST DUE':status.toUpperCase();
  const renewal=subscription?.current_period_end?new Date(subscription.current_period_end).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
  const interval=String(subscription?.billing_interval||store?.billing_interval||'monthly').toUpperCase();

  return <div>
    <div className="pagehead"><div><h1>Plan & billing</h1><p>Your HEPRA Store Builder subscription and usage.</p></div><div className="actions"><a className="btn primary" href="/pricing">View plans →</a></div></div>
    <div className="plan-dashboard">
      <div className="current-plan" style={{boxShadow:'7px 7px 0 '+current.color}}>
        <div className="plan-dashboard-kicker">CURRENT PLAN</div>
        <div className="plan-dashboard-title"><span style={{background:current.color}}></span>{current.name}</div>
        <strong>{current.price}</strong><small>{plan==='free'?'/ forever':'/ month'}</small>
        <p>{plan==='free'?'You are currently using the free plan. Upgrade when you need more products and advanced selling tools.':status==='past_due'?'Your subscription needs payment attention. Update your payment mandate through Cashfree.':'Your subscription is active and synced with billing.'}</p>
        {plan==='free'&&<a href="/pricing#pricing" className="btn primary">UPGRADE PLAN →</a>}
      </div>
      <div className="usage-card">
        <div className="plan-dashboard-kicker">USAGE</div>
        <div className="usage-row"><span>Products</span><b>{items.length} / {productLimit}</b></div>
        <div className="usage-bar"><i style={{width:productPct+'%'}} /></div>
        <div className="usage-row"><span>Categories</span><b>{cats.length} / {current.categories===Infinity?'Unlimited':current.categories}</b></div>
        <div className="usage-row"><span>Store</span><b>{store?.slug||'—'}</b></div>
        <div className="usage-row"><span>Billing status</span><b>{statusLabel}</b></div>
      </div>
    </div>
    <div className="panel plan-features-panel">
      <div className="panelhead">SUBSCRIPTION <span className="muted">{loadingSub?'Syncing…':'Cashfree billing'}</span></div>
      {plan==='free'?<div className="row"><div className="grow"><b>Free plan</b><div className="muted">No recurring subscription is active.</div></div><span className="pill">FREE</span></div>:<>
        <div className="row"><div className="grow"><b>Status</b><div className="muted">Current subscription state</div></div><span className="pill">{statusLabel}</span></div>
        <div className="row"><div className="grow"><b>Billing cycle</b><div className="muted">{interval==='YEARLY'?'Annual billing':'Monthly billing'}</div></div><span className="pill">{interval}</span></div>
        <div className="row"><div className="grow"><b>Next renewal</b><div className="muted">Cashfree subscription period end</div></div><span>{renewal}</span></div>
        <div className="row"><div className="grow"><b>Subscription ID</b><div className="muted">Provider reference</div></div><span style={{fontSize:10,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis'}}>{subscription?.provider_subscription_id||'—'}</span></div>
        {status==='past_due'&&<div className="error" style={{margin:13}}>Payment needs attention. Your subscription remains marked past due until Cashfree reports a successful payment.</div>}
      </>}
    </div>
    <div className="panel plan-features-panel">
      <div className="panelhead">PLAN FEATURES <span className="muted">Based on your current tier</span></div>
      <div className="row"><div className="grow"><b>Storefront</b><div className="muted">Your public store and order management</div></div><span className="pill">Included</span></div>
      <div className="row"><div className="grow"><b>Products</b><div className="muted">{productLimit} product limit</div></div><span className="pill">{items.length} used</span></div>
      <div className="row"><div className="grow"><b>Custom domain</b><div className="muted">{plan==='free'?'Available on Starter and Growth':'Included'}</div></div><span className="pill">{plan==='free'?'LOCKED':'READY'}</span></div>
      <div className="row"><div className="grow"><b>Advanced tools</b><div className="muted">{plan==='growth'?'Analytics · WhatsApp · advanced shipping':'Available on Growth'}</div></div><span className="pill">{plan==='growth'?'INCLUDED':'UPGRADE'}</span></div>
    </div>
  </div>
}

function Dashboard({store,items,cats}:{store:any;items:Item[];cats:Cat[]}){
  const [orders,setOrders]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;async function load(){if(!store?.id)return;setLoading(true);const {data}=await supabase().from('orders').select('id,customer_name,total,status,created_at,payment_status').eq('store_id',store.id).order('created_at',{ascending:false}).limit(20);if(alive)setOrders(data||[]);setLoading(false)}load();return()=>{alive=false}},[store?.id]);
  const today=new Date(); today.setHours(0,0,0,0);
  const todayOrders=orders.filter(o=>new Date(o.created_at)>=today);
  const revenue=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total||0),0);
  const todayRevenue=todayOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total||0),0);
  const pending=orders.filter(o=>['new','confirmed','preparing'].includes(o.status)).length;
  const paid=orders.filter(o=>String(o.payment_status).toLowerCase()==='paid').length;
  return <div className="dashboard">
    <div className="dashboard-hero">
      <div><div className="dashboard-kicker">MERCHANT COMMAND CENTER</div><h1>GOOD TO SEE YOU, {String(store?.name||'MERCHANT').toUpperCase()}</h1><p>Everything happening across your HEPRA store, in one place.</p></div>
      <div className="dashboard-actions"><a className="btn primary" href={"/store/"+store?.slug} target="_blank" rel="noreferrer">OPEN STORE ↗</a><button className="btn" onClick={()=>location.reload()}>REFRESH</button></div>
    </div>
    <div className="dashboard-grid">
      <div className="dashboard-stat coral"><small>TODAY'S ORDERS</small><strong>{todayOrders.length}</strong><span>{pending} need action</span></div>
      <div className="dashboard-stat"><small>TODAY'S SALES</small><strong>₹{todayRevenue.toLocaleString('en-IN')}</strong><span>{todayOrders.length?'Live from orders':'No orders yet'}</span></div>
      <div className="dashboard-stat purple"><small>CATALOG</small><strong>{items.length}</strong><span>{cats.length} categories</span></div>
      <div className="dashboard-stat"><small>PAID ORDERS</small><strong>{paid}</strong><span>{orders.length?'From recent orders':'Awaiting first order'}</span></div>
    </div>
    <div className="dashboard-columns">
      <div className="panel">
        <div className="panelhead">RECENT ORDERS <span className="muted">₹{revenue.toLocaleString('en-IN')} recent revenue</span></div>
        {loading?<div className="empty">Loading dashboard…</div>:orders.length?orders.slice(0,8).map(o=><div className="row" key={o.id}><div className="grow"><b>{o.customer_name||'Customer'}</b><div className="muted">{new Date(o.created_at).toLocaleString('en-IN')}</div></div><b>₹{Number(o.total||0).toLocaleString('en-IN')}</b><span className="pill">{o.status||'new'}</span></div>):<div className="empty"><div className="big">◎</div><b>Your first order will appear here.</b><br/>Share your storefront to start selling.</div>}
      </div>
      <div className="dashboard-side">
        <div className="panel">
          <div className="panelhead">STORE HEALTH</div>
          <div className="health-row"><span>Products</span><b>{items.length} / {store?.plan==='free'?10:store?.plan==='starter'?100:'∞'}</b></div>
          <div className="health-row"><span>Categories</span><b>{cats.length}</b></div>
          <div className="health-row"><span>Plan</span><b>{String(store?.plan||'free').toUpperCase()}</b></div>
          <div className="health-row"><span>Payments</span><b>{store?.upi_id?'CONNECTED':'SETUP NEEDED'}</b></div>
          <div className="health-row"><span>Shipping</span><b>{store?.shipping_enabled?'SHIPROCKET ON':'NOT CONFIGURED'}</b></div>
        </div>
        <div className="dashboard-quick">
          <div className="dashboard-kicker">QUICK ACTIONS</div>
          <button onClick={()=>location.href='/setup'}>＋ ADD PRODUCT</button>
          <button onClick={()=>location.href='/pricing'}>↗ VIEW PLANS</button>
          <a href={"/store/"+store?.slug} target="_blank" rel="noreferrer">◉ VIEW STOREFRONT</a>
        </div>
      </div>
    </div>
  </div>
}

function StoreCustomizer({store,setStore}:{store:any;setStore:(v:any)=>void}){
 const [form,setForm]=useState<any>({theme_primary:store?.theme_primary||'#f05a3c',theme_background:store?.theme_background||'#f3efe3',theme_text:store?.theme_text||'#111722',theme_font:store?.theme_font||'Inter',theme_button_radius:store?.theme_button_radius||'0px',hero_image_url:store?.hero_image_url||'',hero_title:store?.hero_title||'Shop your everyday favourites.',hero_subtitle:store?.hero_subtitle||'Simple shopping with direct ordering.',announcement_text:store?.announcement_text||''});
 const [saving,setSaving]=useState(false);const [saved,setSaved]=useState('');
 async function save(){setSaving(true);const {data,error}=await supabase().from('stores').update(form).eq('id',store.id).select().single();if(error)setSaved(error.message);else{setStore(data);setSaved('Store customization saved');}setSaving(false)}
 return <div className="customizer"><div className="pagehead"><div><h1>Store Customizer</h1><p>Customize your storefront brand, hero and announcement without code.</p></div><button className="btn primary" onClick={save} disabled={saving}>{saving?'Saving…':'Publish changes'}</button></div>
 <div className="custom-grid"><div className="panel"><div className="panelhead">BRAND & COLORS</div><div className="custom-fields"><div className="field"><label>Primary color</label><div className="color-input"><input type="color" value={form.theme_primary} onChange={e=>setForm({...form,theme_primary:e.target.value})}/><input value={form.theme_primary} onChange={e=>setForm({...form,theme_primary:e.target.value})}/></div></div><div className="field"><label>Store background</label><div className="color-input"><input type="color" value={form.theme_background} onChange={e=>setForm({...form,theme_background:e.target.value})}/><input value={form.theme_background} onChange={e=>setForm({...form,theme_background:e.target.value})}/></div></div><div className="field"><label>Text color</label><div className="color-input"><input type="color" value={form.theme_text} onChange={e=>setForm({...form,theme_text:e.target.value})}/><input value={form.theme_text} onChange={e=>setForm({...form,theme_text:e.target.value})}/></div></div><div className="field"><label>Font</label><select value={form.theme_font} onChange={e=>setForm({...form,theme_font:e.target.value})}><option>Inter</option><option>Manrope</option><option>Poppins</option><option>Montserrat</option><option>Arial</option></select></div><div className="field"><label>Button corners</label><select value={form.theme_button_radius} onChange={e=>setForm({...form,theme_button_radius:e.target.value})}><option value="0px">Square</option><option value="8px">Rounded</option><option value="18px">Pill</option></select></div></div></div>
 <div className="panel"><div className="panelhead">HERO CONTENT</div><div className="field"><label>Hero title</label><input value={form.hero_title} onChange={e=>setForm({...form,hero_title:e.target.value})}/></div><div className="field"><label>Hero subtitle</label><textarea value={form.hero_subtitle} onChange={e=>setForm({...form,hero_subtitle:e.target.value})}/></div><div className="field"><label>Announcement bar</label><input value={form.announcement_text} onChange={e=>setForm({...form,announcement_text:e.target.value})} placeholder="Free shipping on orders above ₹999"/></div><div className="field"><label>Hero image URL</label><input value={form.hero_image_url} onChange={e=>setForm({...form,hero_image_url:e.target.value})} placeholder="https://..."/></div></div></div>
 <div className="panel custom-preview"><div className="panelhead">LIVE PREVIEW</div><div className="preview-store" style={{background:form.theme_background,color:form.theme_text,fontFamily:form.theme_font}}>{form.announcement_text&&<div className="preview-announcement" style={{background:form.theme_primary}}>{form.announcement_text}</div>}<div className="preview-nav"><b>{store?.name||'My Store'}</b><span>Cart</span></div><div className="preview-hero"><small>WELCOME TO {(store?.name||'MY STORE').toUpperCase()}</small><h2>{form.hero_title}</h2><p>{form.hero_subtitle}</p><button style={{background:form.theme_primary,color:form.theme_text,borderRadius:form.theme_button_radius}}>Shop now</button></div></div></div>
 {saved&&<div className="wa-saved">{saved}</div>}</div>
}

function Reports({store,items}:{store:any;items:Item[]}){
  const [orders,setOrders]=useState<any[]>([]);
  const [range,setRange]=useState(7);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;async function load(){if(!store?.id)return;setLoading(true);const {data}=await supabase().from('orders').select('id,total,status,created_at,payment_status,payment_method').eq('store_id',store.id).order('created_at',{ascending:false}).limit(1000);if(alive)setOrders(data||[]);setLoading(false)}load();return()=>{alive=false}},[store?.id]);
  const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-(range-1));
  const filtered=orders.filter(o=>new Date(o.created_at)>=cutoff);
  const valid=filtered.filter(o=>o.status!=='cancelled');
  const revenue=valid.reduce((s,o)=>s+Number(o.total||0),0);
  const avg=valid.length?Math.round(revenue/valid.length):0;
  const paid=filtered.filter(o=>String(o.payment_status).toLowerCase()==='paid').length;
  const cod=filtered.filter(o=>String(o.payment_method).toLowerCase()==='cod').length;
  const daily=Array.from({length:range},(_,i)=>{const d=new Date(cutoff);d.setDate(cutoff.getDate()+i);const key=d.toISOString().slice(0,10);return {key,label:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),value:valid.filter(o=>String(o.created_at).slice(0,10)===key).reduce((s,o)=>s+Number(o.total||0),0),count:valid.filter(o=>String(o.created_at).slice(0,10)===key).length}}).filter(x=>range<=14||x.value>0||x.count>0);
  const max=Math.max(...daily.map(x=>x.value),1);
  return <div className="reports">
    <div className="pagehead"><div><h1>Reports & analytics</h1><p>Sales, orders and payment performance from your store.</p></div><div className="actions">{[7,30,90].map(n=><button key={n} className={range===n?'btn primary':'btn'} onClick={()=>setRange(n)}>{n}D</button>)}</div></div>
    <div className="cards">
      <div className="stat"><small>NET SALES</small><strong>₹{revenue.toLocaleString('en-IN')}</strong></div>
      <div className="stat"><small>ORDERS</small><strong>{valid.length}</strong></div>
      <div className="stat"><small>AVG ORDER VALUE</small><strong>₹{avg.toLocaleString('en-IN')}</strong></div>
      <div className="stat"><small>PAID / COD</small><strong>{paid} / {cod}</strong></div>
    </div>
    <div className="reports-grid">
      <div className="panel report-chart"><div className="panelhead">SALES TREND <span className="muted">Last {range} days</span></div>{loading?<div className="empty">Loading analytics…</div>:daily.length?<div className="chart-wrap"><div className="chart-bars">{daily.map(x=><div className="chart-col" key={x.key} title={x.label+' · ₹'+x.value.toLocaleString('en-IN')}><div className="chart-bar" style={{height:Math.max(4,(x.value/max)*150)}}></div><span>{x.label}</span></div>)}</div></div>:<div className="empty">No sales data for this period.</div>}</div>
      <div className="panel"><div className="panelhead">ORDER MIX</div><div className="mix-row"><span>Paid</span><b>{paid}</b></div><div className="mix-row"><span>COD</span><b>{cod}</b></div><div className="mix-row"><span>Pending</span><b>{filtered.filter(o=>String(o.payment_status).toLowerCase()!=='paid').length}</b></div><div className="mix-row"><span>Cancelled</span><b>{filtered.filter(o=>o.status==='cancelled').length}</b></div></div>
    </div>
    <div className="panel"><div className="panelhead">TOP PRODUCTS <span className="muted">{items.length} catalog items</span></div>{items.length?items.slice(0,8).map((i,idx)=><div className="row" key={i.id}><span className="rank">{String(idx+1).padStart(2,'0')}</span><div className="grow"><b>{i.name}</b><div className="muted">{i.stock} in stock</div></div><span>₹{Number(i.price||0).toLocaleString('en-IN')}</span><span className="pill">{i.active?'LIVE':'DRAFT'}</span></div>):<div className="empty">Add products to start tracking your catalog.</div>}</div>
  </div>
}

function Customers({store}:{store:any}){
  const [orders,setOrders]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;async function load(){if(!store?.id)return;setLoading(true);const {data}=await supabase().from('orders').select('id,customer_name,customer_phone,customer_email,customer_address,shipping_city,shipping_state,shipping_pincode,total,status,created_at,payment_status').eq('store_id',store.id).order('created_at',{ascending:false}).limit(2000);if(alive)setOrders(data||[]);setLoading(false)}load();return()=>{alive=false}},[store?.id]);
  const customers=useMemo(()=>{
    const map=new Map<string,any>();
    for(const o of orders){
      const key=(String(o.customer_phone||'').trim()||String(o.customer_email||'').trim()||String(o.customer_name||'customer').trim()).toLowerCase();
      const existing=map.get(key);
      if(existing){existing.orders+=1;existing.spend+=Number(o.total||0);if(new Date(o.created_at)>new Date(existing.last_order))existing.last_order=o.created_at;existing.orderRows.push(o);}
      else map.set(key,{key,name:o.customer_name||'Customer',phone:o.customer_phone||'—',email:o.customer_email||'—',address:o.customer_address||'',city:o.shipping_city||'',state:o.shipping_state||'',pincode:o.shipping_pincode||'',orders:1,spend:Number(o.total||0),last_order:o.created_at,orderRows:[o]});
    }
    return [...map.values()].sort((a,b)=>b.spend-a.spend);
  },[orders]);
  const shown=customers.filter(c=>(c.name+' '+c.phone+' '+c.email).toLowerCase().includes(search.toLowerCase()));
  const totalSpend=customers.reduce((s,c)=>s+c.spend,0);
  return <div className="customers">
    <div className="pagehead"><div><h1>Customers</h1><p>{customers.length} customers · built from your order history.</p></div><div className="actions"><button className="btn" onClick={()=>location.reload()}>↻ Refresh</button></div></div>
    <div className="cards"><div className="stat"><small>TOTAL CUSTOMERS</small><strong>{customers.length}</strong></div><div className="stat"><small>REPEAT CUSTOMERS</small><strong>{customers.filter(c=>c.orders>1).length}</strong></div><div className="stat"><small>CUSTOMER SALES</small><strong>₹{totalSpend.toLocaleString('en-IN')}</strong></div><div className="stat"><small>AVG CUSTOMER VALUE</small><strong>₹{customers.length?Math.round(totalSpend/customers.length).toLocaleString('en-IN'):'0'}</strong></div></div>
    <div className="panel"><div className="toolbar"><Search size={14}/><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone or email..."/></div>
      {loading?<div className="empty">Loading customers…</div>:shown.length?shown.map(c=><div className="row customer-row" key={c.key} onClick={()=>setSelected(c)}><div className="customer-avatar">{String(c.name).slice(0,1).toUpperCase()}</div><div className="grow"><b>{c.name}</b><div className="muted">{c.phone} · {c.email}</div></div><span><b>{c.orders}</b> orders</span><span>₹{c.spend.toLocaleString('en-IN')}</span><span className="pill">{c.orders>1?'REPEAT':'NEW'}</span></div>):<div className="empty"><div className="big">◎</div>No customers found.</div>}
    </div>
    {selected&&<div className="overlay"><section className="checkout-box customer-drawer"><div className="drawer-head"><h2>{selected.name}</h2><button onClick={()=>setSelected(null)}>×</button></div><div className="customer-profile"><div className="customer-avatar large">{String(selected.name).slice(0,1).toUpperCase()}</div><div><b>{selected.phone}</b><div className="muted">{selected.email}</div></div></div><div className="customer-summary"><div><small>ORDERS</small><b>{selected.orders}</b></div><div><small>SPEND</small><b>₹{selected.spend.toLocaleString('en-IN')}</b></div><div><small>LAST ORDER</small><b>{new Date(selected.last_order).toLocaleDateString('en-IN')}</b></div></div><div className="customer-address"><small>DELIVERY ADDRESS</small><p>{selected.address||'—'}<br/>{selected.city} {selected.state} {selected.pincode}</p></div><div className="panel"><div className="panelhead">ORDER HISTORY</div>{selected.orderRows.map((o:any)=><div className="row" key={o.id}><div className="grow"><b>{new Date(o.created_at).toLocaleDateString('en-IN')}</b><div className="muted">{o.payment_status||'pending'}</div></div><span>₹{Number(o.total||0).toLocaleString('en-IN')}</span><span className="pill">{o.status}</span></div>)}</div><button className="btn primary" style={{marginTop:10}} onClick={()=>setSelected(null)}>Close</button></section></div>}
  </div>
}
