# HEPRA Final Launch Checklist

## Application
- [x] Multi-tenant registration/login
- [x] Tenant data isolation
- [x] Products
- [x] Orders
- [x] Customers
- [x] Coupons
- [x] Page builder
- [x] Media
- [x] Staff permissions
- [x] Audit logs
- [x] SEO
- [x] Publishing
- [x] Public storefront

## Billing
- [x] Local subscription simulation
- [x] Razorpay order creation
- [x] Razorpay signature verification
- [x] Razorpay webhook verification
- [ ] Add real Razorpay production/test credentials
- [ ] Complete a real test transaction

## Domains
- [x] Domain records
- [x] Development domain mapping
- [x] Connected-domain record
- [x] Public host resolver
- [ ] Configure DNS at registrar
- [ ] Configure production reverse proxy/edge
- [ ] Configure automated TLS/SSL

## Production infrastructure
- [x] Dockerfiles
- [x] Docker Compose baseline
- [x] Cross-platform local process runner
- [ ] Cloud/VPS deployment
- [ ] Managed MongoDB/backup policy
- [ ] Object storage for media
- [ ] Monitoring
- [ ] Error tracking
- [ ] Security penetration review

## Important
The remaining unchecked items require access to external infrastructure/accounts. They cannot be truthfully marked complete inside a ZIP without those credentials and DNS changes.
