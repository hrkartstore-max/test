import Link from "next/link";
import { ArrowRight, Check, CreditCard, Globe, LayoutTemplate, MessageCircle, ShieldCheck, Sparkles, Store, Zap, ShoppingBag, Play, ChevronDown } from "lucide-react";

const demos = [
  ["01","Restaurant","Menu • Online ordering • WhatsApp","🍕"],
  ["02","Grocery","Fresh products • Delivery • Categories","🥬"],
  ["03","Fashion","Collections • Wishlist • Cart","👗"],
  ["04","Jewellery","Premium catalog • Enquiry • WhatsApp","💎"],
  ["05","Bakery","Products • Custom orders • Delivery","🍰"],
  ["06","Electronics","Products • Variants • COD","📱"],
  ["07","Pooja Store","Catalog • WhatsApp • COD","🪔"],
  ["08","Spices","Catalog • Orders • WhatsApp","🌶️"],
];

const features = [
  ["Online Store","Professional catalog, categories, product pages and cart.",Store],
  ["WhatsApp Ordering","Turn conversations into orders with direct WhatsApp actions.",MessageCircle],
  ["Payments & COD","UPI, cards, gateway and COD-ready checkout flows.",CreditCard],
  ["Mobile-First","Fast storefronts designed for phones, tablets and desktop.",LayoutTemplate],
  ["Custom Domain","Connect your own domain and build a recognizable brand.",Globe],
  ["Website Builder","Edit sections, banners, pages, branding and content.",Zap],
  ["Orders & Customers","Manage orders, customers and store activity in one place.",ShoppingBag],
  ["Multi-Store Ready","Create and manage independent client storefronts.",ShieldCheck],
];

export default function Home() {
  return (
    <main className="ref-home">
      <header className="ref-nav">
        <div className="ref-container ref-nav-inner">
          <Link href="/" className="ref-brand"><span>H</span> HEPRA</Link>
          <nav>
            <a href="#features">Features</a>
            <a href="#demos">Live demos</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="ref-nav-actions">
            <Link href="/login" className="ref-login">Login</Link>
            <Link href="/register" className="ref-black-btn">Start free <ArrowRight size={15}/></Link>
          </div>
        </div>
      </header>

      <section className="ref-hero">
        <div className="ref-container">
          <div className="ref-hero-grid">
            <div className="ref-hero-copy">
              <div className="ref-kicker"><span className="ref-kicker-dot"/> YOUR BUSINESS. YOUR STORE. YOUR BRAND.</div>
              <h1>Build your online store.<br/><span>Start selling.</span></h1>
              <p>Everything you need to launch a professional website, accept orders and grow your business — without coding.</p>
              <div className="ref-actions">
                <Link href="/register" className="ref-orange-btn">Create your store <ArrowRight size={17}/></Link>
                <a href="#demos" className="ref-outline-btn"><Play size={15} fill="currentColor"/> Explore demos</a>
              </div>
              <div className="ref-proof"><span><Check size={14}/> No coding</span><span><Check size={14}/> Mobile-first</span><span><Check size={14}/> UPI + COD</span></div>
            </div>

            <div className="ref-browser-wrap">
              <div className="ref-browser">
                <div className="ref-browser-top"><div className="ref-dots"><i/><i/><i/></div><span>app.hepra.in/dashboard</span><b>LIVE</b></div>
                <div className="ref-dashboard">
                  <aside><div className="ref-mini-logo">H</div><strong>Dashboard</strong><small>Products</small><small>Orders</small><small>Customers</small><small>Analytics</small><small>Website</small></aside>
                  <div className="ref-dash-main">
                    <div className="ref-dash-head"><div><small>HEPRA STORE</small><h3>Good morning 👋</h3></div><span>Sep 2026</span></div>
                    <div className="ref-stat-row"><div><small>Revenue</small><b>₹84,920</b><em>+18.4%</em></div><div><small>Orders</small><b>284</b><em>+12.8%</em></div><div><small>Customers</small><b>1,248</b><em>+9.1%</em></div></div>
                    <div className="ref-chart"><div className="ref-chart-title"><b>Sales overview</b><span>Last 12 months</span></div><div className="ref-bars">{[34,52,44,68,57,76,63,86,70,92,79,100].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="ref-marquee"><span>STORE BUILDER</span><span>•</span><span>ONLINE SELLING</span><span>•</span><span>WHATSAPP ORDERS</span><span>•</span><span>UPI + COD</span><span>•</span><span>STORE BUILDER</span></div>
        </div>
      </section>

      <section id="demos" className="ref-section ref-demos">
        <div className="ref-container">
          <div className="ref-section-head">
            <div><div className="ref-kicker">LIVE WEBSITE DEMOS</div><h2>See it.<br/><span>Then build it.</span></h2></div>
            <p>Choose a business type and start from a finished storefront designed for that industry.</p>
          </div>
          <div className="ref-demo-grid">
            {demos.map(([num,name,copy,icon],i)=><article className="ref-demo-card" key={name}>
              <div className={`ref-demo-art ref-demo-art-${i%6}`}><small>{num}</small><strong>{icon}</strong></div>
              <div className="ref-demo-body"><div><b>{name}</b><span>{copy}</span></div><div className="ref-demo-actions"><Link href={`/store/demo-${i+1}`} className="ref-small-btn">View demo</Link><Link href="/register" className="ref-small-black">Create site</Link></div></div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="features" className="ref-section ref-features">
        <div className="ref-container">
          <div className="ref-section-head centered"><div><div className="ref-kicker">THE TOOLKIT</div><h2>Everything your<br/><span>business needs.</span></h2></div><p>One simple platform for your storefront, selling tools and daily operations.</p></div>
          <div className="ref-feature-grid">
            {features.map(([title,copy,Icon],i)=><article className="ref-feature-card" key={title as string}><div className="ref-feature-num">0{i+1}</div><div className="ref-icon"><Icon size={19}/></div><h3>{title as string}</h3><p>{copy as string}</p><ArrowRight className="ref-feature-arrow" size={16}/></article>)}
          </div>
        </div>
      </section>


      <section id="pricing" className="ref-section ref-pricing">
        <div className="ref-container">
          <div className="ref-section-head centered">
            <div>
              <div className="ref-kicker">SIMPLE PRICING</div>
              <h2>Start free.<br/><span>Upgrade when ready.</span></h2>
            </div>
            <p>No complicated setup. Choose the plan that matches the stage of your business.</p>
          </div>

          <div className="ref-pricing-grid">
            <article className="ref-price-card">
              <div className="ref-plan-top"><span className="ref-plan-dot free"/> FREE</div>
              <p className="ref-plan-copy">Start your online presence with the essentials.</p>
              <div className="ref-price">₹0 <small>/ month</small></div>
              <ul>
                <li><Check size={14}/> 10 products</li>
                <li><Check size={14}/> Basic storefront</li>
                <li><Check size={14}/> HEPRA subdomain</li>
                <li><Check size={14}/> Orders</li>
                <li><Check size={14}/> COD</li>
              </ul>
              <Link href="/register" className="ref-plan-btn light">Start free <ArrowRight size={14}/></Link>
            </article>

            <article className="ref-price-card ref-price-featured">
              <div className="ref-plan-badge">POPULAR</div>
              <div className="ref-plan-top"><span className="ref-plan-dot starter"/> STARTER</div>
              <p className="ref-plan-copy">Everything you need to launch and start selling.</p>
              <div className="ref-price">₹299 <small>/ month</small></div>
              <ul>
                <li><Check size={14}/> 100 products</li>
                <li><Check size={14}/> Custom domain</li>
                <li><Check size={14}/> Unlimited categories</li>
                <li><Check size={14}/> UPI + COD</li>
                <li><Check size={14}/> Discounts & coupons</li>
                <li><Check size={14}/> Shiprocket</li>
              </ul>
              <Link href="/register" className="ref-plan-btn dark">Start Starter <ArrowRight size={14}/></Link>
            </article>

            <article className="ref-price-card ref-price-pro">
              <div className="ref-plan-top"><span className="ref-plan-dot pro"/> PRO</div>
              <p className="ref-plan-copy">More power for growing stores and serious sellers.</p>
              <div className="ref-price">₹499 <small>/ month</small></div>
              <ul>
                <li><Check size={14}/> Unlimited products</li>
                <li><Check size={14}/> Custom domain</li>
                <li><Check size={14}/> UPI + COD</li>
                <li><Check size={14}/> Discounts & coupons</li>
                <li><Check size={14}/> Shiprocket</li>
                <li><Check size={14}/> Advanced analytics</li>
                <li><Check size={14}/> Staff accounts</li>
              </ul>
              <Link href="/register" className="ref-plan-btn dark">Start Pro <ArrowRight size={14}/></Link>
            </article>
          </div>
        </div>
      </section>

      <section id="how" className="ref-section ref-how">
        <div className="ref-container">
          <div className="ref-section-head centered"><div><div className="ref-kicker">HOW IT WORKS</div><h2>Idea to live store<br/><span>in simple steps.</span></h2></div></div>
          <div className="ref-steps">{[
            ["01","Choose","Pick your business category and a ready-made design."],
            ["02","Customize","Add your logo, products, colours, pages and content."],
            ["03","Launch","Publish your store, connect your domain and start selling."],
            ["04","Grow","Manage orders, customers and sales from one dashboard."]
          ].map(([n,t,c])=><div className="ref-step" key={n}><b>{n}</b><span/><h3>{t}</h3><p>{c}</p></div>)}</div>
        </div>
      </section>

      <section className="ref-cta"><div className="ref-container ref-cta-inner"><div><div className="ref-kicker">READY WHEN YOU ARE</div><h2>Launch your store.<br/><span>Grow your brand.</span></h2></div><Link href="/register" className="ref-black-btn large">Start free <ArrowRight size={17}/></Link></div></section>

      <footer className="ref-footer"><div className="ref-container ref-footer-grid"><div><Link href="/" className="ref-brand light"><span>H</span> HEPRA</Link><p>Build. Sell. Grow.</p></div><div><b>Platform</b><a href="#features">Features</a><a href="#demos">Live demos</a><a href="#how">How it works</a></div><div><b>Company</b><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></div><div><b>Get started</b><Link href="/login">Login</Link><Link href="/register">Create store</Link></div></div><div className="ref-container ref-footer-bottom"><span>© 2026 HEPRA</span><span>Made for modern Indian businesses.</span></div></footer>
    </main>
  );
}
