'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ConnectPage() {
  const [status, setStatus] = useState('Checking Supabase connection…');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        const client = supabase();
        const { error } = await client.from('stores').select('id').limit(1);
        if (error) setStatus('Supabase reachable, but authentication is required for store data.');
        else setStatus('Supabase connected successfully.');
      } catch (e) {
        setStatus('Supabase configuration is missing. Add the Vercel environment variables.');
      }
    };
    check();
  }, []);

  const submit = async () => {
    setMessage('');
    const client = supabase();
    const result = mode === 'signin'
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password });

    if (result.error) setMessage(result.error.message);
    else setMessage(mode === 'signin' ? 'Signed in successfully. Your admin is connected to Supabase.' : 'Account created. Check your email if confirmation is enabled.');
  };

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f6f7fb',fontFamily:'Inter,system-ui,sans-serif',padding:20}}>
    <section style={{width:'100%',maxWidth:430,background:'#fff',border:'1px solid #e7e8ef',borderRadius:18,padding:28,boxShadow:'0 10px 40px rgba(20,20,40,.06)'}}>
      <div style={{display:'inline-grid',placeItems:'center',width:42,height:42,borderRadius:12,background:'#5146e5',color:'#fff',fontWeight:800}}>H</div>
      <h1 style={{fontSize:22,margin:'16px 0 5px'}}>HEPRA Store Builder</h1>
      <p style={{fontSize:13,color:'#777b8a',marginTop:0}}>Supabase-connected merchant authentication</p>
      <div style={{padding:12,borderRadius:10,background:'#f5f5ff',color:'#5146e5',fontSize:12,margin:'18px 0'}}>{status}</div>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={{width:'100%',padding:12,border:'1px solid #dddfea',borderRadius:9,marginBottom:9}}/>
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={{width:'100%',padding:12,border:'1px solid #dddfea',borderRadius:9,marginBottom:12}}/>
      <button onClick={submit} style={{width:'100%',padding:12,border:0,borderRadius:9,background:'#5146e5',color:'#fff',fontWeight:700}}>{mode==='signin'?'Sign in':'Create account'}</button>
      <button onClick={()=>setMode(mode==='signin'?'signup':'signin')} style={{width:'100%',padding:10,border:0,background:'transparent',color:'#5146e5',fontSize:12}}>{mode==='signin'?'Create a new merchant account':'Already have an account? Sign in'}</button>
      {message&&<p style={{fontSize:12,color:'#555',marginTop:10}}>{message}</p>}
    </section>
  </main>
}