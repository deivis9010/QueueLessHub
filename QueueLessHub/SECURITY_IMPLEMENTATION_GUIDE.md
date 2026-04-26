# Security Implementation Guide - QueueLessHub API

**Last Updated:** April 18, 2026  
**Version:** 1.0 (Phase 1 & 2)  
**Applies To:** TypeScript migration branch (migration_ts) and forward

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: HttpOnly JWT Authentication](#phase-1-httponly-jwt-authentication)
3. [Phase 2: CSRF Protection](#phase-2-csrf-protection)
4. [Client Implementation Examples](#client-implementation-examples)
5. [Migration Guide from Old Token System](#migration-guide-from-old-token-system)

---

## Overview

QueueLessHub API now implements **two complementary security layers**:

### Phase 1: Authentication Security
- JWT tokens stored in **httpOnly cookies** (XSS protection)
- Dual-delivery: tokens in cookies + response body
- Refresh token strategy with 30-day TTL
- Access tokens expire in 15 minutes

### Phase 2: CSRF Protection  
- CSRF tokens generated per request
- Double-submit cookie validation pattern
- Protected endpoints: all POST/PUT/DELETE (except webhooks)
- Zero friction for authenticated requests

---

## Phase 1: HttpOnly JWT Authentication

### Token Types

#### Access Token (Short-lived)
- **Duration:** 15 minutes
- **Storage:** httpOnly cookie (name: `accessToken`)
- **Usage:** Required in `Authorization: Bearer` header
- **Auto-refresh:** Client should call refresh endpoint before expiration

#### Refresh Token (Long-lived)
- **Duration:** 30 days
- **Storage:** httpOnly cookie (name: `refreshToken`)
- **Usage:** POST to `/api/auth/refresh` endpoint
- **Security:** Stored in MongoDB, one-time use (invalidated on refresh)

### Authentication Flow

#### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!",
  "role": "user",
  "email": "john@example.com"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies Set:**
```
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
```

#### 2. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Making Authenticated Requests

**Option A: Browser with Cookies (Automatic)**
```javascript
// Cookies are sent automatically by browser
fetch('https://api.queuelesshub.com/api/users', {
  method: 'GET',
  credentials: 'include' // Required to send cookies
})
```

**Option B: Server/Mobile with Token from Body**
```javascript
fetch('https://api.queuelesshub.com/api/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

#### 4. Refreshing Access Token (Before Expiration)

When access token is about to expire (typically after 14 minutes), refresh it:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Or (using cookie):**
```http
POST /api/auth/refresh
Cookie: refreshToken=<token from cookie>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Security Note:** Old refresh token is invalidated on use (token rotation). New pair must be used going forward.

#### 5. User Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
```

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Cookies Cleared:**
- `accessToken` deleted
- `refreshToken` deleted
- `X-CSRF-Token` deleted

---

## Phase 2: CSRF Protection

### What is CSRF?

Cross-Site Request Forgery (CSRF) is an attack where malicious sites trick your browser into making unwanted requests to our API on your behalf.

**Example Attack:**
```html
<!-- Malicious website -->
<img src="https://api.queuelesshub.com/api/users/123" />
<!-- Your browser sends your auth cookie, changing data without your consent -->
```

### CSRF Protection Strategy: Double-Submit Cookie

QueueLessHub uses the **double-submit cookie pattern**:

1. Server generates a unique CSRF token per request
2. Client stores token in response body or header
3. Client includes token in `X-CSRF-Token` header for state-changing requests
4. Server validates: `header token === cookie token`
5. Mismatched or missing token → 403 Forbidden

### CSRF Token Lifecycle

#### 1. Get CSRF Token

```http
GET /api/auth/csrf-token
```

**Response (200 OK):**
```json
{
  "csrfToken": "a1b2c3d4e5f6...",
  "message": "CSRF token retrieved. Include in X-CSRF-Token header for state-changing operations."
}
```

**Cookies Set:**
```
Set-Cookie: X-CSRF-Token=a1b2c3d4e5f6...; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

#### 2. Use CSRF Token in POST/PUT/DELETE

```http
POST /api/users
Authorization: Bearer <accessToken>
X-CSRF-Token: a1b2c3d4e5f6...
Content-Type: application/json

{
  "username": "newuser",
  "password": "SecurePassword123!",
  "role": "doctor"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "username": "newuser",
  "role": "doctor"
}
```

#### 3. CSRF Protection Errors

**Missing Token:**
```http
POST /api/users
Authorization: Bearer <accessToken>

{
  "username": "newuser",
  "password": "SecurePassword123!",
  "role": "doctor"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "CSRF token missing",
  "message": "X-CSRF-Token header is required for state-changing operations"
}
```

**Mismatched Token:**
```http
POST /api/users
Authorization: Bearer <accessToken>
X-CSRF-Token: wrong-token-value

{...}
```

**Response (403 Forbidden):**
```json
{
  "error": "CSRF token invalid",
  "message": "X-CSRF-Token header does not match cookie"
}
```

### Protected Endpoints

All state-changing operations require CSRF token:

| Method | Endpoints | Protected |
|--------|-----------|-----------|
| POST | `/api/appointments` | ✅ |
| POST | `/api/clients` | ✅ |
| POST | `/api/conversations` | ✅ |
| POST | `/api/doctors` | ✅ |
| POST | `/api/availability` | ✅ |
| POST | `/api/users` | ✅ |
| POST | `/api/auth/logout` | ✅ |
| PUT | All `/api/*` resources | ✅ |
| DELETE | All `/api/*` resources | ✅ |
| **GET** | **All endpoints** | ❌ (no CSRF required) |
| **HEAD** | All endpoints | ❌ (no CSRF required) |
| **OPTIONS** | All endpoints | ❌ (no CSRF required) |
| POST | `/api/bot/*` (webhooks) | ❌ (exempt) |
| POST | `/api/bot/spreadsheet/*` | ❌ (exempt) |

### Unprotected Endpoints (No CSRF Required)

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET /api/auth/csrf-token
```

---

## Client Implementation Examples

### Example 1: Browser JavaScript

```javascript
// 1. Initialize: Get CSRF token on page load
async function initializeSecurity() {
  const response = await fetch('https://api.queuelesshub.com/api/auth/csrf-token', {
    credentials: 'include' // Include cookies
  });
  
  const data = await response.json();
  // Store CSRF token globally or in state management
  window.csrfToken = data.csrfToken;
}

// 2. Login
async function login(username, password) {
  const response = await fetch('https://api.queuelesshub.com/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  // Cookies are automatically managed by browser
  // Optional: store tokens in state for reference
  window.accessToken = data.accessToken;
  window.refreshToken = data.refreshToken;
}

// 3. Make protected request
async function createUser(userData) {
  const response = await fetch('https://api.queuelesshub.com/api/users', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': window.csrfToken // Add CSRF token
    },
    body: JSON.stringify(userData)
  });
  
  return response.json();
}

// 4. Refresh token when needed
async function refreshAccessToken() {
  const response = await fetch('https://api.queuelesshub.com/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
    // Refresh token comes from cookie automatically
  });
  
  const data = await response.json();
  window.accessToken = data.accessToken;
  window.refreshToken = data.refreshToken;
}

// 5. Logout
async function logout() {
  const response = await fetch('https://api.queuelesshub.com/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': window.csrfToken }
  });
  
  // Cookies automatically cleared by server
  window.accessToken = null;
  window.refreshToken = null;
}
```

### Example 2: React Hook with Axios

```javascript
import axios from 'axios';
import { useEffect, useState } from 'react';

const API = axios.create({
  baseURL: 'https://api.queuelesshub.com/api',
  withCredentials: true // Include cookies in all requests
});

export function useAuth() {
  const [csrfToken, setCsrfToken] = useState(null);
  const [user, setUser] = useState(null);

  // Get CSRF token on mount
  useEffect(() => {
    API.get('/auth/csrf-token')
      .then(res => setCsrfToken(res.data.csrfToken))
      .catch(err => console.error('CSRF error:', err));
  }, []);

  // Add CSRF token to all requests
  API.interceptors.request.use(config => {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  });

  // Handle token refresh on 401
  API.interceptors.response.use(
    res => res,
    async err => {
      if (err.response?.status === 401) {
        try {
          const res = await API.post('/auth/refresh');
          return API(err.config); // Retry original request
        } catch {
          setUser(null);
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    }
  );

  const login = (username, password) =>
    API.post('/auth/login', { username, password })
      .then(res => setUser(res.data.user));

  const logout = () =>
    API.post('/auth/logout')
      .then(() => setUser(null));

  return { login, logout, user, api: API };
}

// Usage in component
function CreateUserComponent() {
  const { api, csrfToken } = useAuth();

  const handleCreateUser = async (userData) => {
    try {
      const response = await api.post('/users', userData);
      console.log('User created:', response.data);
    } catch (error) {
      console.error('Create user error:', error.response.data);
    }
  };

  return <button onClick={() => handleCreateUser({ ... })}>Create User</button>;
}
```

### Example 3: NodeJS Server

```javascript
import axios from 'axios';
import https from 'https';

// Create axios instance with cookie jar
const axiosCookieJarSupport = require('axios-cookiejar-support');
const tough = require('tough-cookie');

const cookieJar = new tough.CookieJar();
axiosCookieJarSupport(axios);

const api = axios.create({
  baseURL: 'https://api.queuelesshub.com/api',
  jar: cookieJar,
  withCredentials: true,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Dev only
});

// 1. Get CSRF token
async function initializeApi() {
  const response = await api.get('/auth/csrf-token');
  return response.data.csrfToken;
}

// 2. Login
async function login(username, password) {
  const response = await api.post('/auth/login', {
    username,
    password
  });
  console.log('Logged in as:', response.data.user.username);
  return response.data;
}

// 3. Make protected request
async function createUser(userData) {
  const csrfToken = await initializeApi();
  
  const response = await api.post('/users', userData, {
    headers: { 'X-CSRF-Token': csrfToken }
  });
  
  return response.data;
}

// Usage
(async () => {
  await login('admin', 'Str0ng!Pass123');
  const newUser = await createUser({
    username: 'newuser',
    password: 'NewPass123!',
    role: 'doctor'
  });
  console.log('Created:', newUser);
})();
```

### Example 4: cURL Commands

```bash
# 1. Get CSRF token
curl -X GET https://api.queuelesshub.com/api/auth/csrf-token \
  -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json"

# 2. Login
curl -X POST https://api.queuelesshub.com/api/auth/login \
  -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Str0ng!Pass123"}'

# 3. Create user (with CSRF token from response body or set in header)
curl -X POST https://api.queuelesshub.com/api/users \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token-from-csrf-token-endpoint>" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "username":"newuser",
    "password":"NewPass123!",
    "role":"doctor"
  }'

# 4. Logout
curl -X POST https://api.queuelesshub.com/api/auth/logout \
  -b cookies.txt \
  -H "X-CSRF-Token: <csrf-token>" \
  -H "Authorization: Bearer <access-token>"
```

---

## Migration Guide from Old Token System

### What Changed?

| Aspect | Old System | New System (Phase 1-2) |
|--------|-----------|----------------------|
| **Token Storage** | localStorage (XSS risk) | httpOnly cookies (XSS safe) |
| **Access Token TTL** | 7 days (long) | 15 minutes (short) |
| **Refresh Token** | Not implemented | 30 days in database |
| **Token Rotation** | N/A | Yes, old token invalidated on refresh |
| **CSRF Protection** | None | Double-submit cookie pattern |
| **Backward Compatibility** | N/A | Full - tokens in body + cookies |
| **Client Code Required** | No changes | Optional - add CSRF token handling |

### Migration Steps for Clients

#### Step 1: Update Auth Flow (Optional)

Your existing code will still work. Tokens are returned in response body as before.

```javascript
// Old code (still works)
const token = response.body.accessToken;
localStorage.setItem('token', token);

// New recommended approach (more secure)
// Rely on automatic cookie management
// Call /auth/csrf-token endpoint to populate CSRF token
```

#### Step 2: Add CSRF Token Handling

For all POST/PUT/DELETE requests, include CSRF token:

```javascript
// Old code (no CSRF token)
fetch('/api/users', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(userData)
})

// New code (with CSRF token)
fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken // Add this
  },
  body: JSON.stringify(userData)
})
```

#### Step 3: Handle Token Refresh

Implement automatic token refresh before expiration:

```javascript
// Set up refresh timer (refresh after 14 minutes)
setInterval(() => {
  fetch('/api/auth/refresh', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      // Update stored tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    });
}, 14 * 60 * 1000);
```

#### Step 4: Test Both Systems During Transition

For a smooth transition, maintain backward compatibility:
- Tokens in cookies work automatically (browsers)
- Tokens in body work as before (for your existing code)
- Both coexist without conflict

### Deprecation Timeline

- **Now (April 18, 2026):** Phase 1-2 live, old system works
- **June 18, 2026:** Old system deprecated (3-month warning)
- **August 18, 2026:** Old system removed (migration deadline)

---

## Troubleshooting

### Issue: "CSRF token missing"

**Cause:** Not including `X-CSRF-Token` header in POST/PUT/DELETE request.

**Solution:**
1. Call `GET /api/auth/csrf-token` first
2. Extract token from response: `{ csrfToken: "..." }`
3. Include in header: `X-CSRF-Token: <value>`

```javascript
const csrfRes = await fetch('/api/auth/csrf-token');
const { csrfToken } = await csrfRes.json();

fetch('/api/users', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(userData)
})
```

### Issue: "CSRF token invalid"

**Cause:** Token in header doesn't match token in cookie.

**Solution:** Use `credentials: 'include'` in fetch to ensure cookies are sent/received:

```javascript
fetch('/api/auth/csrf-token', {
  credentials: 'include' // Receive cookie
});

fetch('/api/users', {
  method: 'POST',
  credentials: 'include', // Send cookie
  headers: { 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(userData)
});
```

### Issue: 401 Unauthorized after 15 minutes

**Cause:** Access token expired.

**Solution:** Refresh the token:

```javascript
fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include'
})
.then(res => res.json())
.then(data => {
  // New tokens received, retry original request
  fetch('/api/resource', { ...originalRequest })
})
```

### Issue: Logout not working

**Cause:** Not including CSRF token in logout request.

**Solution:** Include CSRF token even on logout:

```javascript
fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
  headers: { 'X-CSRF-Token': csrfToken }
})
```

---

## Best Practices

1. **Always include `credentials: 'include'`** in fetch requests to handle cookies
2. **Call `/auth/csrf-token` once per page load** and store the token
3. **Refresh access tokens automatically** before expiration (14-minute timer)
4. **Never expose CSRF tokens in GET parameters** (use header only)
5. **Use HTTPS in production** (cookies must be Secure flag)
6. **Rotate refresh tokens** by calling `/auth/refresh` when access token expires
7. **Clear tokens on logout** (server-side: deleted, client-side: remove from storage)

---

## API Endpoint Reference

### Authentication Endpoints

| Endpoint | Method | Auth Required | CSRF Required | Description |
|----------|--------|---------------|---------------|-------------|
| `/api/auth/register` | POST | ❌ | ❌ | Register new user |
| `/api/auth/login` | POST | ❌ | ❌ | Authenticate user |
| `/api/auth/csrf-token` | GET | ❌ | ❌ | Get CSRF token |
| `/api/auth/refresh` | POST | ❌ | ❌ | Refresh access token |
| `/api/auth/logout` | POST | ✅ | ✅ | Logout user |

### Protected Endpoints (All POST/PUT/DELETE)

All data modification endpoints require:
- `Authorization: Bearer <accessToken>` header
- `X-CSRF-Token: <csrfToken>` header (for POST/PUT/DELETE)

Example endpoints:
- `/api/users/*`
- `/api/appointments/*`
- `/api/doctors/*`
- `/api/clients/*`
- `/api/conversations/*`
- `/api/availability/*`

---

## Support

For questions or issues, please refer to:
- [SECURITY_ROADMAP.md](SECURITY_ROADMAP.md) - Implementation details
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [API Documentation](swagger-ui) - Interactive API docs

---

**Document Version:** 1.0  
**Last Updated:** April 18, 2026  
**Maintained By:** QueueLessHub Security Team
