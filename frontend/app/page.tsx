import Link from "next/link";
import { ArrowRight, Check, CreditCard, Globe, LayoutTemplate, MessageCircle, ShieldCheck, Sparkles, Store, Zap, ShoppingBag } from "lucide-react";



export default function Home() {
  return (
    <main>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand"><span className="brand-mark">H</span> HEPRA</Link>
          <nav className="desktop-nav">
            <a href="#features">Features</a>
            <a href="#demos">Live Demos</a>
            <a href="#features">Features</a>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="text-link">Login</Link>
            <Link href="/register" className="button button-dark">Start free <ArrowRight size={16}/></Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow"><Sparkles size={15}/> YOUR BUSINESS. YOUR STORE. YOUR BRAND.</div>
            <h1>Create a website your customers will love.</h1>
            <p className="hero-copy">Choose your business type, explore a finished website demo, and create your own professional online store with HEPRA.</p>
            <div className="hero-actions">
              <Link href="#demos" className="button button-primary">Explore website demos <ArrowRight size={18}/></Link>
              <a href="#features" className="button button-light">How HEPRA works</a>
            </div>
            <div className="trust-row"><span><Check size={15}/> Mobile-first</span><span><Check size={15}/> No coding</span><span><Check size={15}/> Multi-store ready</span></div>
          </div>
          <div className="dashboard-card">
            <div className="mock-top"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="mock-url">app.hepra.in/dashboard</span></div>
            <div className="mock-body">
              <aside><div className="mini-logo">H</div><b>Dashboard</b><small>Products</small><small>Orders</small><small>Customers</small><small>Analytics</small><small>Website</small></aside>
              <div className="mock-main">
                <div className="mock-title">Good morning 👋</div>
                <div className="stats"><div><small>Revenue</small><strong>₹84,920</strong><em>+18.4%</em></div><div><small>Orders</small><strong>284</strong><em>+12.8%</em></div><div><small>Customers</small><strong>1,248</strong><em>+9.1%</em></div></div>
                <div className="chart"><div className="bars">{[32,55,43,74,61,82,68,91,76,98,84,100].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demos" className="section muted">
        <div className="container">
          <div className="section-heading"><div className="eyebrow">LIVE WEBSITE DEMOS</div><h2>See the finished website before you create it.</h2><p>Choose a business category, open a demo, and start from a design that already fits your business.</p></div>
          <div className="template-grid">
            {[
              ["🍕","Restaurant & Cloud Kitchen","Menu • Online ordering • WhatsApp"],
              ["🥬","Grocery & Fresh Foods","Categories • Products • Delivery"],
              ["👗","Fashion & Apparel","Collections • Wishlist • Cart"],
              ["💎","Jewellery","Premium catalog • Enquiry • WhatsApp"],
              ["🍰","Bakery & Cakes","Products • Custom orders • Delivery"],
              ["📱","Electronics","Products • Variants • COD"],
              ["🪔","Pooja Essentials","Catalog • WhatsApp • COD"],
              ["🌶️","Pickles, Masalas & Spices","Catalog • Orders • WhatsApp"]
            ].map(([icon,name,copy],i)=><div className="template" key={name}>
              <div className={`template-art art-${i%6}`} style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:58}}>{icon}</div>
              <div className="template-info"><b>{name}</b><span>{copy}</span><div style={{display:'flex',gap:8,marginTop:12}}><a href={`/store/demo-${i+1}`} className="button button-light" style={{fontSize:12,padding:'9px 12px'}}>View Demo</a><a href="/register" className="button button-dark" style={{fontSize:12,padding:'9px 12px'}}>Create This Website</a></div></div>
            </div>)}
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-heading"><div className="eyebrow">WHAT YOUR CLIENT GETS</div><h2>Features that matter to a real business.</h2><p>HEPRA focuses on the finished result — website, selling tools and simple management.</p></div>
          <div className="feature-grid">
            {[
              ["Online Store","Professional product catalog, categories, product pages and cart.",Store],
              ["WhatsApp Ordering","Let customers contact and order directly through WhatsApp.",MessageCircle],
              ["Payments & COD","UPI, cards, payment gateway and COD depending on the plan.",CreditCard],
              ["Mobile-First Design","A storefront designed for phones, tablets and desktop.",LayoutTemplate],
              ["Custom Domain","Connect the client's own domain for a professional brand.",Globe],
              ["Website Builder","Customize sections, branding, banners, pages and content.",Zap],
              ["Orders & Customers","Manage orders and customer activity from one dashboard.",ShoppingBag],
              ["Multi-Client Platform","HEPRA can manage multiple independent client stores.",ShieldCheck]
            ].map(([title,copy,Icon])=><div className="feature-card" key={title as string}><div className="icon-box"><Icon size={21}/></div><h3>{title as string}</h3><p>{copy as string}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section muted">
        <div className="container">
          <div className="section-heading"><div className="eyebrow">HOW IT WORKS</div><h2>From business idea to live website.</h2></div>
          <div className="feature-grid">
            {[['01','Choose business type'],['02','Explore a live design'],['03','Create your website'],['04','Add products & brand'],['05','Publish & connect domain'],['06','Manage orders & customers']].map(([n,t])=><div className="feature-card" key={n}><div className="eyebrow">{n}</div><h3>{t}</h3><p>Simple client workflow with no coding required.</p></div>)}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner"><div><div className="eyebrow">READY TO LAUNCH?</div><h2>Your next customer could be online today.</h2></div><Link href="/register" className="button button-dark">Create your HEPRA store <ArrowRight size={18}/></Link></div>
      </section>

      <footer><div className="container footer-inner"><div><Link href="/" className="brand"><span className="brand-mark">H</span> HEPRA</Link><p>Build. Sell. Grow.</p></div><div><b>Platform</b><a href="#features">Features</a><a href="#demos">Live Demos</a><a href="#features">Features</a></div><div><b>Company</b><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></div></div></footer>
    </main>
  );
}
