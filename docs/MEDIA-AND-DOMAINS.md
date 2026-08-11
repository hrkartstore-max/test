# Media & Domains

Local media uploads are stored in `backend/uploads` and served from `/uploads/*`.
This is development storage only. Production should use S3-compatible storage or Cloudinary.

`GET /api/storefront/config` resolves a request host against a store's configured custom domain/subdomain. Production still needs DNS and reverse-proxy/edge routing.
