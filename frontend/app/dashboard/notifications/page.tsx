"use client";
import {useEffect,useState} from "react";

type Log={id:string;channel:string;event:string;recipient?:string;message?:string;status:string;created_at:string;error?:string};

export default function NotificationsPage(){
 const [logs,setLogs]=useState<Log[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/notifications",{credentials:"include"}).then(r=>r.ok?r.json():[]).then(setLogs).finally(()=>setLoading(false))},[]);
 return <main style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
   <div><h1 style={{fontSize:28,fontWeight:800,margin:0}}>Notifications</h1><p style={{opacity:.65,marginTop:6}}>WhatsApp and order notification activity</p></div>
   <span style={{padding:"8px 12px",borderRadius:999,border:"1px solid #ddd",fontSize:13}}>Log-first mode</span>
  </div>
  <section style={{border:"1px solid #e5e5e5",borderRadius:16,overflow:"hidden",background:"#fff"}}>
   <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1.5fr .8fr 1.2fr",gap:12,padding:14,fontWeight:700,borderBottom:"1px solid #eee"}}><span>Event</span><span>Channel</span><span>Recipient</span><span>Status</span><span>Date</span></div>
   {loading?<div style={{padding:28,opacity:.6}}>Loading notifications…</div>:logs.length===0?<div style={{padding:40,textAlign:"center",opacity:.6}}>No notifications yet.</div>:logs.map(x=><div key={x.id} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1.5fr .8fr 1.2fr",gap:12,padding:14,borderBottom:"1px solid #f0f0f0",fontSize:14}}><span style={{fontWeight:600}}>{x.event.replace(/_/g," ")}</span><span>{x.channel}</span><span>{x.recipient||"—"}</span><span>{x.status}</span><span>{new Date(x.created_at).toLocaleString()}</span></div>)}
  </section>
 </main>
}
