# HEPRA Deployment Checklist

## Before deployment
- [ ] Set a strong `JWT_SECRET`
- [ ] Set a strong `ADMIN_SETUP_KEY`
- [ ] Use MongoDB Atlas or managed MongoDB
- [ ] Set `FRONTEND_URL` to the production frontend
- [ ] Add Razorpay test keys
- [ ] Add `RAZORPAY_WEBHOOK_SECRET`
- [ ] Test a successful subscription payment
- [ ] Test a failed payment
- [ ] Test webhook delivery
- [ ] Confirm subscription only becomes active after verified payment
- [ ] Enable HTTPS
- [ ] Configure domain/DNS
- [ ] Configure backups

## Razorpay
Backend:
```env
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Webhook:
```text
https://YOUR-API-DOMAIN/api/payments/razorpay/webhook
```

Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to the browser.
