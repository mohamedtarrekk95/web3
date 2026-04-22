# Crypto Exchange - Production Deployment Guide

This guide covers deploying the crypto exchange platform to production using MongoDB Atlas and Vercel.

---

## Prerequisites

- GitHub account with the project pushed
- Vercel account (free tier works)
- MongoDB Atlas account (free tier works for small projects)

---

## Step 1: MongoDB Atlas Setup

### 1.1 Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Log in
3. Click **Build a Database**
4. Choose **Free Tier** (M0 Sandbox)
5. Select region closest to your users (e.g., `us-east-1`)
6. Click **Create**

### 1.2 Configure Cluster

1. Wait for cluster to provision (~3 minutes)
2. Click **Security** → **Database Access**
3. Click **Add New Database User**
   - Authentication Method: **Password**
   - Username: `crypto-exchange-admin`
   - Password: (generate strong password, save it!)
   - Role: **Read and write to any database**
4. Click **Add User**

### 1.3 Configure Network Access

1. Click **Security** → **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (or add specific Vercel IPs)
4. Click **Confirm**

### 1.4 Get Connection String

1. Click **Deployment** → **Database**
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/crypto-exchange?retryWrites=true&w=majority
   ```

---

## Step 2: Vercel Deployment

### 2.1 Prepare for Vercel

The project is already configured with `vercel.json`. Ensure all changes are committed:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
```

### 2.2 Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. In **Configuration**:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
5. Click **Deploy**

### 2.3 Environment Variables

Before deploying, add these environment variables in Vercel:

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | (generate strong random string) | Admin JWT secret |

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select **Production** scope
4. Click **Save**

### 2.4 Redeploy

After adding environment variables:
1. Go to **Deployments**
2. Click the latest deployment
3. Click **Redeploy**

---

## Step 3: Verify Deployment

### 3.1 Check API Health

```bash
curl https://your-project.vercel.app/api/coins
```

Expected: JSON array of coins

### 3.2 Check Price API

```bash
curl "https://your-project.vercel.app/api/price?from=BTC&to=ETH&amount=1"
```

Expected: JSON with rate calculation

### 3.3 Test Invoice Page

1. Create an order via POST to `/api/orders`
2. Navigate to `/invoice/{orderId}`
3. Verify page loads correctly

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | JWT signing secret (min 32 chars) |

### Local Development

For local development, create `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/crypto-exchange
JWT_SECRET=dev-secret-change-in-production
```

---

## Optional: Railway (For Background Jobs)

Railway can be used for:
- Background job processing
- Periodic tasks (cleanup, notifications)

### 1. Setup

1. Go to [Railway](https://railway.app)
2. Sign up with GitHub
3. New Project → Deploy from GitHub repo

### 2. Configure

```bash
# railway.json (create in project root)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "env": {
    "start": "npm start"
  }
}
```

### 3. Environment Variables

Add the same variables as Vercel in Railway dashboard.

---

## Troubleshooting

### "Connection refused" Errors

1. Check MongoDB Atlas network whitelist allows Vercel IPs
2. Verify `MONGODB_URI` is correct
3. Check cluster is not paused (free tier sleeps after 6 hours)

### "Unauthorized" in Admin Panel

1. Verify `JWT_SECRET` matches in Vercel dashboard
2. Clear browser localStorage and login again
3. Check token expiration (24h)

### "Too many requests" Errors

The rate limiter is active. Default limits:
- `/api/price`: 100 requests/minute
- `/api/orders`: 10 orders/minute
- Admin routes: 20 requests/minute

### API Returns 500

1. Check Vercel function logs
2. Verify MongoDB Atlas cluster is running
3. Test locally with production MongoDB URI

---

## Security Checklist

- [ ] MongoDB Atlas: Network whitelist configured
- [ ] MongoDB Atlas: Strong database user password
- [ ] Vercel: `JWT_SECRET` is unique and strong
- [ ] Vercel: HTTPS enforced (automatic with Vercel)
- [ ] Admin: Changed default credentials
- [ ] Admin: Logout after each session

---

## Performance Tips

1. **MongoDB Atlas Indexes**: Create indexes for frequently queried fields:
   ```javascript
   db.orders.createIndex({ orderId: 1 })
   db.orders.createIndex({ createdAt: -1 })
   db.wallets.createIndex({ coinSymbol: 1 }, { unique: true })
   ```

2. **Vercel Regions**: Choose region closest to MongoDB Atlas

3. **Edge Caching**: Static assets are cached automatically

---

## Monitoring

### Vercel Analytics

Enable in Project Settings → Analytics for:
- Core Web Vitals
- API response times
- Error rates

### MongoDB Atlas Monitoring

1. Go to Deployment → Metrics
2. Set up alerts for:
   - Connection failures
   - High latency
   - Low disk space

---

## Update & Maintenance

### Updating Environment Variables

1. Go to Project Settings → Environment Variables
2. Update value
3. Redeploy

### Zero-Downtime Updates

Vercel handles this automatically with rolling deployments.

### MongoDB Atlas Free Tier Limits

| Metric | Limit |
|--------|-------|
| Storage | 512 MB |
| RAM | 1 GB |
| Connections | 100 |
| Daily Restarts | 1 |

For production traffic, consider upgrading to paid tier.

---

## Support

For issues:
1. Check Vercel function logs
2. Check MongoDB Atlas logs
3. Verify all environment variables are set
