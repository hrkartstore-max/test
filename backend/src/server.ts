import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false}));
app.use("/uploads", express.static(path.join(process.cwd(),"uploads")));
app.use(express.json({
  limit: "3mb",
  verify: (req: any, _res, buf) => {
    if (req.originalUrl === "/api/payments/razorpay/webhook") req.rawBody = Buffer.from(buf);
  }
}));

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "local-hepra-secret-change-me";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: String,
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "MERCHANT", "STAFF"], default: "MERCHANT" },
  tenantId: { type: String, required: true, index: true }
}, { timestamps: true });

const StoreSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  category: { type: String, default: "general" },
  published: { type: Boolean, default: false },
  theme: { type: String, default: "fashion" },
  subdomain: { type: String, index: true },
  customDomain: { type: String, index: true, sparse: true },
  seoTitle: { type: String, default: "" },
  seoDescription: { type: String, default: "" },
  faviconUrl: { type: String, default: "" },
  branding: {
    logo: String, primaryColor: { type: String, default: "#111111" }, accentColor: { type: String, default: "#caff45" }
  },
  settings: { currency: { type: String, default: "INR" }, whatsapp: String, phone: String, address: String }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true }, slug: { type: String, required: true },
  sku: String, description: String, image: String, category: String,
  price: { type: Number, required: true, min: 0 }, salePrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  variants: [{
    name: { type: String, required: true },
    sku: String,
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    options: mongoose.Schema.Types.Mixed
  }],
  status: { type: String, enum: ["draft", "published", "archived"], default: "published" }
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true }, name: { type: String, required: true },
  email: String, phone: String, totalOrders: { type: Number, default: 0 }, totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true }, orderNumber: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customer: { name: String, email: String, phone: String, address: String },
  items: [{ productId: mongoose.Schema.Types.ObjectId, name: String, quantity: Number, price: Number }],
  subtotal: { type: Number, required: true }, discount: { type: Number, default: 0 },
  couponCode: String, shipping: { type: Number, default: 0 }, total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "cod"], default: "pending" },
  status: { type: String, enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"], default: "pending" }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Store = mongoose.models.Store || mongoose.model("Store", StoreSchema);
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
const SubscriptionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  planId: { type: String, enum: ["starter", "pro", "business"], default: "starter" },
  status: { type: String, enum: ["trialing", "active", "past_due", "cancelled"], default: "trialing" },
  billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
  startedAt: { type: Date, default: Date.now },
  renewsAt: { type: Date },
  cancelledAt: { type: Date }
}, { timestamps: true });

const DomainSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  domain: { type: String, required: true },
  status: { type: String, enum: ["pending", "connected", "failed"], default: "pending" },
  verificationToken: { type: String, required: true }
}, { timestamps: true });

const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);
const Domain = mongoose.models.Domain || mongoose.model("Domain", DomainSchema);
const PageSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  sections: [{
    id: String,
    type: { type: String, required: true },
    props: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });
PageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const CouponSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
  value: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  expiresAt: Date
}, { timestamps: true });
CouponSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const AuditLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  actorId: String,
  actorName: String,
  action: String,
  entity: String,
  entityId: String,
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Page = mongoose.models.Page || mongoose.model("Page", PageSchema);
const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
const PaymentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  provider: { type: String, enum: ["razorpay", "local"], required: true },
  providerOrderId: String,
  providerPaymentId: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  purpose: { type: String, enum: ["subscription", "order"], required: true },
  status: { type: String, enum: ["created", "authorized", "captured", "failed", "refunded"], default: "created" },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
const MediaSchema=new mongoose.Schema({
 tenantId:{type:String,required:true,index:true},name:{type:String,required:true},
 url:{type:String,required:true},mimeType:{type:String,default:"image/*"},
 size:{type:Number,default:0},alt:{type:String,default:""}
},{timestamps:true});
const StaffPermissionSchema=new mongoose.Schema({
 tenantId:{type:String,required:true,index:true},userId:{type:String,required:true,index:true},
 permissions:{type:[String],default:[]}
},{timestamps:true});
StaffPermissionSchema.index({tenantId:1,userId:1},{unique:true});
const Media=mongoose.models.Media||mongoose.model("Media",MediaSchema);
const StaffPermission=mongoose.models.StaffPermission||mongoose.model<any>("StaffPermission",StaffPermissionSchema);





type AuthRequest = Request & { user?: { id: string; tenantId: string; role: string } };

function signToken(user: any) {
  return jwt.sign({ id: String(user._id), tenantId: user.tenantId, role: user.role }, jwtSecret, { expiresIn: "7d" });
}
function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "", token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try { req.user = jwt.verify(token, jwtSecret) as AuthRequest["user"]; next(); }
  catch { return res.status(401).json({ message: "Session expired or invalid" }); }
}
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ message: "Super Admin access required" });
  next();
}
function tenant(req: AuthRequest) { return req.user!.tenantId; }
async function audit(req: AuthRequest, action: string, entity: string, entityId?: string, meta?: any) {
  if (!req.user) return;
  await AuditLog.create({
    tenantId: tenant(req), actorId: req.user.id, actorName: "",
    action, entity, entityId, meta
  }).catch(() => undefined);
}

function slugify(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,45) || "store"; }

const registerInput = z.object({
  name: z.string().min(2), businessName: z.string().min(2), email: z.string().email(), phone: z.string().min(8), password: z.string().min(8)
});

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"hepra-api",database:mongoose.connection.readyState===1?"connected":"disconnected",time:new Date().toISOString()}));

app.post("/api/auth/register", async (req,res)=>{
  const p=registerInput.safeParse(req.body); if(!p.success)return res.status(400).json({message:"Please enter valid details.",errors:p.error.flatten()});
  if(mongoose.connection.readyState!==1)return res.status(503).json({message:"Database is not connected. Start MongoDB and restart the API."});
  const {name,businessName,email,phone,password}=p.data;
  if(await User.findOne({email}))return res.status(409).json({message:"An account with this email already exists."});
  const tenantId=new mongoose.Types.ObjectId().toString(), passwordHash=await bcrypt.hash(password,12);
  const user=await User.create({name,email,phone,passwordHash,tenantId,role:"MERCHANT"});
  const base=slugify(businessName); let slug=base,suffix=1; while(await Store.findOne({slug}))slug=`${base}-${suffix++}`;
  const store=await Store.create({tenantId,name:businessName,slug,subdomain:slug,category:"general"});
  res.status(201).json({token:signToken(user),user:{id:user._id,name,email,role:user.role,tenantId},store:{id:store._id,name:store.name,slug:store.slug,published:store.published}});
});

app.post("/api/auth/login", async (req,res)=>{
  const p=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body); if(!p.success)return res.status(400).json({message:"Enter your email and password."});
  if(mongoose.connection.readyState!==1)return res.status(503).json({message:"Database is not connected. Start MongoDB and restart the API."});
  const user=await User.findOne({email:p.data.email});
  if(!user || !(await bcrypt.compare(p.data.password,user.passwordHash)))return res.status(401).json({message:"Invalid email or password."});
  const store=await Store.findOne({tenantId:user.tenantId});
  res.json({token:signToken(user),user:{id:user._id,name:user.name,email:user.email,role:user.role,tenantId:user.tenantId},store:store?{id:store._id,name:store.name,slug:store.slug,published:store.published}:null});
});

app.get("/api/me",auth,async(req:AuthRequest,res)=>{const user=await User.findById(req.user!.id).select("-passwordHash"),store=await Store.findOne({tenantId:tenant(req)});if(!user)return res.status(404).json({message:"User not found"});res.json({user,store});});
app.get("/api/store",auth,async(req:AuthRequest,res)=>res.json(await Store.findOne({tenantId:tenant(req)})));

app.put("/api/store",auth,async(req:AuthRequest,res)=>{
  const p=z.object({name:z.string().min(2),slug:z.string().min(2).regex(/^[a-z0-9-]+$/),category:z.string().min(2),theme:z.string().min(2),published:z.boolean().optional(),branding:z.object({logo:z.string().optional(),primaryColor:z.string().optional(),accentColor:z.string().optional()}).optional(),settings:z.object({currency:z.string().optional(),whatsapp:z.string().optional(),phone:z.string().optional(),address:z.string().optional()}).optional(),
    customDomain:z.string().optional(),subdomain:z.string().regex(/^[a-z0-9-]+$/).optional(),
    seoTitle:z.string().max(70).optional(),seoDescription:z.string().max(160).optional(),faviconUrl:z.string().optional()
  }).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid store settings",errors:p.error.flatten()});
  if(await Store.findOne({slug:p.data.slug,tenantId:{$ne:tenant(req)}}))return res.status(409).json({message:"That store URL is already taken."});
  const store=await Store.findOneAndUpdate({tenantId:tenant(req)},p.data,{new:true}); if(!store)return res.status(404).json({message:"Store not found"});res.json(store);
});

app.get("/api/dashboard/stats",auth,async(req:AuthRequest,res)=>{
  const t=tenant(req);
  const [products,orders,customers,revenueAgg]=await Promise.all([
    Product.countDocuments({tenantId:t,status:{$ne:"archived"}}),Order.countDocuments({tenantId:t}),Customer.countDocuments({tenantId:t}),
    Order.aggregate([{$match:{tenantId:t,status:{$ne:"cancelled"}}},{$group:{_id:null,total:{$sum:"$total"}}}])
  ]);
  res.json({products,orders,customers,revenue:revenueAgg[0]?.total||0});
});

app.get("/api/products",auth,async(req:AuthRequest,res)=>res.json(await Product.find({tenantId:tenant(req)}).sort({createdAt:-1}).lean()));
app.post("/api/products",auth,async(req:AuthRequest,res)=>{
  const p=z.object({name:z.string().min(2),price:z.coerce.number().nonnegative(),salePrice:z.coerce.number().nonnegative().optional(),stock:z.coerce.number().int().nonnegative().default(0),description:z.string().optional(),sku:z.string().optional(),image:z.string().optional(),category:z.string().optional(),variants:z.array(z.object({name:z.string().min(1),sku:z.string().optional(),price:z.coerce.number().nonnegative().optional(),stock:z.coerce.number().int().nonnegative().default(0),options:z.record(z.string()).optional()})).optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid product",errors:p.error.flatten()});
  const product=await Product.create({...p.data,tenantId:tenant(req),slug:`${slugify(p.data.name)}-${Date.now()}`,status:"published"});await audit(req,"CREATE","Product",String(product._id),{name:product.name});res.status(201).json(product);
});
app.delete("/api/products/:id",auth,async(req:AuthRequest,res)=>{const r=await Product.deleteOne({_id:String(req.params.id),tenantId:tenant(req)});if(!r.deletedCount)return res.status(404).json({message:"Product not found"});await audit(req,"DELETE","Product",String(req.params.id));res.json({ok:true});});

app.get("/api/customers",auth,async(req:AuthRequest,res)=>res.json(await Customer.find({tenantId:tenant(req)}).sort({updatedAt:-1}).lean()));
app.get("/api/orders",auth,async(req:AuthRequest,res)=>res.json(await Order.find({tenantId:tenant(req)}).sort({createdAt:-1}).lean()));
app.patch("/api/orders/:id/status",auth,async(req:AuthRequest,res)=>{
  const p=z.object({status:z.enum(["pending","confirmed","processing","shipped","delivered","cancelled"])}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid order status"});
  const order=await Order.findOneAndUpdate({_id:String(req.params.id),tenantId:tenant(req)},{status:p.data.status},{new:true});
  if(!order)return res.status(404).json({message:"Order not found"});res.json(order);
});

app.get("/api/public/stores/:slug",async(req,res)=>{
  const store=await Store.findOne({slug:String(req.params.slug),published:true}).lean(); if(!store)return res.status(404).json({message:"Store not found"});
  const products=await Product.find({tenantId:store.tenantId,status:"published"}).sort({createdAt:-1}).lean();res.json({store,products});
});

app.post("/api/public/stores/:slug/orders",async(req,res)=>{
  if(mongoose.connection.readyState!==1)return res.status(503).json({message:"Store database unavailable"});
  const store=await Store.findOne({slug:String(req.params.slug),published:true});if(!store)return res.status(404).json({message:"Store not found or not published"});
  const p=z.object({customer:z.object({name:z.string().min(2),phone:z.string().min(8),email:z.string().email().optional(),address:z.string().optional()}),items:z.array(z.object({productId:z.string(),quantity:z.coerce.number().int().min(1)})).min(1),couponCode:z.string().optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid order details",errors:p.error.flatten()});
  const ids=p.data.items.map(x=>new mongoose.Types.ObjectId(x.productId)),products=await Product.find({_id:{$in:ids},tenantId:store.tenantId,status:"published"}),byId=new Map(products.map(x=>[String(x._id),x]));
  const items=p.data.items.map(x=>{const pr=byId.get(x.productId);if(!pr)throw new Error("One or more products are unavailable");return {productId:pr._id,name:pr.name,quantity:x.quantity,price:pr.salePrice??pr.price};});
  const subtotal=items.reduce((s,x)=>s+x.price*x.quantity,0);
  const couponCode=(p.data as any).couponCode ? String((p.data as any).couponCode).toUpperCase() : "";
  let discount=0;
  if(couponCode){
    const coupon=await Coupon.findOne({tenantId:store.tenantId,code:couponCode,active:true});
    if(!coupon)return res.status(400).json({message:"Invalid or inactive coupon."});
    if(coupon.expiresAt&&coupon.expiresAt.getTime()<Date.now())return res.status(400).json({message:"Coupon has expired."});
    if(coupon.usageLimit&&coupon.usedCount>=coupon.usageLimit)return res.status(400).json({message:"Coupon usage limit reached."});
    if(subtotal<coupon.minOrder)return res.status(400).json({message:`Minimum order for this coupon is ₹${coupon.minOrder}.`});
    discount=coupon.discountType==="percent"?subtotal*(coupon.value/100):coupon.value;
    discount=Math.min(discount,subtotal);coupon.usedCount+=1;await coupon.save();
  }
  const total=Math.max(0,subtotal-discount);
  const customer=await Customer.findOneAndUpdate({tenantId:store.tenantId,phone:p.data.customer.phone},{$set:p.data.customer,$inc:{totalOrders:1,totalSpent:total}},{new:true,upsert:true});
  const count=await Order.countDocuments({tenantId:store.tenantId});
  const order=await Order.create({tenantId:store.tenantId,orderNumber:`HP-${String(count+1).padStart(5,"0")}`,customerId:customer._id,customer:p.data.customer,items,subtotal,discount,couponCode,total,paymentStatus:"cod",status:"pending"});
  res.status(201).json({orderNumber:order.orderNumber,subtotal:order.subtotal,discount:order.discount,total:order.total,status:order.status});
});


app.get("/api/subscription", auth, async (req: AuthRequest, res) => {
  let subscription = await Subscription.findOne({ tenantId: tenant(req) });
  if (!subscription) {
    subscription = await Subscription.create({
      tenantId: tenant(req), planId: "starter", status: "trialing", billingCycle: "monthly",
      renewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });
  }
  const plans = HEPRA_PLANS;
  res.json({ subscription, plan: plans.find(p => p.id === subscription!.planId) });
});

app.post("/api/subscription/checkout", auth, async (req: AuthRequest, res) => {
  const p = z.object({ planId: z.enum(["starter","pro","business"]), billingCycle: z.enum(["monthly","yearly"]).default("monthly") }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ message: "Invalid plan selection" });
  const prices: Record<string, number> = { starter:200, pro:999, business:1999 };
  const amount = prices[p.data.planId] * (p.data.billingCycle === "yearly" ? 10 : 1);
  const days = p.data.billingCycle === "yearly" ? 365 : 30;
  const subscription = await Subscription.findOneAndUpdate(
    { tenantId: tenant(req) },
    { planId:p.data.planId, billingCycle:p.data.billingCycle, status:"active", startedAt:new Date(),
      renewsAt:new Date(Date.now()+days*24*60*60*1000), cancelledAt:null },
    { new:true, upsert:true }
  );
  res.json({ ok:true, mode:"local-development", amount, currency:"INR", subscription });
});

app.post("/api/subscription/cancel", auth, async (req: AuthRequest, res) => {
  const subscription = await Subscription.findOneAndUpdate({ tenantId:tenant(req) },
    { status:"cancelled", cancelledAt:new Date() }, { new:true });
  if (!subscription) return res.status(404).json({ message:"Subscription not found" });
  res.json(subscription);
});

app.get("/api/domains", auth, async (req: AuthRequest, res) => {
  res.json(await Domain.find({ tenantId:tenant(req) }).sort({createdAt:-1}).lean());
});

app.post("/api/domains", auth, async (req: AuthRequest, res) => {
  const p=z.object({domain:z.string().min(4).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Enter a valid domain, e.g. mystore.com"});
  const domainName=p.data.domain.toLowerCase();
  if(await Domain.findOne({tenantId:tenant(req),domain:domainName}))return res.status(409).json({message:"This domain is already added."});
  const verificationToken=`hepra-${Math.random().toString(36).slice(2,14)}`;
  const domain=await Domain.create({tenantId:tenant(req),domain:domainName,verificationToken});
  res.status(201).json(domain);
});

app.post("/api/domains/:id/verify", auth, async (req: AuthRequest, res) => {
  const domain=await Domain.findOneAndUpdate({_id:String(req.params.id),tenantId:tenant(req)},
    {status:"connected"},{new:true});
  if(!domain)return res.status(404).json({message:"Domain not found"});
  await Store.findOneAndUpdate({tenantId:tenant(req)},{customDomain:domain.domain});
  await audit(req,"VERIFY","Domain",String(req.params.id),{domain:domain.domain});
  res.json(domain);
});

app.get("/api/templates", (_req, res) => res.json([
  {id:"fashion",name:"Fashion",description:"Editorial fashion storefront",colors:{primary:"#171717",accent:"#caff45"}},
  {id:"beauty",name:"Beauty",description:"Soft premium beauty layout",colors:{primary:"#2c1e25",accent:"#e9b8c9"}},
  {id:"restaurant",name:"Restaurant",description:"Menu-first food storefront",colors:{primary:"#2b160f",accent:"#ffb347"}},
  {id:"optical",name:"Optical",description:"Clean eyewear storefront",colors:{primary:"#17212b",accent:"#72d9c4"}},
  {id:"jewellery",name:"Jewellery",description:"Luxury jewellery storefront",colors:{primary:"#17130f",accent:"#d7b36a"}}
]));


app.get("/api/pages", auth, async (req: AuthRequest, res: Response) => {
  res.json(await Page.find({tenantId:tenant(req)}).sort({updatedAt:-1}).lean());
});
app.post("/api/pages", auth, async (req: AuthRequest, res: Response) => {
  const p=z.object({
    title:z.string().min(2), slug:z.string().min(1).regex(/^[a-z0-9-]+$/),
    status:z.enum(["draft","published"]).default("draft"),
    sections:z.array(z.object({id:z.string(),type:z.string(),props:z.record(z.any()).optional()})).default([])
  }).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid page",errors:p.error.flatten()});
  try{
    const page=await Page.create({...p.data,tenantId:tenant(req)});
    await audit(req,"CREATE","Page",String(page._id),{title:page.title});
    res.status(201).json(page);
  }catch(e:any){if(e?.code===11000)return res.status(409).json({message:"A page with this slug already exists."});throw e;}
});
app.put("/api/pages/:id", auth, async (req: AuthRequest, res: Response) => {
  const p=z.object({
    title:z.string().min(2),slug:z.string().min(1).regex(/^[a-z0-9-]+$/),
    status:z.enum(["draft","published"]),
    sections:z.array(z.object({id:z.string(),type:z.string(),props:z.record(z.any()).optional()}))
  }).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid page",errors:p.error.flatten()});
  const page=await Page.findOneAndUpdate({_id:String(req.params.id),tenantId:tenant(req)},p.data,{new:true});
  if(!page)return res.status(404).json({message:"Page not found"});
  await audit(req,"UPDATE","Page",String(req.params.id),{title:page.title});res.json(page);
});
app.delete("/api/pages/:id", auth, async (req: AuthRequest, res: Response) => {
  const r=await Page.deleteOne({_id:String(req.params.id),tenantId:tenant(req)});
  if(!r.deletedCount)return res.status(404).json({message:"Page not found"});
  await audit(req,"DELETE","Page",String(req.params.id));res.json({ok:true});
});

app.get("/api/coupons", auth, async (req: AuthRequest, res: Response) => {
  res.json(await Coupon.find({tenantId:tenant(req)}).sort({createdAt:-1}).lean());
});
app.post("/api/coupons", auth, async (req: AuthRequest, res: Response) => {
  const p=z.object({
    code:z.string().min(3).max(30).transform(v=>v.toUpperCase().replace(/\s+/g,"")),
    discountType:z.enum(["percent","fixed"]), value:z.coerce.number().positive(),
    minOrder:z.coerce.number().nonnegative().default(0),
    usageLimit:z.coerce.number().int().nonnegative().default(0), expiresAt:z.string().optional()
  }).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid coupon",errors:p.error.flatten()});
  if(p.data.discountType==="percent"&&p.data.value>100)return res.status(400).json({message:"Percentage discount cannot exceed 100."});
  try{
    const coupon=await Coupon.create({...p.data,tenantId:tenant(req),expiresAt:p.data.expiresAt?new Date(p.data.expiresAt):undefined});
    await audit(req,"CREATE","Coupon",String(coupon._id),{code:coupon.code});res.status(201).json(coupon);
  }catch(e:any){if(e?.code===11000)return res.status(409).json({message:"Coupon code already exists."});throw e;}
});
app.patch("/api/coupons/:id/toggle", auth, async (req: AuthRequest, res: Response) => {
  const coupon=await Coupon.findOne({_id:String(req.params.id),tenantId:tenant(req)});
  if(!coupon)return res.status(404).json({message:"Coupon not found"});
  coupon.active=!coupon.active;await coupon.save();await audit(req,"UPDATE","Coupon",String(req.params.id),{active:coupon.active});res.json(coupon);
});
app.delete("/api/coupons/:id", auth, async (req: AuthRequest, res: Response) => {
  const r=await Coupon.deleteOne({_id:String(req.params.id),tenantId:tenant(req)});
  if(!r.deletedCount)return res.status(404).json({message:"Coupon not found"});
  await audit(req,"DELETE","Coupon",String(req.params.id));res.json({ok:true});
});

app.get("/api/staff", auth, async (req: AuthRequest, res: Response) => {
  res.json(await User.find({tenantId:tenant(req),role:"STAFF"}).select("-passwordHash").sort({createdAt:-1}).lean());
});
app.post("/api/staff", auth, async (req: AuthRequest, res: Response) => {
  const p=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),phone:z.string().optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Enter valid staff details"});
  if(await User.findOne({email:p.data.email}))return res.status(409).json({message:"This email is already in use."});
  const staff=await User.create({name:p.data.name,email:p.data.email,phone:p.data.phone,passwordHash:await bcrypt.hash(p.data.password,12),role:"STAFF",tenantId:tenant(req)});
  await audit(req,"CREATE","Staff",String(staff._id),{email:staff.email});
  res.status(201).json({id:staff._id,name:staff.name,email:staff.email,phone:staff.phone,role:staff.role});
});
app.delete("/api/staff/:id", auth, async (req: AuthRequest, res: Response) => {
  const r=await User.deleteOne({_id:String(req.params.id),tenantId:tenant(req),role:"STAFF"});
  if(!r.deletedCount)return res.status(404).json({message:"Staff member not found"});
  await audit(req,"DELETE","Staff",String(req.params.id));res.json({ok:true});
});
app.get("/api/audit-logs", auth, async (req: AuthRequest, res: Response) => {
  res.json(await AuditLog.find({tenantId:tenant(req)}).sort({createdAt:-1}).limit(100).lean());
});


app.get("/api/media",auth,async(req:AuthRequest,res:Response)=>{
 res.json(await Media.find({tenantId:tenant(req)}).sort({createdAt:-1}).lean());
});
app.post("/api/media/local",auth,async(req:AuthRequest,res:Response)=>{
 const p=z.object({name:z.string().min(1),dataUrl:z.string().regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/),alt:z.string().optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({message:"Only PNG, JPEG, WEBP and GIF images are supported."});
 const m=p.data.dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
 if(!m)return res.status(400).json({message:"Invalid image data"});
 const ext=m[1]==="jpeg"||m[1]==="jpg"?"jpg":m[1],buffer=Buffer.from(m[2],"base64");
 if(buffer.length>5*1024*1024)return res.status(413).json({message:"Image must be 5 MB or smaller."});
 const file=`${tenant(req)}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
 fs.writeFileSync(path.join(process.cwd(),"uploads",file),buffer);
 const media=await Media.create({tenantId:tenant(req),name:p.data.name,url:`/uploads/${file}`,mimeType:`image/${ext}`,size:buffer.length,alt:p.data.alt||""});
 await audit(req,"CREATE","Media",String(media._id),{name:media.name});res.status(201).json(media);
});
app.delete("/api/media/:id",auth,async(req:AuthRequest,res:Response)=>{
 const media=await Media.findOne({_id:String(req.params.id),tenantId:tenant(req)});
 if(!media)return res.status(404).json({message:"Media not found"});
 if(media.url.startsWith("/uploads/")){const fp=path.join(process.cwd(),media.url);if(fs.existsSync(fp))fs.unlinkSync(fp);}
 await media.deleteOne();await audit(req,"DELETE","Media",String(req.params.id));res.json({ok:true});
});
const ALL_STAFF_PERMISSIONS=["products.read","products.write","orders.read","orders.write","customers.read","pages.write","coupons.write","domains.write","media.write","staff.manage","billing.read"];
app.get("/api/staff/:id/permissions",auth,async(req:AuthRequest,res:Response)=>{
 const staff=await User.findOne({_id:String(req.params.id),tenantId:tenant(req),role:"STAFF"}).select("-passwordHash").lean();
 if(!staff)return res.status(404).json({message:"Staff member not found"});
 const saved=await StaffPermission.findOne({tenantId:tenant(req),userId:String(staff._id)}).lean();
 res.json({staff,permissions:saved?.permissions||[],available:ALL_STAFF_PERMISSIONS});
});
app.put("/api/staff/:id/permissions",auth,async(req:AuthRequest,res:Response)=>{
 const p=z.object({permissions:z.array(z.string())}).safeParse(req.body);
 if(!p.success)return res.status(400).json({message:"Invalid permissions"});
 const staff=await User.findOne({_id:String(req.params.id),tenantId:tenant(req),role:"STAFF"});
 if(!staff)return res.status(404).json({message:"Staff member not found"});
 const permissions=p.data.permissions.filter(x=>ALL_STAFF_PERMISSIONS.includes(x));
 const saved=await StaffPermission.findOneAndUpdate({tenantId:tenant(req),userId:String(staff._id)},{permissions},{new:true,upsert:true});
 await audit(req,"UPDATE","StaffPermissions",String(req.params.id),{permissions});res.json(saved);
});
app.get("/api/storefront/config",async(req:Request,res:Response)=>{
 const host=String(req.headers.host||"").split(":")[0].toLowerCase();
 const connectedDomain=await Domain.findOne({domain:host,status:"connected"}).lean();
  const store=await Store.findOne({
    $or:[
      {customDomain:host},
      {subdomain:host.split(".")[0]},
      ...(connectedDomain?[{tenantId:connectedDomain.tenantId}]:[])
    ]
  }).lean();
 if(!store)return res.status(404).json({message:"Store not found"});
 res.json({store});
});

app.get("/api/public/store/:host", async (req: Request, res: Response) => {
  const host=String(String(req.params.host)||"").split(":")[0].toLowerCase();
  const connectedDomain=await Domain.findOne({domain:host,status:"connected"}).lean();
  const store=await Store.findOne({
    $or:[
      {customDomain:host},
      {subdomain:host.split(".")[0]},
      ...(connectedDomain?[{tenantId:connectedDomain.tenantId}]:[])
    ]
  }).lean();
  if(!store)return res.status(404).json({message:"Store not found"});
  const pages=await Page.find({tenantId:store.tenantId,status:"published"}).sort({updatedAt:-1}).lean();
  const products=await Product.find({tenantId:store.tenantId,status:"published"}).sort({createdAt:-1}).limit(100).lean();
  res.json({store:{id:store._id,name:store.name,slug:store.slug,branding:store.branding,seoTitle:store.seoTitle||store.name,seoDescription:store.seoDescription||`Shop ${store.name}`,faviconUrl:store.faviconUrl||""},pages,products});
});

app.get("/api/public/store/:host/page/:slug", async (req: Request, res: Response) => {
  const host=String(String(req.params.host)||"").split(":")[0].toLowerCase();
  const connectedDomain=await Domain.findOne({domain:host,status:"connected"}).lean();
  const store=await Store.findOne({
    $or:[
      {customDomain:host},
      {subdomain:host.split(".")[0]},
      ...(connectedDomain?[{tenantId:connectedDomain.tenantId}]:[])
    ]
  }).lean();
  if(!store)return res.status(404).json({message:"Store not found"});
  const page=await Page.findOne({tenantId:store.tenantId,slug:String(req.params.slug),status:"published"}).lean();
  if(!page)return res.status(404).json({message:"Published page not found"});
  const products=await Product.find({tenantId:store.tenantId,status:"published"}).sort({createdAt:-1}).limit(100).lean();
  res.json({store:{name:store.name,branding:store.branding,seoTitle:store.seoTitle||store.name,seoDescription:store.seoDescription||`Shop ${store.name}`},page,products});
});

app.put("/api/store/seo", auth, async (req: AuthRequest, res: Response) => {
  const p=z.object({
    seoTitle:z.string().max(70).optional(),
    seoDescription:z.string().max(160).optional(),
    faviconUrl:z.string().url().or(z.literal("")).optional()
  }).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid SEO settings"});
  const store=await Store.findOneAndUpdate({tenantId:tenant(req)},p.data,{new:true});
  if(!store)return res.status(404).json({message:"Store not found"});
  await audit(req,"UPDATE","StoreSEO",String(store._id),p.data);
  res.json(store);
});

app.post("/api/store/publish", auth, async (req: AuthRequest, res: Response) => {
  const store=await Store.findOne({tenantId:tenant(req)});
  if(!store)return res.status(404).json({message:"Store not found"});
  const publishedPages=await Page.countDocuments({tenantId:tenant(req),status:"published"});
  if(!publishedPages)return res.status(400).json({message:"Publish at least one page before publishing the store."});
  await audit(req,"PUBLISH","Store",String(store._id),{publishedPages});
  res.json({ok:true,status:"published",storeUrl:store.customDomain?`https://${store.customDomain}`:`https://${store.subdomain||store.slug}.hepra.local`});
});

const HEPRA_PLANS = [
  {id:"starter",name:"Basic",price:200,interval:"month",billingNote:"Billed for 6 months",features:["Up to 100 products","Easy-to-use Admin Panel","WhatsApp Ordering","UPI QR Code / COD","Mobile-Responsive Online Store","WhatsApp Support"]},
  {id:"pro",name:"Pro",price:999,interval:"month",billingNote:"Billed monthly",popular:true,features:["Unlimited products","Easy-to-use Admin Panel","Custom Domain","WhatsApp Ordering","Payment Gateway — UPI, Cards & COD","Mobile-Responsive Online Store","Priority Support"]},
  {id:"business",name:"Pro+",price:1999,interval:"month",billingNote:"Billed monthly",features:["Everything in Pro","Unlimited products","Custom Domain","WhatsApp Ordering","Your Own WhatsApp Business API","Business Promotion Templates + Chatbot Integration","POS Billing Software","Payment Gateway — UPI, Cards & COD","Mobile-Responsive Store","Priority Support"]}
];

app.get("/api/plans",(_req,res)=>res.json(HEPRA_PLANS));

app.get("/api/payments/config",(_req,res)=>res.json({provider:razorpayConfigured()?"razorpay":"local",keyId:process.env.RAZORPAY_KEY_ID||null,currency:"INR"}));

app.post("/api/payments/razorpay/subscription-order",auth,async(req:AuthRequest,res:Response)=>{
  const p=z.object({planId:z.enum(["starter","pro","business"]),billingCycle:z.enum(["monthly","yearly"]).default("monthly")}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid plan selection"});
  const plan=HEPRA_PLANS.find(x=>x.id===p.data.planId)!;
  const amount=plan.price*(p.data.billingCycle==="yearly"?10:1);
  if(!razorpayConfigured())return res.status(503).json({message:"Razorpay is not configured. HEPRA is running in local payment mode."});
  try{
    const order=await createRazorpayOrder(amount,`hepra-${tenant(req)}-${Date.now()}`,{tenantId:tenant(req),planId:p.data.planId,billingCycle:p.data.billingCycle});
    res.json({provider:"razorpay",keyId:process.env.RAZORPAY_KEY_ID,orderId:order.id,amount:order.amount,currency:order.currency,plan});
  }catch(e:any){res.status(502).json({message:e.message||"Unable to create Razorpay order"});}
});

app.post("/api/payments/razorpay/verify",auth,async(req:AuthRequest,res:Response)=>{
  if(!razorpayConfigured())return res.status(503).json({message:"Razorpay is not configured."});
  const p=z.object({paymentId:z.string().min(3),orderId:z.string().min(3),signature:z.string().min(10),planId:z.enum(["starter","pro","business"]).optional(),billingCycle:z.enum(["monthly","yearly"]).optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:"Invalid payment verification data"});
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET!).update(`${p.data.orderId}|${p.data.paymentId}`).digest("hex");
  if(expected!==p.data.signature)return res.status(400).json({message:"Payment signature verification failed"});
  const planId=p.data.planId||"pro", billingCycle=p.data.billingCycle||"monthly", days=billingCycle==="yearly"?365:30;
  const subscription=await Subscription.findOneAndUpdate({tenantId:tenant(req)},{planId,billingCycle,status:"active",startedAt:new Date(),renewsAt:new Date(Date.now()+days*86400000),cancelledAt:null},{new:true,upsert:true});
  await audit(req,"PAYMENT_VERIFIED","Subscription",String(subscription._id),{paymentId:p.data.paymentId,planId});
  res.json({ok:true,subscription});
});

app.post("/api/payments/razorpay/webhook",async(req:Request,res:Response)=>{
  const signature=String(req.headers["x-razorpay-signature"]||"");
  if(!verifyRazorpayWebhook((req as any).rawBody||Buffer.from(JSON.stringify(req.body)),signature))return res.status(400).json({message:"Invalid webhook signature"});
  res.json({ok:true});
});

app.post("/api/admin/bootstrap",async(req,res)=>{
  if(req.headers["x-admin-setup-key"]!==(process.env.ADMIN_SETUP_KEY||"change-this-local-key"))return res.status(403).json({message:"Invalid setup key"});
  if(mongoose.connection.readyState!==1)return res.status(503).json({message:"Database is not connected"});
  const p=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8)}).safeParse(req.body);if(!p.success)return res.status(400).json({message:"Invalid admin details"});
  if(await User.findOne({email:p.data.email}))return res.status(409).json({message:"User already exists"});
  const user=await User.create({name:p.data.name,email:p.data.email,passwordHash:await bcrypt.hash(p.data.password,12),role:"SUPER_ADMIN",tenantId:"SYSTEM"});
  res.status(201).json({token:signToken(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
});
app.get("/api/admin/summary",auth,requireAdmin,async(_req,res)=>{
  const [merchants,stores,products,orders,revenueAgg]=await Promise.all([
    User.countDocuments({role:"MERCHANT"}),Store.countDocuments(),Product.countDocuments(),Order.countDocuments(),
    Order.aggregate([{$match:{status:{$ne:"cancelled"}}},{$group:{_id:null,total:{$sum:"$total"}}}])
  ]);
  res.json({merchants,stores,products,orders,revenue:revenueAgg[0]?.total||0});
});
app.get("/api/admin/merchants",auth,requireAdmin,async(_req,res)=>{
  const merchants=await User.find({role:"MERCHANT"}).select("-passwordHash").sort({createdAt:-1}).lean(),ids=merchants.map(x=>x.tenantId);
  const stores=await Store.find({tenantId:{$in:ids}}).lean(),map=new Map(stores.map(x=>[x.tenantId,x]));
  res.json(merchants.map(m=>({...m,store:map.get(m.tenantId)||null})));
});

app.use((err:Error,_req:Request,res:Response,_next:NextFunction)=>{console.error(err);res.status(500).json({message:err.message||"Unexpected server error"});});

function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function razorpayAuth() {
  return Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

function verifyRazorpayWebhook(rawBody: Buffer, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

async function createRazorpayOrder(amountInRupees: number, receipt: string, notes: Record<string,string>) {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${razorpayAuth()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100),
      currency: "INR",
      receipt,
      notes
    })
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.error?.description || "Razorpay order creation failed");
  return data;
}

fs.mkdirSync(path.join(process.cwd(),"uploads"),{recursive:true});
async function start(){
  try{if(process.env.MONGODB_URI){await mongoose.connect(process.env.MONGODB_URI);console.log("MongoDB connected");}else console.log("MONGODB_URI not set; API running without database connection.");app.listen(port,()=>console.log(`HEPRA API running on http://localhost:${port}`));}
  catch(error){console.error("Startup error",error);process.exit(1);}
}
start();
