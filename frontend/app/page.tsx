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
            <a href="#pricing">Pricing</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="ref-nav-actions">
            <Link href="/login" className="ref-login">Login</Link>
            <Link href="/register" className="ref-black-btn">Start free <ArrowRight size={15}/></Link>
            <details className="ref-mobile-menu">
              <summary aria-label="Open menu"><span></span><span></span><span></span></summary>
              <div className="ref-mobile-menu-panel">
                <a href="#features">Features</a>
                <a href="#demos">Live demos</a>
                <a href="#pricing">Pricing</a>
                <a href="#how">How it works</a>
                <Link href="/login">Login</Link>
                <Link href="/register" className="ref-mobile-menu-cta">Create your store <ArrowRight size={14}/></Link>
              </div>
            </details>
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

      <section className="ref-section ref-showcase">
        <div className="ref-container">
          <div className="ref-section-head">
            <div><div className="ref-kicker">STORE PREVIEWS</div><h2>One platform.<br/><span>Many businesses.</span></h2></div>
            <p>Start with a storefront built for your category, then make it completely yours.</p>
          </div>
          <div className="ref-showcase-grid">
            {[
              ["Restaurant","Fresh menu • Online ordering","🍕","ref-showcase-food"],
              ["Fashion","Collections • Wishlist • Cart","👗","ref-showcase-fashion"],
              ["Jewellery","Premium catalog • Enquiry","💎","ref-showcase-jewel"]
            ].map(([name,copy,icon,cls]) => (
              <article className="ref-showcase-card" key={name}>
                <div className={`ref-showcase-screen ${cls}`}>
                  <div className="ref-screen-top"><span>HEPRA</span><i>☰</i></div>
                  <div className="ref-screen-hero"><small>{name.toUpperCase()}</small><strong>{icon}</strong><h3>{name}</h3><p>{copy}</p><b>SHOP NOW →</b></div>
                  <div className="ref-screen-products"><i/><i/><i/></div>
                </div>
                <div className="ref-showcase-meta"><div><b>{name}</b><span>{copy}</span></div><Link href="/register">Build yours <ArrowRight size={14}/></Link></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ref-section ref-ai-builder">
        <div className="ref-container">
          <div className="ref-ai-grid">
            <div className="ref-ai-copy">
              <div className="ref-kicker">✨ AI STORE BUILDER</div>
              <h2>Describe your business.<br/><span>HEPRA builds the start.</span></h2>
              <p>Tell us what you sell, choose your style and let AI generate the structure for your storefront.</p>
              <div className="ref-ai-chips"><span>Restaurant</span><span>Fashion</span><span>Optical</span><span>Jewellery</span></div>
              <Link href="/register" className="ref-orange-btn">Create with AI <ArrowRight size={16}/></Link>
            </div>
            <div className="ref-ai-window">
              <div className="ref-ai-window-top"><span>HEPRA AI</span><b>● LIVE</b></div>
              <div className="ref-ai-chat">
                <div className="ref-ai-msg user">I sell premium women's fashion. I need an online store with products, WhatsApp orders and COD.</div>
                <div className="ref-ai-msg ai"><strong>HEPRA AI</strong><p>Perfect. I'll prepare a fashion storefront with:</p><ul><li>Product catalog & collections</li><li>WhatsApp ordering</li><li>COD checkout</li><li>Mobile-first design</li></ul><span>Building your store <i>•••</i></span></div>
              </div>
              <div className="ref-ai-input">Describe your business... <b>↗</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="ref-section ref-trust">
        <div className="ref-container">
          <div className="ref-trust-top">
            <div>
              <div className="ref-kicker">WHY HEPRA</div>
              <h2>Built to help<br/><span>you sell.</span></h2>
            </div>
            <p>From your first product to your next thousand orders, HEPRA keeps the tools you need in one place.</p>
          </div>
          <div className="ref-trust-stats">
            <div><strong>24/7</strong><span>Store access</span></div>
            <div><strong>UPI</strong><span>India-ready payments</span></div>
            <div><strong>COD</strong><span>Built-in checkout</span></div>
            <div><strong>1</strong><span>Simple dashboard</span></div>
          </div>
          <div className="ref-trust-grid">
            {[
              ["01","SELL ANYWHERE","Your storefront works across mobile, tablet and desktop."],
              ["02","OWN YOUR BRAND","Use your logo, colours, domain and content."],
              ["03","RUN EVERYTHING","Products, orders, customers and discounts in one dashboard."],
              ["04","GROW WITHOUT COMPLEXITY","Start small and upgrade when your business needs more."]
            ].map(([n,t,c]) => (
              <div className="ref-trust-card" key={n}><b>{n}</b><div><strong>{t}</strong><p>{c}</p></div><ArrowRight size={15}/></div>
            ))}
          </div>
        </div>
      </section>

      <section className="ref-section ref-testimonials">
        <div className="ref-container">
          <div className="ref-section-head centered">
            <div><div className="ref-kicker">MERCHANT STORIES</div><h2>Made for businesses<br/><span>that are growing.</span></h2></div>
            <p>From first-time sellers to established local brands, HEPRA keeps online selling simple.</p>
          </div>
          <div className="ref-testimonial-grid">
            {[
              ["RK","Fashion Store Owner","“I wanted a simple website without spending a lot on development. HEPRA gives me the store, products and orders in one place.”"],
              ["AS","Restaurant Owner","“WhatsApp + COD makes it much easier for my customers to order. The dashboard keeps everything organized.”"],
              ["MP","Local Business Owner","“I can manage my products and update my store myself. I don't need to call a developer for every small change.”"]
            ].map(([initials,role,quote]) => (
              <article className="ref-testimonial" key={role}>
                <div className="ref-stars">★★★★★</div>
                <p>{quote}</p>
                <div className="ref-person"><span>{initials}</span><div><strong>{role}</strong><small>HEPRA merchant</small></div></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ref-section ref-faq">
        <div className="ref-container">
          <div className="ref-faq-grid">
            <div>
              <div className="ref-kicker">FAQ</div>
              <h2>Questions.<br/><span>Answered.</span></h2>
              <p>Everything you need to know before launching your HEPRA store.</p>
              <Link href="/register" className="ref-orange-btn">Start free <ArrowRight size={16}/></Link>
            </div>
            <div className="ref-faq-list">
              {[
                ["Can I start for free?","Yes. HEPRA has a FREE plan so you can create your store and start with the basics before upgrading."],
                ["Can I connect my own domain?","Yes. Custom domain support is available on paid plans."],
                ["Can customers pay with UPI?","Yes. UPI support is available on paid plans, alongside COD."],
                ["Can I take orders through WhatsApp?","Yes. HEPRA includes WhatsApp ordering features for merchants."],
                ["Can I use Shiprocket?","Yes. Shiprocket support is included on paid plans."],
                ["Do I need coding knowledge?","No. HEPRA is designed so merchants can build and manage their storefront without coding."]
              ].map(([q,a]) => (
                <details className="ref-faq-item" key={q}>
                  <summary><span>{q}</span><b>+</b></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
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
              <div className="ref-kicker">💰 HEPRA PRICING</div>
              <h2>Simple plans.<br/><span>Clear pricing.</span></h2>
            </div>
            <p>Start free and upgrade as your store grows. No complicated pricing.</p>
          </div>

          <div className="ref-pricing-table ref-pricing-three">
            <div className="ref-pricing-head">
              <div className="ref-pricing-plan-label">Plan</div>
              <div><span className="ref-plan-name green">🟢 FREE</span><strong>₹0/month</strong></div>
              <div><span className="ref-plan-name blue">🔵 STARTER</span><strong>₹299/month</strong></div>
              <div><span className="ref-plan-name purple">🟣 PRO</span><strong>₹499/month</strong></div>
            </div>

            {[
              ["Products","10","100","Unlimited"],
              ["Storefront","✅","✅","✅"],
              ["HEPRA subdomain","✅","✅","✅"],
              ["Custom domain","❌","✅","✅"],
              ["Categories","1","Unlimited","Unlimited"],
              ["Orders","✅","✅","✅"],
              ["COD","✅","✅","✅"],
              ["UPI","❌","✅","✅"],
              ["Online payment gateway","❌","❌","✅"],
              ["Discounts / Coupons","❌","✅","✅"],
              ["Inventory","Basic","✅","Advanced"],
              ["Customers","Basic","✅","Advanced"],
              ["WhatsApp","Basic","✅","Advanced"],
              ["Shiprocket","❌","✅","✅"],
              ["Analytics","Basic","Basic","Advanced"],
              ["SEO tools","Basic","✅","Advanced"],
              ["Store customization","Basic","✅","Full"],
              ["Staff accounts","1","2","10"],
              ["Priority support","❌","❌","✅"],
              ["AI tools","❌","❌","Full"],
            ].map(([feature,free,starter,pro]) => (
              <div className="ref-pricing-row" key={feature}>
                <div className="ref-feature-label">{feature}</div>
                <div>{free}</div>
                <div>{starter}</div>
                <div>{pro}</div>
              </div>
            ))}

            <div className="ref-pricing-actions">
              <div></div>
              <Link href="/register?plan=free" className="ref-plan-btn light">Start free <ArrowRight size={14}/></Link>
              <Link href="/register?plan=starter" className="ref-plan-btn dark">Start Starter <ArrowRight size={14}/></Link>
              <Link href="/register?plan=pro" className="ref-plan-btn dark">Start Pro <ArrowRight size={14}/></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ref-section ref-india">
        <div className="ref-container">
          <div className="ref-india-grid">
            <div>
              <div className="ref-kicker">BUILT FOR INDIA 🇮🇳</div>
              <h2>Everything local sellers need.<br/><span>Nothing extra.</span></h2>
              <p>HEPRA is designed around the way Indian businesses actually sell — UPI, COD, WhatsApp, local delivery and mobile-first shopping.</p>
              <Link href="/register" className="ref-orange-btn">Build your store <ArrowRight size={16}/></Link>
            </div>
            <div className="ref-india-points">
              {[
                ["01","UPI READY","Accept UPI payments and give customers a familiar checkout."],
                ["02","COD READY","Keep cash-on-delivery orders simple from checkout to dashboard."],
                ["03","WHATSAPP","Let customers discover, ask and order through WhatsApp."],
                ["04","SHIPROCKET","Connect shipping workflows and manage delivery from one place."],
                ["05","MOBILE FIRST","Your storefront is built for the device most customers use."],
                ["06","ZERO CODE","Create, customize and publish without hiring a developer."]
              ].map(([n,t,c]) => (
                <div className="ref-india-point" key={n}>
                  <b>{n}</b><div><strong>{t}</strong><p>{c}</p></div>
                </div>
              ))}
            </div>
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

      <section className="ref-final-cta">
        <div className="ref-container">
          <div className="ref-final-cta-box">
            <div>
              <div className="ref-kicker">READY TO START?</div>
              <h2>Your store.<br/><span>Your brand.</span><br/>Your next step.</h2>
              <p>Launch your online store with HEPRA and start selling today.</p>
            </div>
            <div className="ref-final-actions">
              <Link href="/register" className="ref-black-btn large">Create your store <ArrowRight size={17}/></Link>
              <Link href="/login" className="ref-outline-btn">Already have an account? Login</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="ref-footer"><div className="ref-container ref-footer-grid"><div><Link href="/" className="ref-brand light"><span>H</span> HEPRA</Link><p>Build. Sell. Grow.</p></div><div><b>Platform</b><a href="#features">Features</a><a href="#demos">Live demos</a><a href="#how">How it works</a></div><div><b>Company</b><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></div><div><b>Get started</b><Link href="/login">Login</Link><Link href="/register">Create store</Link></div></div><div className="ref-container ref-footer-bottom"><span>© 2026 HEPRA</span><span>Made for modern Indian businesses.</span></div></footer>
    </main>
  );
}
