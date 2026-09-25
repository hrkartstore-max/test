'use client';
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";
import {Rocket as RocketIcon,Search as SearchIcon,Image as ImageIcon,LayoutTemplate,Globe,CreditCard,BarChart3,Box,LayoutDashboard,Package,Settings,ShoppingBag,Users,ChevronRight} from "lucide-react";

const nav:any[]=[
 ["Dashboard",LayoutDashboard,"/dashboard"],["Products",Package,"/dashboard/products"],["Orders",ShoppingBag,"/dashboard/orders"],
 ["Customers",Users,"/dashboard/customers"],["Pages",LayoutTemplate,"/dashboard/pages"],["Media",ImageIcon,"/dashboard/media"],
 ["Publish",RocketIcon,"/dashboard/publish"],["SEO",SearchIcon,"/dashboard/seo"],["Website",LayoutTemplate,"/dashboard/website"],
 ["Domains",Globe,"/dashboard/domains"],["Billing",CreditCard,"/dashboard/billing"],["Coupons",TagIcon,"/dashboard/coupons"],
 ["Staff",Users,"/dashboard/staff"],["Audit logs",HistoryIcon,"/dashboard/audit"],["Inventory",Box,"/dashboard/products"],
 ["Analytics",BarChart3,"#"],["Settings",Settings,"#"]
];

function money(n:number){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0})}

export default function Dashboard(){
 const [store,setStore]=useState<any>(null),[products,setProducts]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{try{const [s,p,o,c]=await Promise.all([api("/api/store"),api("/api/products"),api("/api/orders"),api("/api/customers")]);if(!live)return;setStore(s);setProducts(Array.isArray(p)?p:(p?.items||[]));setOrders(Array.isArray(o)?o:(o?.orders||[]));setCustomers(Array.isArray(c)?c:(c?.customers||[]));}catch(e:any){if(live)setError(e.message||"Unable to load dashboard data");}finally{if(live)setLoading(false)}})();return()=>{live=false}},[]);
 const revenue=useMemo(()=>orders.reduce((s,o)=>s+Number(o.total||0),0),[orders]);
 const lowStock=products.filter(p=>Number(p.stock||0)<=5).slice(0,5);
 return <div className="app-shell">
  <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">H</span> HEPRA</Link>
   <div className="store-switch"><span className="avatar">{(store?.name||"H").slice(0,1).toUpperCase()}</span><div><b>{store?.name||"HEPRA Store"}</b><small>{store?.slug?"hepra.in/store/"+store.slug:"Store setup"}</small></div><ChevronRight size={16}/></div>
   <nav>{nav.map(([n,I,h],i)=><Link className={i===0?"active":""} href={h} key={n}><I size={18}/>{n}</Link>)}</nav>
   <div className="sidebar-bottom"><div className="plan-box"><small>Current plan</small><b>STARTER</b><span>Manage billing</span></div><Link href="/dashboard/website" className="view-store">Customize site →</Link></div>
  </aside>
  <section className="main-panel"><header className="dash-header"><div><small>HEPRA STORE</small><h1>Store dashboard</h1></div><div className="header-tools"><div className="profile">{(store?.name||"H").slice(0,1).toUpperCase()}</div></div></header>
   <div className="dashboard-content">
    {error&&<div className="error-box">{error}</div>}
    <div className="stats-row">
      {[["Revenue",money(revenue),""],["Orders",String(orders.length),""],["Customers",String(customers.length),""],["Products",String(products.length),""]].map(x=><div className="dash-stat" key={x[0]}><small>{x[0]}</small><strong>{loading?"—":x[1]}</strong><em>{loading?"Loading…":"Live store data"}</em></div>)}
    </div>
    <div className="dash-grid">
      <div className="panel"><div className="panel-head"><div><b>Store status</b><span>Live configuration</span></div><Link href="/dashboard/publish">Manage</Link></div>
       <div className="quick"><div><b>{store?.published?"Published":"Draft"}</b><small>{store?.published?"Customers can access your storefront.":"Complete setup and publish your storefront."}</small></div><Link href="/dashboard/website"><span>✦</span>Customize website</Link><Link href="/dashboard/products"><span>＋</span>Add product</Link></div>
      </div>
      <div className="panel"><div className="panel-head"><div><b>Quick actions</b><span>Manage your store</span></div></div><div className="quick"><Link href="/dashboard/orders"><span>↗</span>View orders</Link><Link href="/dashboard/coupons"><span>⌁</span>Create coupon</Link><Link href="/dashboard/media"><span>＋</span>Upload media</Link></div></div>
    </div>
    <div className="dash-grid bottom">
      <div className="panel"><div className="panel-head"><div><b>Recent orders</b><span>Real customer activity</span></div><Link href="/dashboard/orders">View all</Link></div>
       <table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>
       {orders.slice(0,6).map(o=><tr key={o._id||o.id}><td><b>{o.orderNumber||("#"+String(o._id||o.id).slice(0,8))}</b></td><td>{o.customer?.name||"—"}</td><td><span className="status">{o.status||"new"}</span></td><td><b>{money(o.total)}</b></td></tr>)}
       {!loading&&!orders.length&&<tr><td colSpan={4} className="empty-cell">No orders yet.</td></tr>}</tbody></table>
      </div>
      <div className="panel low-stock"><div className="panel-head"><div><b>Low stock</b><span>Products needing attention</span></div><Link href="/dashboard/products">Manage</Link></div>
       {lowStock.map(p=><div className="stock" key={p._id||p.id}><span className="product-dot"></span><div><b>{p.name}</b><small>{p.stock} left</small></div><span>⚠</span></div>)}
       {!loading&&!lowStock.length&&<div className="empty-cell">No low-stock products.</div>}
      </div>
    </div>
   </div>
  </section>
 </div>
}
function TagIcon(){return <span>⌁</span>}
function HistoryIcon(){return <span>◷</span>}