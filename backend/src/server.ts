import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { z } from "zod";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: "8mb", verify: (req, _res, buf) => { if (req.originalUrl === "/api/payments/cashfree/webhook") (req as any).rawBody = Buffer.from(buf); } }));

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fdimdbtoeecewbgrskvk.supabase.co";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_r2bMcoSiIAsI5qZkgfEP7Q_eOmkJSCd";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const publicSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) throw new Error("Supabase is not configured.");
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
};

const adminSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is not configured on the backend.");
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
};

function userSupabase(token: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) throw new Error("Supabase is not configured.");
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

type AuthRequest = Request & { user?: { id: string; email?: string; name?: string } };
type Store = any;

function bearer(req: Request) {
  const value = String(req.headers.authorization || "");
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const sb = userSupabase(token);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ message: "Session expired or invalid" });
    req.user = { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name };
    next();
  } catch (e: any) {
    return res.status(401).json({ message: e.message || "Authentication failed" });
  }
}

function tenantStore(req: AuthRequest) {
  return userSupabase(bearer(req));
}

async function getOwnedStore(req: AuthRequest) {
  const sb = tenantStore(req);
  const { data, error } = await sb.from("stores").select("*").eq("owner_id", req.user!.id).maybeSingle();
  if (error) throw error;
  return data;
}

function storeOut(s: any) {
  if (!s) return null;
  return {
    _id: s.id, id: s.id, name: s.name, slug: s.slug,
    category: s.category || "general", theme: s.theme || "fashion",
    published: Boolean(s.published), customDomain: s.custom_domain || "",
    seoTitle: s.seo_title || "", seoDescription: s.seo_description || "",
    faviconUrl: s.favicon_url || "",
    branding: { logo: s.logo_url || "", primaryColor: s.theme_primary || "#111111", accentColor: s.theme_primary || "#caff45" },
    settings: { currency: "INR", whatsapp: s.whatsapp_number || "", phone: "", address: "" },
    subdomain: s.slug
  };
}

function productOut(p: any) {
  return {
    _id: p.id, id: p.id, name: p.name, slug: p.id, sku: "",
    description: p.description || "", image: p.image_url || "", category: p.category_id || "",
    price: Number(p.price || 0), salePrice: p.compare_at_price == null ? undefined : Number(p.compare_at_price),
    stock: Number(p.stock || 0), status: p.active ? "published" : "archived",
    createdAt: p.created_at
  };
}

function orderOut(o: any, items: any[] = []) {
  return {
    _id: o.id, id: o.id, orderNumber: `HP-${o.id.slice(0, 8).toUpperCase()}`,
    customer: { name: o.customer_name || "", phone: o.customer_phone || "", address: o.customer_address || "" },
    items, subtotal: Number(o.subtotal || 0), discount: Number(o.discount || 0),
    total: Number(o.total || 0), paymentStatus: o.payment_status, status: o.status,
    createdAt: o.created_at
  };
}

const registerInput = z.object({
  name: z.string().min(2), businessName: z.string().min(2),
  email: z.string().email(), phone: z.string().min(8), password: z.string().min(8)
});

app.get("/api/health", async (_req, res) => {
  try {
    const sb = publicSupabase();
    const { error } = await sb.from("stores").select("id").limit(1);
    if (error) return res.status(503).json({ ok: false, service: "hepra-api", database: "error", message: error.message });
    res.json({
      ok: true, service: "hepra-api", database: "supabase",
      configured: {
        url: Boolean(SUPABASE_URL),
        publishableKey: Boolean(SUPABASE_PUBLIC_KEY),
        secretKey: Boolean(SUPABASE_SECRET_KEY)
      },
      project: SUPABASE_URL
    });
  } catch (e: any) {
    res.status(503).json({ ok: false, service: "hepra-api", database: "not_configured", message: e.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please enter valid details.", errors: parsed.error.flatten() });
  const { name, businessName, email, phone, password } = parsed.data;
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    return res.status(503).json({ message: "Supabase is not configured on the backend. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel." });
  }
  try {
    let userId = "";
    let session: any = null;

    // Registration works with the publishable key only.
    // If Supabase email confirmation is disabled, signUp returns a session immediately.
    // If email confirmation is enabled, the user must verify the email and then sign in.
    const signed = await publicSupabase().auth.signUp({
      email,
      password,
      options: { data: { name, phone, businessName, role: "MERCHANT" } }
    });

    if (signed.error) return res.status(400).json({ message: signed.error.message });
    userId = signed.data.user?.id || "";
    session = signed.data.session;

    if (!userId) return res.status(400).json({ message: "Account could not be created." });

    if (!session) {
      return res.status(201).json({
        requiresEmailVerification: true,
        message: "Account created. Please verify your email, then sign in."
      });
    }

    const sb = userSupabase(session.access_token);
    const slugBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "store";
    let slug = slugBase;
    const { data: same } = await sb.from("stores").select("slug").like("slug", `${slugBase}%`);
    if (same?.some((x: any) => x.slug === slug)) slug = `${slugBase}-${Date.now().toString().slice(-5)}`;
    const { data: store, error: storeError } = await sb.from("stores").insert({
      owner_id: userId, name: businessName, slug, merchant_name: name,
      published: false, category: "general", theme: "fashion"
    }).select("*").single();
    if (storeError) return res.status(500).json({ message: storeError.message });
    return res.status(201).json({
      token: session.access_token,
      refreshToken: session.refresh_token,
      user: { id: userId, name, email, role: "MERCHANT" },
      store: storeOut(store)
    });
  } catch (e: any) {
    console.error("Supabase registration failed:", e);
    res.status(500).json({ message: e.message || "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter your email and password." });
  try {
    const signed = await publicSupabase().auth.signInWithPassword(parsed.data);
    if (signed.error || !signed.data.session || !signed.data.user) return res.status(401).json({ message: signed.error?.message || "Invalid email or password." });
    const sb = userSupabase(signed.data.session.access_token);
    const { data: store } = await sb.from("stores").select("*").eq("owner_id", signed.data.user.id).maybeSingle();
    return res.json({
      token: signed.data.session.access_token, refreshToken: signed.data.session.refresh_token,
      user: { id: signed.data.user.id, name: signed.data.user.user_metadata?.name || "", email: signed.data.user.email, role: signed.data.user.user_metadata?.role || "MERCHANT" },
      store: storeOut(store)
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Login failed" });
  }
});

app.get("/api/me", requireUser, async (req: AuthRequest, res) => {
  try {
    const store = await getOwnedStore(req);
    const user = req.user;
    res.json({ user, store: storeOut(store) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get("/api/store", requireUser, async (req: AuthRequest, res) => {
  try { res.json(storeOut(await getOwnedStore(req))); } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.put("/api/store", requireUser, async (req: AuthRequest, res) => {
  const parsed = z.object({
    name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    category: z.string().min(2), theme: z.string().min(2), published: z.boolean().optional(),
    branding: z.any().optional(), settings: z.any().optional(), customDomain: z.string().optional(),
    seoTitle: z.string().max(70).optional(), seoDescription: z.string().max(160).optional(), faviconUrl: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid store settings" });
  try {
    const sb = tenantStore(req);
    const duplicate = await sb.from("stores").select("id").eq("slug", parsed.data.slug).neq("owner_id", req.user!.id).maybeSingle();
    if (duplicate.data) return res.status(409).json({ message: "That store URL is already taken." });
    const b = parsed.data.branding || {};
    const { data, error } = await sb.from("stores").update({
      name: parsed.data.name, slug: parsed.data.slug, category: parsed.data.category,
      theme: parsed.data.theme, published: parsed.data.published,
      custom_domain: parsed.data.customDomain || null,
      seo_title: parsed.data.seoTitle || "", seo_description: parsed.data.seoDescription || "",
      favicon_url: parsed.data.faviconUrl || "", logo_url: b.logo || null,
      theme_primary: b.primaryColor || "#111111"
    }).eq("owner_id", req.user!.id).select("*").single();
    if (error) throw error;
    res.json(storeOut(data));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get("/api/products", requireUser, async (req: AuthRequest, res) => {
  try {
    const store = await getOwnedStore(req); if (!store) return res.status(404).json({ message: "Store not found" });
    const { data, error } = await tenantStore(req).from("items").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    if (error) throw error; res.json((data || []).map(productOut));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.post("/api/products", requireUser, async (req: AuthRequest, res: Response) => {
  const p = z.object({ name: z.string().min(2), price: z.coerce.number().nonnegative(), salePrice: z.coerce.number().nonnegative().optional(), stock: z.coerce.number().int().nonnegative().default(0), description: z.string().optional(), sku: z.string().optional(), image: z.string().optional(), category: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ message: "Invalid product" });
  try {
    const store = await getOwnedStore(req); if (!store) return res.status(404).json({ message: "Store not found" });
    const { data, error } = await tenantStore(req).from("items").insert({
      store_id: store.id, name: p.data.name, description: p.data.description || "",
      price: p.data.price, compare_at_price: p.data.salePrice ?? null, stock: p.data.stock,
      image_url: p.data.image || null, active: true
    }).select("*").single();
    if (error) throw error; res.status(201).json(productOut(data));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.delete("/api/products/:id", requireUser, async (req: AuthRequest, res) => {
  try {
    const store = await getOwnedStore(req); if (!store) return res.status(404).json({ message: "Store not found" });
    const { error } = await tenantStore(req).from("items").delete().eq("id", req.params.id).eq("store_id", store.id);
    if (error) throw error; res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get("/api/customers", requireUser, async (req: AuthRequest, res) => {
  try {
    const store = await getOwnedStore(req); if (!store) return res.json([]);
    const { data, error } = await tenantStore(req).from("orders").select("customer_name,customer_phone,customer_address,total").eq("store_id", store.id);
    if (error) throw error;
    const map = new Map<string, any>();
    for (const o of data || []) {
      const key = o.customer_phone || o.customer_name || crypto.randomUUID();
      const c = map.get(key) || { _id: key, name: o.customer_name || "", phone: o.customer_phone || "", email: "", totalOrders: 0, totalSpent: 0 };
      c.totalOrders += 1; c.totalSpent += Number(o.total || 0); map.set(key, c);
    }
    res.json([...map.values()]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get("/api/orders", requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const store = await getOwnedStore(req); if (!store) return res.json([]);
    const sb = tenantStore(req);
    const { data, error } = await sb.from("orders").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(o => orderOut(o)));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.patch("/api/orders/:id/status", requireUser, async (req: AuthRequest, res: Response) => {
  const p = z.object({ status: z.enum(["pending","confirmed","processing","shipped","delivered","cancelled"]) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ message: "Invalid order status" });
  try {
    const store = await getOwnedStore(req); const { data, error } = await tenantStore(req).from("orders").update({ status: p.data.status }).eq("id", req.params.id).eq("store_id", store.id).select("*").single();
    if (error) throw error; res.json(orderOut(data));
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

app.get("/api/coupons", requireUser, async (req: AuthRequest, res: Response) => {
  try { const store = await getOwnedStore(req); const { data, error } = await tenantStore(req).from("discounts").select("*").eq("store_id", store.id).order("created_at",{ascending:false}); if(error)throw error;
    res.json((data||[]).map(c=>({_id:c.id,id:c.id,code:c.code,discountType:c.kind==="fixed"?"fixed":"percent",value:Number(c.value),minOrder:Number(c.minimum_order||0),usedCount:c.usage_count||0,usageLimit:c.usage_limit||0,active:c.active})));
  } catch(e:any){res.status(500).json({message:e.message});}
});

app.post("/api/coupons", requireUser, async (req: AuthRequest, res: Response) => {
  const p=z.object({code:z.string().min(3).max(30),discountType:z.enum(["percent","fixed"]),value:z.coerce.number().positive(),minOrder:z.coerce.number().nonnegative().default(0),usageLimit:z.coerce.number().int().nonnegative().default(0)}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid coupon"});
  try{const store=await getOwnedStore(req);const {data,error}=await tenantStore(req).from("discounts").insert({store_id:store.id,code:p.data.code.toUpperCase().replace(/\s+/g,""),kind:p.data.discountType==="fixed"?"fixed":"percentage",value:p.data.value,minimum_order:p.data.minOrder,usage_limit:p.data.usageLimit||null,active:true}).select("*").single();if(error)throw error;res.status(201).json(data);}catch(e:any){res.status(500).json({message:e.message});}
});
app.patch("/api/coupons/:id/toggle", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);const cur=await sb.from("discounts").select("active").eq("id",req.params.id).eq("store_id",store.id).single();if(cur.error)throw cur.error;const {data,error}=await sb.from("discounts").update({active:!cur.data.active}).eq("id",req.params.id).eq("store_id",store.id).select("*").single();if(error)throw error;res.json(data);}catch(e:any){res.status(500).json({message:e.message});}});
app.delete("/api/coupons/:id", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {error}=await tenantStore(req as AuthRequest).from("discounts").delete().eq("id",req.params.id).eq("store_id",store.id);if(error)throw error;res.json({ok:true});}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/pages", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_pages").select("*").eq("store_id",store.id).order("updated_at",{ascending:false});if(error)throw error;res.json((data||[]).map(p=>({_id:p.id,id:p.id,title:p.title,slug:p.slug,status:p.status,sections:p.sections,createdAt:p.created_at,updatedAt:p.updated_at})));}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/pages", requireUser, async(req,res)=>{const p=z.object({title:z.string().min(2),slug:z.string().min(1).regex(/^[a-z0-9-]+$/),status:z.enum(["draft","published"]).default("draft"),sections:z.array(z.any()).default([])}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid page"});try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_pages").insert({store_id:store.id,...p.data}).select("*").single();if(error)throw error;res.status(201).json({_id:data.id,id:data.id,title:data.title,slug:data.slug,status:data.status,sections:data.sections});}catch(e:any){res.status(500).json({message:e.message});}});
app.put("/api/pages/:id", requireUser, async(req,res)=>{const p=z.object({title:z.string().min(2),slug:z.string().min(1),status:z.enum(["draft","published"]),sections:z.array(z.any())}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid page"});try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_pages").update({...p.data,updated_at:new Date().toISOString()}).eq("id",req.params.id).eq("store_id",store.id).select("*").single();if(error)throw error;res.json({_id:data.id,id:data.id,title:data.title,slug:data.slug,status:data.status,sections:data.sections});}catch(e:any){res.status(500).json({message:e.message});}});
app.delete("/api/pages/:id", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {error}=await tenantStore(req as AuthRequest).from("store_pages").delete().eq("id",req.params.id).eq("store_id",store.id);if(error)throw error;res.json({ok:true});}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/store/seo", requireUser, async(req,res)=>{try{res.json(storeOut(await getOwnedStore(req as AuthRequest)));}catch(e:any){res.status(500).json({message:e.message});}});
app.put("/api/store/seo", requireUser, async(req,res)=>{const p=z.object({seoTitle:z.string().max(70).optional(),seoDescription:z.string().max(160).optional(),faviconUrl:z.string().url().or(z.literal("")).optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid SEO settings"});try{const sb=tenantStore(req as AuthRequest);const {data,error}=await sb.from("stores").update({seo_title:p.data.seoTitle||"",seo_description:p.data.seoDescription||"",favicon_url:p.data.faviconUrl||""}).eq("owner_id",(req as AuthRequest).user!.id).select("*").single();if(error)throw error;res.json(storeOut(data));}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/domains", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_domains").select("*").eq("store_id",store.id).order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(d=>({_id:d.id,id:d.id,domain:d.domain,status:d.status,verificationToken:d.verification_token})));}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/domains", requireUser, async(req,res)=>{const p=z.object({domain:z.string().min(4)}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid domain"});try{const store=await getOwnedStore(req as AuthRequest);const token=crypto.randomBytes(16).toString("hex");const {data,error}=await tenantStore(req as AuthRequest).from("store_domains").insert({store_id:store.id,domain:p.data.domain.toLowerCase(),verification_token:token}).select("*").single();if(error)throw error;res.status(201).json({_id:data.id,id:data.id,domain:data.domain,status:data.status,verificationToken:data.verification_token});}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/domains/:id/verify", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);const {data,error}=await sb.from("store_domains").update({status:"connected"}).eq("id",req.params.id).eq("store_id",store.id).select("*").single();if(error)throw error;await sb.from("stores").update({custom_domain:data.domain}).eq("id",store.id);res.json({_id:data.id,id:data.id,domain:data.domain,status:data.status,verificationToken:data.verification_token});}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/media", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_media").select("*").eq("store_id",store.id).order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(m=>({_id:m.id,id:m.id,name:m.name,url:m.url,mimeType:m.mime_type,size:m.size,alt:m.alt})));}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/media/local", requireUser, async(req,res)=>{const p=z.object({name:z.string().min(1),dataUrl:z.string().regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/),alt:z.string().optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Only PNG, JPEG, WEBP and GIF images are supported."});try{const store=await getOwnedStore(req as AuthRequest);const size=Buffer.byteLength(p.data.dataUrl.split(",")[1],"base64");if(size>5*1024*1024)return res.status(413).json({message:"Image must be 5 MB or smaller."});const {data,error}=await tenantStore(req as AuthRequest).from("store_media").insert({store_id:store.id,name:p.data.name,url:p.data.dataUrl,mime_type:p.data.dataUrl.slice(5,p.data.dataUrl.indexOf(";")),size,alt:p.data.alt||""}).select("*").single();if(error)throw error;res.status(201).json({_id:data.id,id:data.id,name:data.name,url:data.url,mimeType:data.mime_type,size:data.size,alt:data.alt});}catch(e:any){res.status(500).json({message:e.message});}});
app.delete("/api/media/:id", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {error}=await tenantStore(req as AuthRequest).from("store_media").delete().eq("id",req.params.id).eq("store_id",store.id);if(error)throw error;res.json({ok:true});}catch(e:any){res.status(500).json({message:e.message});}});

const PERMISSIONS=["products.read","products.write","orders.read","orders.write","customers.read","pages.write","coupons.write","domains.write","media.write","staff.manage","billing.read"];
app.get("/api/staff", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("staff_profiles").select("*").eq("store_id",store.id).order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(s=>({_id:s.id,id:s.id,name:s.name,email:s.email,phone:s.phone,role:"STAFF"})));}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/staff", requireUser, async(req,res)=>{const p=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),phone:z.string().optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Enter valid staff details"});try{const store=await getOwnedStore(req as AuthRequest);const admin=adminSupabase();const created=await admin.auth.admin.createUser({email:p.data.email,password:p.data.password,email_confirm:true,user_metadata:{name:p.data.name,phone:p.data.phone,role:"STAFF"}});if(created.error)throw created.error;const {data,error}=await tenantStore(req as AuthRequest).from("staff_profiles").insert({id:created.data.user.id,store_id:store.id,name:p.data.name,email:p.data.email,phone:p.data.phone||null}).select("*").single();if(error)throw error;res.status(201).json({_id:data.id,id:data.id,name:data.name,email:data.email,phone:data.phone,role:"STAFF"});}catch(e:any){res.status(500).json({message:e.message});}});
app.delete("/api/staff/:id", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);const profile=await sb.from("staff_profiles").select("id").eq("id",req.params.id).eq("store_id",store.id).single();if(profile.error)throw profile.error;await adminSupabase().auth.admin.deleteUser(profile.data.id);await sb.from("staff_profiles").delete().eq("id",profile.data.id);res.json({ok:true});}catch(e:any){res.status(500).json({message:e.message});}});
app.get("/api/staff/:id/permissions", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);const staff=await sb.from("staff_profiles").select("*").eq("id",req.params.id).eq("store_id",store.id).single();if(staff.error)throw staff.error;const perms=await sb.from("staff_permissions").select("permissions").eq("staff_id",req.params.id).maybeSingle();res.json({staff:{_id:staff.data.id,name:staff.data.name,email:staff.data.email},permissions:perms.data?.permissions||[],available:PERMISSIONS});}catch(e:any){res.status(500).json({message:e.message});}});
app.put("/api/staff/:id/permissions", requireUser, async(req,res)=>{const p=z.object({permissions:z.array(z.string())}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid permissions"});try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);const staff=await sb.from("staff_profiles").select("id").eq("id",req.params.id).eq("store_id",store.id).single();if(staff.error)throw staff.error;const {data,error}=await sb.from("staff_permissions").upsert({staff_id:req.params.id,permissions:p.data.permissions.filter(x=>PERMISSIONS.includes(x))},{onConflict:"staff_id"}).select("*").single();if(error)throw error;res.json(data);}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/subscription", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const sb=tenantStore(req as AuthRequest);let {data,error}=await sb.from("store_subscriptions").select("*").eq("store_id",store.id).maybeSingle();if(error)throw error;if(!data){const created=await sb.from("store_subscriptions").insert({store_id:store.id,plan:"free",billing_interval:"monthly",provider:"local",status:"active",amount:0}).select("*").single();if(created.error)throw created.error;data=created.data;}res.json({subscription:{planId:data.plan,status:data.status,renewsAt:data.current_period_end},plan:{id:data.plan,name:data.plan==="free"?"FREE":data.plan==="starter"?"STARTER":"PRO"}});}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/subscription/cancel", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const {data,error}=await tenantStore(req as AuthRequest).from("store_subscriptions").update({status:"cancelled"}).eq("store_id",store.id).select("*").single();if(error)throw error;res.json(data);}catch(e:any){res.status(500).json({message:e.message});}});
app.post("/api/subscription/checkout", requireUser, async(req,res)=>{
  const p=z.object({planId:z.enum(["free","starter","pro"])}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid plan"});
  try{
    const store=await getOwnedStore(req as AuthRequest);
    const prices:any={free:0,starter:299,pro:499};
    if(p.data.planId==="free"){
      const {data,error}=await tenantStore(req as AuthRequest).from("store_subscriptions").upsert({store_id:store.id,plan:"free",billing_interval:"monthly",provider:"cashfree",status:"active",amount:0},{onConflict:"store_id"}).select("*").single();
      if(error)throw error;
      return res.json({ok:true,mode:"free",subscription:data});
    }
    const clientId=process.env.CASHFREE_CLIENT_ID;
    const clientSecret=process.env.CASHFREE_CLIENT_SECRET;
    if(!clientId||!clientSecret)return res.status(503).json({message:"Cashfree is not configured. Add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in Vercel."});
    const origin=process.env.FRONTEND_URL||"http://localhost:3000";
    const orderId=`hep_${store.id.replace(/-/g,"").slice(0,16)}_${p.data.planId}_${Date.now()}`;
    const amount=prices[p.data.planId];
    const response=await fetch("https://api.cashfree.com/pg/orders",{method:"POST",headers:{"Content-Type":"application/json","x-api-version":"2025-01-01","x-client-id":clientId,"x-client-secret":clientSecret,"x-request-id":crypto.randomUUID(),"x-idempotency-key":crypto.randomUUID()},body:JSON.stringify({order_id:orderId,order_amount:amount,order_currency:"INR",customer_details:{customer_id:store.owner_id,customer_name:store.merchant_name||store.name,customer_email:req.user!.email||"merchant@hepra.in"},order_meta:{return_url:`${origin}/dashboard/billing?payment=processing&order_id=${orderId}`,notify_url:`${origin}/api/payments/cashfree/webhook`},order_note:`HEPRA ${p.data.planId} monthly subscription`})});
    const cf=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(502).json({message:cf.message||"Cashfree order creation failed"});
    const {data,error}=await tenantStore(req as AuthRequest).from("store_subscriptions").upsert({store_id:store.id,plan:p.data.planId,billing_interval:"monthly",provider:"cashfree",status:"pending",amount},{onConflict:"store_id"}).select("*").single();
    if(error)throw error;
    res.json({ok:true,mode:"cashfree",orderId,cfOrderId:cf.cf_order_id,paymentSessionId:cf.payment_session_id,subscription:data});
  }catch(e:any){res.status(500).json({message:e.message});}
});

app.post("/api/payments/cashfree/webhook", async(req,res)=>{
  try{
    const secret=process.env.CASHFREE_CLIENT_SECRET;
    if(!secret)return res.status(503).json({message:"Cashfree webhook secret is not configured."});
    const signature=String(req.headers["x-webhook-signature"]||"");
    const timestamp=String(req.headers["x-webhook-timestamp"]||"");
    const raw=(req as any).rawBody as Buffer;
    if(!signature||!timestamp||!raw)return res.status(400).json({message:"Invalid webhook payload"});
    const expected=crypto.createHmac("sha256",secret).update(timestamp+raw.toString("utf8")).digest("base64");
    const sigBuf=Buffer.from(signature);const expectedBuf=Buffer.from(expected);if(sigBuf.length!==expectedBuf.length||!crypto.timingSafeEqual(sigBuf,expectedBuf))return res.status(401).json({message:"Invalid webhook signature"});
    const payload=req.body||{};
    const orderId=payload?.data?.order?.order_id||payload?.data?.order?.order_id||payload?.order?.order_id;
    const paymentStatus=String(payload?.data?.payment?.payment_status||payload?.data?.order?.order_status||payload?.event||"").toUpperCase();
    if(!orderId)return res.json({ok:true});
    const plan=orderId.includes("_pro_")?"pro":orderId.includes("_starter_")?"starter":null;
    const storeKey=orderId.match(/^hep_([a-f0-9]{16})_/i)?.[1];
    if(!plan||!storeKey)return res.json({ok:true});
    const admin=adminSupabase();
    const stores=await admin.from("stores").select("id").ilike("id",`${storeKey}%`).limit(1);
    const store=stores.data?.[0];
    if(!store)return res.json({ok:true});
    if(["SUCCESS","PAID","COMPLETED"].some(x=>paymentStatus.includes(x))){
      const {error}=await admin.from("store_subscriptions").update({plan,billing_interval:"monthly",provider:"cashfree",status:"active",amount:plan==="pro"?499:299,current_period_start:new Date().toISOString(),current_period_end:new Date(Date.now()+30*24*60*60*1000).toISOString()}).eq("store_id",store.id);
      if(error)throw error;
    }else if(["FAILED","CANCELLED","USER_DROPPED"].some(x=>paymentStatus.includes(x))){
      await admin.from("store_subscriptions").update({status:"payment_failed"}).eq("store_id",store.id);
    }
    res.json({ok:true});
  }catch(e:any){console.error("Cashfree webhook failed:",e);res.status(500).json({message:"Webhook processing failed"});}
});
app.get("/api/plans",(_req,res)=>res.json([{id:"free",name:"FREE",price:0,interval:"month"},{id:"starter",name:"STARTER",price:299,interval:"month"},{id:"pro",name:"PRO",price:499,interval:"month"}]));
app.get("/api/payments/config",(_req,res)=>res.json({provider:process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET?"razorpay":"local",keyId:process.env.RAZORPAY_KEY_ID||null,currency:"INR"}));

app.post("/api/store/publish", requireUser, async(req,res)=>{try{const store=await getOwnedStore(req as AuthRequest);const pages=await tenantStore(req as AuthRequest).from("store_pages").select("id").eq("store_id",store.id).eq("status","published");if(!pages.data?.length)return res.status(400).json({message:"Publish at least one page before publishing the store."});const {data,error}=await tenantStore(req as AuthRequest).from("stores").update({published:true}).eq("id",store.id).select("*").single();if(error)throw error;res.json({ok:true,status:"published",storeUrl:data.custom_domain?`https://${data.custom_domain}`:`https://${data.slug}.hepra.in`});}catch(e:any){res.status(500).json({message:e.message});}});

app.get("/api/public/stores/:slug", async(req,res)=>{try{const sb=publicSupabase();const {data:store,error}=await sb.from("stores").select("*").eq("slug",String(req.params.slug)).eq("published",true).maybeSingle();if(error)throw error;if(!store)return res.status(404).json({message:"Store not found"});const products=await sb.from("items").select("*").eq("store_id",store.id).eq("active",true).order("created_at",{ascending:false});res.json({store:storeOut(store),products:(products.data||[]).map(productOut)});}catch(e:any){res.status(500).json({message:e.message});}});

app.post("/api/public/stores/:slug/orders", async(req,res)=>{const p=z.object({customer:z.object({name:z.string().min(2),phone:z.string().min(8),email:z.string().email().optional(),address:z.string().optional()}),items:z.array(z.object({productId:z.string(),quantity:z.coerce.number().int().min(1)})).min(1),couponCode:z.string().optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid order details"});try{const sb=publicSupabase();const store=await sb.from("stores").select("id").eq("slug",String(req.params.slug)).eq("published",true).maybeSingle();if(store.error)throw store.error;if(!store.data)return res.status(404).json({message:"Store not found or not published"});const ids=p.data.items.map(x=>x.productId);const ps=await sb.from("items").select("*").in("id",ids).eq("store_id",store.data.id).eq("active",true);if(ps.error)throw ps.error;const map=new Map((ps.data||[]).map(x=>[x.id,x]));const orderItems=p.data.items.map(x=>{const item=map.get(x.productId);if(!item)throw new Error("One or more products are unavailable");const price=Number(item.compare_at_price ?? item.price);return {item_id:item.id,item_name:item.name,quantity:x.quantity,unit_price:price,total:price*x.quantity};});const subtotal=orderItems.reduce((s,x)=>s+x.total,0);let discount=0;if(p.data.couponCode){const c=await sb.from("discounts").select("*").eq("store_id",store.data.id).eq("code",p.data.couponCode.toUpperCase()).eq("active",true).maybeSingle();if(c.data){discount=c.data.kind==="fixed"?Number(c.data.value):subtotal*Number(c.data.value)/100;discount=Math.min(discount,subtotal);}}const total=Math.max(0,subtotal-discount);const created=await sb.from("orders").insert({store_id:store.data.id,customer_name:p.data.customer.name,customer_phone:p.data.customer.phone,customer_address:p.data.customer.address||"",status:"new",payment_status:"pending",subtotal,discount,total,payment_method:"cod",discount_code:p.data.couponCode?.toUpperCase()||null,discount_amount:discount}).select("*").single();if(created.error)throw created.error;const oi=await sb.from("order_items").insert(orderItems.map(x=>({...x,order_id:created.data.id})));if(oi.error)throw oi.error;res.status(201).json({orderNumber:`HP-${created.data.id.slice(0,8).toUpperCase()}`,subtotal,discount,total,status:created.data.status});}catch(e:any){res.status(500).json({message:e.message});}});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { console.error(err); res.status(500).json({ message: err.message || "Unexpected server error" }); });

if (!process.env.VERCEL) app.listen(Number(process.env.PORT || 4000), () => console.log("HEPRA Supabase API running"));
export default app;
