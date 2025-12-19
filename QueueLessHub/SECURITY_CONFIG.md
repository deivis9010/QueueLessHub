# Security Configuration Guide

## Overview

This project implements multiple layers of security including CORS, Helmet security headers, rate limiting, and proxy trust configuration.

---
## 🌐 URL Validation & SSRF Prevention

### Overview

The application implements comprehensive URL validation to protect against Server-Side Request Forgery (SSRF), Open Redirect, and other URL-based attacks.

### Protected Against

- ✅ **SSRF to Cloud Metadata** (AWS, GCP, Azure)
- ✅ **SSRF to Private Networks** (10.x, 192.168.x, 172.16-31.x, 127.x)
- ✅ **Protocol Smuggling** (file://, ftp://, gopher://, data://)
- ✅ **Access to Localhost**
- ✅ **Open Redirect Attacks**
- ✅ **Null Byte Injection**
- ✅ **URL Length DoS**

### Implementation

Located in [urlValidator.js](src/middlewares/urlValidator.js):

````javascript
const { validateWebhookUrl, validateUrlInBody } = require('./middlewares/urlValidator');

// Validate webhook URLs
router.post('/webhook', validateWebhookUrl, handler);

// Validate URLs in request body
router.post('/fetch', validateUrlInBody('externalUrl'), handler);
````

### Blocked Patterns

**Protocols:**
- ❌ `file://` - File system access
- ❌ `ftp://` - FTP protocol
- ❌ `gopher://` - Gopher protocol
- ❌ `data://` - Data URIs
- ❌ `dict://`, `ldap://`, `sftp://`, `tftp://`, `telnet://`
- ✅ Only `http://` and `https://` allowed

**IP Ranges:**
- ❌ `127.0.0.0/8` - Loopback
- ❌ `10.0.0.0/8` - Private Class A
- ❌ `172.16.0.0/12` - Private Class B
- ❌ `192.168.0.0/16` - Private Class C
- ❌ `169.254.0.0/16` - Link-local
- ❌ `localhost`

**Metadata Endpoints:**
- ❌ `169.254.169.254` - AWS/GCP metadata
- ❌ `metadata.google.internal` - GCP
- ❌ `100.100.100.200` - Alibaba Cloud

### Attack Examples Blocked

**Example 1: AWS Metadata SSRF**

````bash
# Attacker tries to steal AWS credentials
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}'

# Response: 400 Bad Request
{
  "error": "Invalid webhook URL",
  "message": "Access to metadata endpoints is forbidden"
}

# Server log:
[SECURITY] Blocked metadata endpoint attempt: http://169.254.169.254/...
````

**Example 2: Internal Network Scan**

````bash
# Attacker tries to scan internal network
curl -X POST http://localhost:3000/api/fetch-data \
  -H "Content-Type: application/json" \
  -d '{"url":"http://192.168.1.1/admin"}'

# Response: 400 Bad Request
{
  "error": "Invalid URL",
  "message": "Access to private/internal networks is forbidden"
}

# Server log:
[SECURITY] Blocked private IP access attempt: http://192.168.1.1/admin
````

**Example 3: File System Access**

````bash
# Attacker tries to read local files
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"file:///etc/passwd"}'

# Response: 400 Bad Request
{
  "error": "Invalid webhook URL",
  "message": "Protocol file: is not allowed"
}
````

**Example 4: Localhost Access**

````bash
# Attacker tries to access MongoDB
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"http://localhost:27017"}'

# Response: 400 Bad Request
{
  "error": "Invalid webhook URL",
  "message": "Access to private/internal networks is forbidden"
}
````

### Valid URLs Examples

````bash
# ✅ Valid HTTPS webhook
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"https://api.example.com/callback"}'

# ✅ Valid HTTP (development)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"http://api.example.com:8080/webhook"}'
````

### Middleware Options

**1. Basic URL Validation**
````javascript
const { validateUrlInBody } = require('./middlewares/urlValidator');

// Validates 'url' field in req.body
router.post('/endpoint', validateUrlInBody('url'), handler);
````

**2. Query Parameter Validation**
````javascript
const { validateUrlInQuery } = require('./middlewares/urlValidator');

// Validates URL in query string
router.get('/redirect', validateUrlInQuery('redirect_to'), handler);
````

**3. Webhook Validation**
````javascript
const { validateWebhookUrl } = require('./middlewares/urlValidator');

// Optional webhook validation (only validates if URL is provided)
router.post('/webhook', validateWebhookUrl, handler);
````

**4. Whitelist Validation (Most Secure)**
````javascript
const { validateUrlWhitelist } = require('./middlewares/urlValidator');

// Only allow specific domains
const allowedDomains = ['api.whatsapp.com', 'graph.facebook.com'];
router.post('/external', validateUrlWhitelist(allowedDomains), handler);
````

### Testing

Run the validation test suite:

````bash
npm run test:url-validation
# or
node scripts/test-url-validation.js
````

**Test Coverage:**
- ✅ Valid HTTPS/HTTP URLs
- ✅ SSRF attacks to AWS metadata
- ✅ SSRF attacks to private networks
- ✅ Protocol smuggling attempts
- ✅ Encoding attacks (null bytes)
- ✅ Invalid URL formats
- ✅ URL length limits

**Sample Output:**
````
✓ Valid HTTPS URL
✓ Valid HTTP URL
[SECURITY] Blocked metadata endpoint attempt: http://169.254.169.254/...
✓ SSRF Attack: AWS Metadata
[SECURITY] Blocked private IP access attempt: http://192.168.1.1/...
✓ SSRF Attack: Private IP 192.168.x
...
Total tests: 22
Passed: 22
Failed: 0
````

### Production Considerations

**HTTPS Enforcement:**
In production, webhook URLs must use HTTPS:

````javascript
if (process.env.NODE_ENV === 'production' && protocol !== 'https:') {
  return res.status(400).json({
    error: 'Webhook URLs must use HTTPS in production'
  });
}
````

**URL Length Limits:**
Maximum 2048 characters to prevent DoS attacks.

**Monitoring:**
All blocked attempts are logged:
````
[SECURITY] Blocked metadata endpoint attempt: ...
[SECURITY] Blocked private IP access attempt: ...
[URL_VALIDATOR] Blocked invalid URL in body.url: ...
[WHITELIST] Blocked URL from non-whitelisted domain: ...
````

---
## � Password Security

### Strong Password Validation

The application enforces strong password requirements to protect user accounts from brute force attacks and credential stuffing.

### Password Requirements

All passwords must meet the following criteria:

- ✅ **Minimum 8 characters** long
- ✅ At least **one uppercase letter** (A-Z)
- ✅ At least **one lowercase letter** (a-z)
- ✅ At least **one number** (0-9)
- ✅ At least **one special character** (!@#$%^&*(),.?":{}|<>)
- ✅ **Maximum 128 characters** (prevents DoS attacks)
- ✅ **Not a common password** (blocks passwords like "password123", "admin123", etc.)

### Implementation

Password validation is applied in:

1. **User Registration** (`POST /api/auth/register`)
2. **User Creation by Admin** (`POST /api/users`)
3. **Password Change** (`POST /api/users/:id/password`)

### Configuration

Located in [passwordValidator.js](src/middlewares/passwordValidator.js):

````javascript
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};
````

### API Response

**Valid Password:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"MyP@ssw0rd","email":"john@example.com"}'

# Response: 201 Created
```

**Weak Password:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"weak","email":"john@example.com"}'

# Response: 400 Bad Request
{
  "error": "Weak password",
  "message": "Password does not meet security requirements",
  "requirements": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter (A-Z)",
    "Password must contain at least one number (0-9)",
    "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"
  ]
}
```

### Testing Password Validation

**Test various password strengths:**

```bash
# ❌ Too short
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"Pass1!","email":"test1@test.com"}'

# ❌ No uppercase
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test2","password":"password1!","email":"test2@test.com"}'

# ❌ No special character
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test3","password":"Password123","email":"test3@test.com"}'

# ❌ Common password
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test4","password":"Password123","email":"test4@test.com"}'

# ✅ Strong password
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test5","password":"MyS3cur3P@ssw0rd","email":"test5@test.com"}'
```

### Password Change Flow

When changing passwords, users must provide:
- Current password (for verification)
- New password (must meet all requirements)

```bash
curl -X POST http://localhost:3000/api/users/USER_ID/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "OldP@ssw0rd123",
    "newPassword": "NewS3cur3P@ssw0rd"
  }'
```

### Client-Side Integration

Get password requirements for client-side validation:

````javascript
const { getPasswordRequirements } = require('./middlewares/passwordValidator');

// Returns password rules
const requirements = getPasswordRequirements();
console.log(requirements);
// {
//   minLength: 8,
//   maxLength: 128,
//   requireUppercase: true,
//   requireLowercase: true,
//   requireNumbers: true,
//   requireSpecialChars: true,
//   description: [...]
// }
````

### Common Weak Passwords Blocked

The following common passwords are automatically rejected:
- password, password123
- 12345678
- qwerty123
- abc123456
- admin123
- letmein123
- welcome123
- And more...

---

## �🛡️ NoSQL Injection Protection

### Express Mongo Sanitize

This project uses `express-mongo-sanitize` to prevent NoSQL injection attacks by sanitizing user-supplied data.

### How It Works

The middleware removes or replaces characters that have special meaning in MongoDB queries:
- `$` (dollar sign) - Used in MongoDB operators like `$ne`, `$gt`, `$where`
- `.` (dot) - Used to access nested properties

### Configuration

````javascript
app.use(mongoSanitize({
  replaceWith: '_',  // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`[SANITIZE] Potential NoSQL injection attempt detected in ${req.method} ${req.url} - Key: ${key}`);
  }
}));
````

### Attack Examples Prevented

**Example 1: Authentication Bypass**

````javascript
// ❌ Malicious request (without sanitization)
POST /api/auth/login
{
  "email": {"$ne": null},
  "password": {"$ne": null}
}
// Would match ANY user in database

// ✅ After sanitization
{
  "email": {"_ne": null},  // Treated as literal string, not operator
  "password": {"_ne": null}
}
// Fails authentication - no user with email {"_ne": null}
````

**Example 2: Data Extraction**

````javascript
// ❌ Malicious query (without sanitization)
GET /api/users?email[$regex]=.*

// ✅ After sanitization
GET /api/users?email[_regex]=.*
// Treated as literal field name, not regex operator
````

**Example 3: Delete All Documents**

````javascript
// ❌ Malicious request (without sanitization)
DELETE /api/clients/{"$gt":""}
// Could delete all clients

// ✅ After sanitization
DELETE /api/clients/{"_gt":""}
// Only looks for client with that specific malformed ID
````

### What Gets Sanitized

The middleware sanitizes:
- ✅ `req.body` - POST/PUT request bodies
- ✅ `req.query` - URL query parameters
- ✅ `req.params` - Route parameters

### Monitoring

When a potential attack is detected, it's logged:

```
[SANITIZE] Potential NoSQL injection attempt detected in POST /api/auth/login - Key: email
```

Monitor these logs to identify attack attempts.

### Testing

**Test with malicious input:**

```bash
# Try authentication bypass
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":null},"password":{"$ne":null}}'

# Should fail and log sanitization warning
```

---

## 🛡️ Helmet Security Headers

### Current Configuration

````javascript
app.use(helmet({
  contentSecurityPolicy: false,        // Disabled for REST API
  crossOriginEmbedderPolicy: false,   // Allows WhatsApp webhooks
  hsts: {
    maxAge: 31536000,                 // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,                       // Prevent MIME sniffing
  frameguard: { action: 'deny' },     // Prevent clickjacking
  hidePoweredBy: true,                // Hide tech stack
  ieNoOpen: true,                      // IE8+ security
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
````

### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |
| `X-Download-Options` | `noopen` | IE8+ download security |

### Testing Headers

```bash
# Check security headers
curl -I https://your-api.com/api

# Expected output includes:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
```

---

## 🌐 CORS Configuration

### Development vs Production

**Development:**
- Allows `localhost` on ports 3000, 5173, 4200
- Permits requests without origin (Postman, mobile apps)
- Less restrictive for testing

**Production:**
- Only allows origins from `ALLOWED_ORIGINS` environment variable
- Blocks unauthorized cross-origin requests
- Logs blocked attempts

### Configuration

````javascript
const corsOptions = {
  origin: (origin, callback) => {
    // Whitelist from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];
    
    // Allow no-origin requests (mobile, webhooks, Postman)
    if (!origin) return callback(null, true);
    
    // Check whitelist
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400  // Cache preflight for 24 hours
};
````

### Environment Variables

```env
# Allow specific origins (production)
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-site.com,https://mobile.your-app.com

# Allow all in development
NODE_ENV=development
```

### Testing CORS

```javascript
// From browser console at https://malicious-site.com
fetch('https://your-api.com/api/appointments')
  .then(res => res.json())
  .catch(err => console.error('Blocked by CORS:', err));
// ❌ Should be blocked if not in whitelist

// From allowed origin
fetch('https://your-api.com/api/appointments')
  .then(res => res.json())
  .then(data => console.log(data));
// ✅ Should work
```

---

## 🔄 Trust Proxy Configuration

### Why It's Needed

When your app runs behind a reverse proxy (Vercel, Heroku, AWS ELB, Nginx), the IP address you see is the proxy's IP, not the real client IP. This breaks:

- Rate limiting (all users share proxy IP)
- Geolocation
- Security logging
- IP-based access control

### Configuration

````javascript
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1); // Trust first proxy
}
````

### Environment Variable

```env
# Enable in production behind proxy
TRUST_PROXY=true
NODE_ENV=production
```

### How It Works

**Without trust proxy:**
```javascript
req.ip // → '10.0.0.1' (proxy IP)
```

**With trust proxy:**
```javascript
req.ip // → '203.0.113.42' (real client IP)
```

### Deployment Platforms

| Platform | Trust Proxy | Auto-Detected |
|----------|-------------|---------------|
| Vercel | Required | Yes (via headers) |
| Heroku | Required | Yes (via headers) |
| AWS ELB | Required | Yes (via headers) |
| Railway | Required | Yes (via headers) |
| Render | Required | Yes (via headers) |
| Local | Not needed | N/A |

---

## 🚦 Rate Limiting with Proxy

The rate limiting now works correctly with real client IPs:

```javascript
// Before trust proxy
// All users behind Vercel → same IP → shared rate limit ❌

// After trust proxy
// User A (123.45.67.89) → individual limit ✅
// User B (98.76.54.32) → individual limit ✅
```

---

## 📋 Security Checklist

### Before Production

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with your frontend URLs
- [ ] Enable `TRUST_PROXY=true` if behind reverse proxy
- [ ] Verify HTTPS is enforced
- [ ] Test CORS with allowed and blocked origins
- [ ] Verify rate limiting works per-user
- [ ] Check security headers with `curl -I`
- [ ] Ensure JWT_SECRET is strong and unique
- [ ] Test NoSQL injection protection
- [ ] Test URL validation and SSRF protection
- [ ] Run `npm run test:url-validation`
- [ ] Monitor sanitization logs for attack attempts
- [ ] Remove/restrict Swagger UI in production (optional)

### Production Environment Variables

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-app.com
TRUST_PROXY=true
JWT_SECRET=your-very-strong-secret-key-minimum-32-characters
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/prod-db
```

---

## 🧪 Testing Security

### 1. Test Security Headers

```bash
# Production API
curl -I https://your-api.com/api

# Should include:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
```

### 2. Test CORS Blocking

```bash
# Request from unauthorized origin
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://your-api.com/api/appointments

# Should return CORS error
```

### 3. Test Rate Limiting with Real IPs

```bash
# Make multiple requests (should hit rate limit)
for i in {1..10}; do
  curl https://your-api.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# 6th request should return 429 Too Many Requests
```

### 4. Test Trust Proxy

```bash
# Check if real IP is logged (not proxy IP)
# Make request and check server logs
curl https://your-api.com/api

# Server log should show your real public IP, not proxy IP
```

### 5. Test NoSQL Injection Protection

```bash
# Try malicious login with MongoDB operators
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":null},"password":{"$ne":null}}'

# Should fail and log:
# [SANITIZE] Potential NoSQL injection attempt detected...

# Try malicious query parameter
curl "http://localhost:3000/api/users?email[\$regex]=.*"

# Should be sanitized and fail to bypass validation
```

---

## 🔒 Additional Security Recommendations

### 1. Use Environment Variables for Secrets

```bash
# ✅ Good
JWT_SECRET=gHk8$mP2nQ7wL4xY9zT1vR5cE3dB6aF0

# ❌ Bad (hardcoded in code)
const JWT_SECRET = "mysecret";
```

### 2. Implement HTTPS in Production

- Use Let's Encrypt for free SSL certificates
- Most platforms (Vercel, Heroku) provide HTTPS automatically
- Never disable HSTS in production

### 3. Regular Security Audits

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 4. Monitor Failed Requests

```javascript
// Already implemented - watch logs for:
// [CORS] Blocked request from origin: ...
// [RATE LIMIT] Excessive authentication attempts from IP: ...
```

### 5. Keep Dependencies Updated

```bash
# Check outdated packages
npm outdated

# Update carefully
npm update
```

---

## 📚 References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [OWASP Security Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Mozilla Observatory](https://observatory.mozilla.org/) - Test your security headers

---

## 🆘 Troubleshooting

### CORS Issues

**Problem:** Frontend can't connect to API

**Solution:**
1. Check `ALLOWED_ORIGINS` includes your frontend URL
2. In development, ensure `NODE_ENV=development`
3. Check browser console for CORS error details

### Rate Limiting Not Working Per-User

**Problem:** All users hitting same rate limit

**Solution:**
1. Enable `TRUST_PROXY=true`
2. Verify proxy headers are being sent
3. Check logs show real IPs, not proxy IP

### HSTS Errors

**Problem:** Can't access API over HTTP

**Solution:**
- HSTS forces HTTPS for 1 year after first visit
- Use HTTPS in production
- In development, use different domain or clear HSTS in browser

---

## 📞 Need Help?

If you encounter security issues:
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test with tools like `curl` to isolate browser issues
4. Review this documentation and referenced links
