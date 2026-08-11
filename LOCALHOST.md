# HEPRA — Localhost

## Requirements
- Node.js 20+
- MongoDB Community Server 7+ (or MongoDB Atlas)

## Windows (recommended)
Open Command Prompt or VS Code Terminal in the HEPRA folder:

```cmd
npm.cmd install
npm.cmd run install:all
npm.cmd run dev
```

Open:
- Frontend: http://localhost:3000
- API health: http://localhost:4000/api/health
- Dashboard: http://localhost:3000/dashboard

### If PowerShell says `npm.ps1 cannot be loaded`
Use `npm.cmd` exactly as shown above. Do not change the execution policy just to run this project.

### If API says MongoDB is not connected
Install/start MongoDB Community Server and ensure `.env` contains:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/hepra
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-this-local-secret
ADMIN_SETUP_KEY=change-this-local-key
```

Then restart the API.

## Client workflow test
1. Register a merchant.
2. Complete onboarding.
3. Open Website and choose a category/theme.
4. Add products.
5. Create a Home page and publish it.
6. Open Publish.
7. Open the public store route.
8. Test product/order flow.
9. Test domain simulation.
10. Test billing in local mode, or configure Razorpay test keys for Checkout.
