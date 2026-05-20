# Gmail SMTP Setup Instructions

## Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the steps to enable 2FA

## Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Google will generate a 16-character password like: `xxxx xxxx xxxx xxxx`
4. Copy this password

## Step 3: Update .env File
Replace in `.env`:
```
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=your-email@gmail.com
```

## Step 4: Restart Server
```bash
npm run dev
```

## Testing Email
1. Register a new store account
2. Create a product
3. Go to PoS → Add product to cart
4. Enter customer email
5. Click "Complete sale"
6. Check customer inbox (not spam folder!)

## Troubleshooting
- **Email not received**: Check spam folder first
- **SMTP error**: Verify app password copied correctly (no spaces)
- **Port 465 error**: This is TLS/SSL, it's expected for Gmail
- **Check logs**: `cat .next/dev/logs/next-development.log | grep -i "email\|smtp"`
