# HEPRA Architecture

Frontend:
- Next.js 14
- React 18
- TypeScript
- CSS + Lucide icons

Backend:
- Node.js
- Express
- TypeScript
- MongoDB/Mongoose
- JWT
- Zod
- Helmet
- express-rate-limit

Core SaaS model:
User -> tenantId -> Store / Product / Order / Customer / Page / Coupon / Media / StaffPermission / AuditLog

Payments:
Browser -> backend creates Razorpay order -> Razorpay Checkout -> backend verifies signature -> webhook confirms asynchronous events -> subscription becomes active.

Domains:
Registrar DNS -> production edge/reverse proxy -> HEPRA frontend -> host resolver -> tenant Store.

Media:
Local development uses backend/uploads. Production should use S3-compatible storage or Cloudinary.
