'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Setup(){
  const [store,setStore]=useState<any>(null),[name,setName]=useState(''),[slug,setSlug]=useState(''),[logo,setLogo]=useState<File|null>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{load();},[]);
  async function load(){const c=supabase();const {data:{user}}=await c.auth.getUser();if(!user){location.href='/connect';return;}const {data}=await c.from('stores').select('*').eq('owner_id',user.id).limit(1).maybeSingle();if(data){setStore(data);setName(data.name);setSlug(data.slug);}}
  function makeSlug(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  async function save(){if(!name.trim()||!slug.trim())return;setSaving(true);setMessage('');const c=supabase();let logoUrl=store?.logo_url||null;const {data:{user}}=await c.auth.getUser();if(!user){location.href='/connect';return;}
    if(logo){const path=user.id+'/'+Date.now()+'-'+logo.name.replace(/[^a-zA-Z0-9._-]/g,'-');const up=await c.storage.from('store-media').upload(path,logo,{upsert:true});if(up.error){setMessage(up.error.message);setSaving(false);return;}logoUrl=c.storage.from('store-media').getPublicUrl(path).data.publicUrl;}
    const payload={name:name.trim(),slug:slug.trim(),logo_url:logoUrl};let result;
    if(store)result=await c.from('stores').update(payload).eq('id',store.id).select().single();else result=await c.from('stores').insert({...payload,owner_id:user.id}).select().single();
    if(result.error){setMessage(result.error.message);setSaving(false);return;}setStore(result.data);setMessage('Store saved successfully.');setSaving(false);
  }
  return <main className="setup-page"><section className="setup-card"><div className="logo">H</div><h1>Set up your store</h1><p>Choose the identity customers will see on your storefront.</p><label>Store name<input value={name} onChange={e=>{setName(e.target.value);if(!store)setSlug(makeSlug(e.target.value))}} placeholder="HEPRA Fashion"/></label><label>Store URL slug<div className="slug-input"><span>/store/</span><input value={slug} onChange={e=>setSlug(makeSlug(e.target.value))}/></div></label><label>Store logo<input type="file" accept="image/*" onChange={e=>setLogo(e.target.files?.[0]||null)}/></label>{message&&<div className="setup-message">{message}</div>}<button className="btn primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save & continue'}</button>{store&&<button className="btn" onClick={()=>location.href='/'}>Open dashboard</button>}</section></main>
}
