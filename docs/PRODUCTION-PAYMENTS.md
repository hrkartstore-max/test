# HEPRA Production Payments — Razorpay

The build now contains a Razorpay-ready server flow.

Environment:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Flow:
1. Merchant selects Starter/Pro/Business.
2. Backend creates a Razorpay Order.
3. Browser opens Razorpay Checkout.
4. Browser response is verified server-side using the payment/order signature.
5. Razorpay webhook is verified against the raw request body.
6. `payment.captured` / `order.paid` activates the subscription.

Important:
- Never put `RAZORPAY_KEY_SECRET` in the frontend.
- Use Test Mode first.
- Configure the webhook URL as `https://YOUR-API-DOMAIN/api/payments/razorpay/webhook`.
- Use the webhook secret configured in Razorpay Dashboard.
- Keep HTTPS in production.

The current local build still works without Razorpay credentials by using the local development checkout.
