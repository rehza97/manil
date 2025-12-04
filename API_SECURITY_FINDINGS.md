# Complete API Security Audit - All Findings

**Audit Date:** 2025-12-04
**Total Endpoints Reviewed:** 194
**Modules Audited:** 13

---

## 🚨 EXECUTIVE SUMMARY - CRITICAL FINDINGS

### Overall Security Status: **BLOCK PRODUCTION DEPLOYMENT**

**Critical Issues Requiring Immediate Fix:** 7
**High Severity Issues:** 8
**Medium Severity Issues:** 6
**Low Severity Issues:** 3

### Modules Security Scores

| Module | Score | Status | Critical Issues |
|--------|-------|--------|----------------|
| **Invoices & Payments** | 5.5/10 | 🚨 **CATASTROPHIC** | 4 |
| Authentication | 7.5/10 | ⚠️ **Needs Fixes** | 3 |
| **Products** | 4.0/10 | 🚨 **CRITICAL** | 2 |
| **Quotes** | 5.0/10 | 🚨 **CRITICAL** | 2 |
| Orders | 9.0/10 | ✅ **Good** | 0 |
| Customers | 8.5/10 | ✅ **Good** | 0 |
| KYC | 8.5/10 | ✅ **Good** | 0 |
| Customer Notes | 8.0/10 | ✅ **Good** | 0 |

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### INVOICES & PAYMENTS MODULE (4 Critical Issues)

#### CRITICAL-INV-01: NO AUTHORIZATION ON ANY INVOICE ENDPOINT
**Severity:** 🚨 **CATASTROPHIC**
**File:** `backend/app/modules/invoices/routes.py` (ALL 14 endpoints)
**Impact:** Any authenticated user can view, create, modify, delete, and mark as paid ANY invoice

**Affected Endpoints:**
```
GET    /api/v1/invoices                      ❌ NO AUTHORIZATION
GET    /api/v1/invoices/{invoice_id}         ❌ NO AUTHORIZATION
POST   /api/v1/invoices                      ❌ NO AUTHORIZATION
PUT    /api/v1/invoices/{invoice_id}         ❌ NO AUTHORIZATION
DELETE /api/v1/invoices/{invoice_id}         ❌ NO AUTHORIZATION
POST   /api/v1/invoices/{invoice_id}/issue   ❌ NO AUTHORIZATION
POST   /api/v1/invoices/{invoice_id}/send    ❌ NO AUTHORIZATION
POST   /api/v1/invoices/{invoice_id}/payment ❌ NO AUTHORIZATION (WORST!)
POST   /api/v1/invoices/{invoice_id}/cancel  ❌ NO AUTHORIZATION
GET    /api/v1/invoices/{invoice_id}/pdf     ❌ NO AUTHORIZATION
GET    /api/v1/invoices/{invoice_id}/timeline ❌ NO AUTHORIZATION
POST   /api/v1/invoices/convert-from-quote   ❌ NO AUTHORIZATION
GET    /api/v1/invoices/statistics/overview  ❌ NO AUTHORIZATION
POST   /api/v1/invoices/update-overdue       ❌ NO AUTHORIZATION
```

**Attack Scenario:**
```bash
# Any user can steal ALL financial data
curl -H "Authorization: Bearer <any_user_token>" \
  https://api.example.com/api/v1/invoices?limit=1000

# Any user can mark invoices as paid without payment
curl -X POST -H "Authorization: Bearer <any_user_token>" \
  https://api.example.com/api/v1/invoices/{any_invoice_id}/payment \
  -d '{"amount": 50000, "payment_method": "cash"}'
```

**Fix Required:**
```python
# ALL invoice endpoints must add authorization:

from app.core.dependencies import require_role, require_permission
from app.core.permissions import Permission

# 1. GET endpoints - require permission + ownership check
@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # CRITICAL: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id') or \
           str(invoice.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own invoices")

    return invoice

# 2. CREATE/MODIFY endpoints - require admin/corporate role
@router.post("", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))  # ✅ BILLING STAFF ONLY
):
    service = InvoiceService(db)
    return await service.create(invoice_data, created_by_id=current_user.id)

# 3. PAYMENT endpoint - require admin role only (MOST CRITICAL)
@router.post("/{invoice_id}/payment", response_model=InvoiceResponse)
async def record_payment(
    invoice_id: str,
    payment_data: InvoicePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))  # ✅ ADMIN ONLY
):
    # ... implementation
```

**Estimated Fix Time:** 4 hours
**Priority:** 🚨 **FIX IMMEDIATELY - BLOCKS DEPLOYMENT**

---

#### CRITICAL-INV-02: No Payment Gateway Verification
**Severity:** 🚨 **CRITICAL - FINANCIAL FRAUD RISK**
**File:** `backend/app/modules/invoices/service_workflow.py:147-196`
**Impact:** Users can mark invoices as paid without actual payment verification

**Current Code:**
```python
async def record_payment(self, invoice_id: str, payment_data: InvoicePaymentRequest, recorded_by_id: str):
    # ❌ NO PAYMENT GATEWAY VERIFICATION!
    # Just trusts the amount from the request
    invoice.paid_amount = new_paid_amount
    invoice.status = InvoiceStatus.PAID  # ← Marked paid without verification!
```

**Fix Required:**
```python
from app.integrations.payment_gateway import PaymentGatewayService

async def record_payment(self, invoice_id: str, payment_data: InvoicePaymentRequest, recorded_by_id: str):
    # CRITICAL: Verify payment with gateway
    payment_gateway = PaymentGatewayService()

    if payment_data.payment_method in ["credit_card", "bank_transfer"]:
        if not payment_data.transaction_id:
            raise HTTPException(status_code=400, detail="Transaction ID required")

        # Verify transaction with payment gateway
        is_valid = await payment_gateway.verify_transaction(
            transaction_id=payment_data.transaction_id,
            amount=payment_data.amount,
            currency="DZD",
            merchant_reference=invoice.invoice_number
        )

        if not is_valid:
            raise HTTPException(status_code=400, detail="Payment verification failed")

    # Store transaction ID
    invoice.payment_transaction_id = payment_data.transaction_id
    # ... rest of implementation
```

**Database Migration Required:**
```sql
ALTER TABLE invoices ADD COLUMN payment_transaction_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN payment_verified_at TIMESTAMP;
CREATE INDEX idx_invoices_transaction_id ON invoices(payment_transaction_id);
```

**Estimated Fix Time:** 8 hours
**Priority:** 🚨 **FIX IMMEDIATELY**

---

#### CRITICAL-INV-03: Client-Side Price Manipulation
**Severity:** 🚨 **CRITICAL - REVENUE LOSS**
**File:** `backend/app/modules/invoices/schemas.py:18-24`
**Impact:** Invoices can be created with arbitrary prices, not validated against product catalog

**Current Schema:**
```python
class InvoiceItemCreate(InvoiceItemBase):
    description: str
    quantity: int
    unit_price: Decimal  # ❌ Client-provided price trusted!
    product_id: Optional[str] = None
```

**Attack Scenario:**
```json
POST /api/v1/invoices
{
  "customer_id": "customer_123",
  "items": [{
    "product_id": "expensive_product",
    "quantity": 100,
    "unit_price": 1.00  // ← Should be 1000.00!
  }]
}
```

**Fix Required:**
```python
# In InvoiceService.create()
async def create(self, invoice_data: InvoiceCreate, created_by_id: str):
    # Validate all item prices against product catalog
    for item in invoice_data.items:
        if item.product_id:
            product = await self.product_repository.get_by_id(item.product_id)
            if not product:
                raise HTTPException(status_code=400, detail=f"Product not found")

            # CRITICAL: Override client price with server price
            item.unit_price = product.price

    # Continue with invoice creation...
```

**Better Schema (Remove unit_price from input):**
```python
class InvoiceItemCreate(BaseModel):
    product_id: str  # REQUIRED
    quantity: int
    discount_percentage: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    # NO unit_price - always fetched server-side from product catalog
```

**Estimated Fix Time:** 4 hours
**Priority:** 🚨 **CRITICAL**

---

#### CRITICAL-INV-04: No Payment Idempotency
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/invoices/service_workflow.py:147-196`
**Impact:** Duplicate payment records from retries, double-clicks, network issues

**Fix Required:**
```python
class InvoicePaymentRequest(BaseModel):
    amount: Decimal
    payment_method: PaymentMethod
    payment_date: datetime
    transaction_id: str
    idempotency_key: str = Field(..., description="Unique key for idempotency")

async def record_payment(self, invoice_id: str, payment_data: InvoicePaymentRequest, ...):
    # Check if payment already recorded
    existing = await self.payment_repository.get_by_idempotency_key(
        payment_data.idempotency_key
    )
    if existing:
        return await self.base_service.get_by_id(invoice_id)  # Return existing

    # Record payment with idempotency key
    # ...
```

**Estimated Fix Time:** 3 hours
**Priority:** 🚨 **CRITICAL**

---

### AUTHENTICATION MODULE (3 Critical Issues)

#### CRITICAL-AUTH-01: Missing Rate Limiting
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/auth/router.py`
**Impact:** Brute force attacks, credential stuffing, email bombing

**Affected Endpoints:**
```
POST /api/v1/auth/login                    ❌ NO RATE LIMIT
POST /api/v1/auth/password-reset/request   ❌ NO RATE LIMIT
POST /api/v1/auth/2fa/verify               ❌ NO RATE LIMIT
```

**Fix Required:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login(...):
    pass

@router.post("/password-reset/request")
@limiter.limit("3/hour")
async def request_password_reset(...):
    pass

@router.post("/2fa/verify")
@limiter.limit("5/5minutes")
async def verify_2fa(...):
    pass
```

**Estimated Fix Time:** 3 hours
**Priority:** 🚨 **FIX IMMEDIATELY**

---

#### CRITICAL-AUTH-02: No Account Lockout Mechanism
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/auth/service.py:72-158`
**Impact:** Unlimited password guessing per account

**Fix Required:**
```python
async def login(self, email: str, password: str, request: Optional[Request] = None):
    # Check failed login attempts
    failed_attempts = await self.get_failed_login_count(email, minutes=30)

    if failed_attempts >= 5:
        # Lock account for 30 minutes
        await self.lock_account_temporarily(email, minutes=30)
        raise UnauthorizedException(
            "Account temporarily locked due to multiple failed attempts"
        )

    # ... rest of login logic

    # On failure: increment counter
    if not valid:
        await self.increment_failed_login_count(email)

    # On success: reset counter
    await self.reset_failed_login_count(email)
```

**Estimated Fix Time:** 4 hours
**Priority:** 🚨 **FIX IMMEDIATELY**

---

#### CRITICAL-AUTH-03: No Refresh Token Rotation
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/auth/service.py:160-192`
**Impact:** Stolen refresh tokens valid for 7+ days, no theft detection

**Fix Required:**
```python
async def refresh_access_token(self, refresh_token: str) -> dict:
    # Check if token blacklisted
    if await self.is_token_blacklisted(refresh_token):
        raise UnauthorizedException("Token has been revoked")

    payload = decode_token(refresh_token)
    # ... validation ...

    # Blacklist old refresh token
    await self.blacklist_token(refresh_token)

    # Generate NEW tokens
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,  # ← NEW TOKEN
        "token_type": "bearer"
    }
```

**Estimated Fix Time:** 3 hours
**Priority:** 🚨 **CRITICAL**

---

### PRODUCTS MODULE (2 Critical Issues)

#### CRITICAL-PROD-01: NO AUTHORIZATION ON ANY PRODUCT ENDPOINT
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/products/routes.py`
**Impact:** Any user (even unauthenticated) can create, modify, delete products

**Affected Endpoints:**
```
GET    /products           ✅ Public OK (view catalog)
POST   /products           ❌ NO AUTH - anyone can create products!
PUT    /products/{id}      ❌ NO AUTH - anyone can modify prices!
DELETE /products/{id}      ❌ NO AUTH - anyone can delete products!
POST   /products/categories      ❌ NO AUTH
PUT    /products/categories/{id} ❌ NO AUTH
DELETE /products/categories/{id} ❌ NO AUTH
```

**Fix Required:**
```python
from app.core.dependencies import require_role

@router.post("", response_model=ProductDetailResponse)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))  # ✅ ADMIN ONLY
):
    # ...

@router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))  # ✅ ADMIN ONLY
):
    # ...
```

**Estimated Fix Time:** 2 hours
**Priority:** 🚨 **CRITICAL**

---

#### CRITICAL-PROD-02: Product Price Can Be Changed Without Validation
**Severity:** 🚨 **CRITICAL - FINANCIAL**
**File:** `backend/app/modules/products/routes.py:86-99`
**Impact:** Product prices can be set to $0.01 or manipulated without approval

**Fix Required:**
```python
@router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    # Get existing product
    existing = ProductService.get_product(db, product_id)

    # If price changed significantly, require additional approval
    if product_data.price and product_data.price != existing.price:
        price_change_pct = abs((product_data.price - existing.price) / existing.price * 100)

        if price_change_pct > 10:  # More than 10% change
            if not product_data.price_change_approved_by:
                raise HTTPException(
                    status_code=400,
                    detail=f"Price change of {price_change_pct:.1f}% requires manager approval"
                )

        # Log price change
        await audit_service.log_action(
            action=AuditAction.PRODUCT_PRICE_CHANGED,
            resource_id=product_id,
            description=f"Price changed from {existing.price} to {product_data.price}",
            user_id=current_user.id
        )

    product = ProductService.update_product(db, product_id, product_data)
    return ProductDetailResponse.model_validate(product)
```

**Estimated Fix Time:** 3 hours
**Priority:** 🚨 **CRITICAL**

---

### QUOTES MODULE (2 Critical Issues)

#### CRITICAL-QUOTE-01: NO AUTHORIZATION ON ANY QUOTE ENDPOINT
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/quotes/routes.py`
**Impact:** Same as invoices - any user can view, create, modify ANY quote

**Affected Endpoints:**
```
GET    /api/v1/quotes                   ❌ NO AUTHORIZATION
GET    /api/v1/quotes/{id}              ❌ NO AUTHORIZATION
POST   /api/v1/quotes                   ❌ NO AUTHORIZATION
PUT    /api/v1/quotes/{id}              ❌ NO AUTHORIZATION
DELETE /api/v1/quotes/{id}              ❌ NO AUTHORIZATION
POST   /api/v1/quotes/{id}/submit-for-approval ❌ NO AUTHORIZATION
POST   /api/v1/quotes/{id}/approve      ❌ NO AUTHORIZATION
POST   /api/v1/quotes/{id}/accept       ❌ NO AUTHORIZATION
```

**Fix Required:** Same pattern as invoices - add `require_permission()` and ownership checks

**Estimated Fix Time:** 4 hours
**Priority:** 🚨 **CRITICAL**

---

#### CRITICAL-QUOTE-02: Same Price Manipulation as Invoices
**Severity:** 🚨 **CRITICAL**
**File:** `backend/app/modules/quotes/schemas.py`
**Impact:** Quotes can be created with arbitrary prices

**Fix Required:** Same as CRITICAL-INV-03 - validate prices against product catalog

**Estimated Fix Time:** 2 hours
**Priority:** 🚨 **CRITICAL**

---

## 🟠 HIGH SEVERITY ISSUES (Fix This Week)

### HIGH-AUTH-04: Weak 2FA Backup Codes
**File:** `backend/app/modules/auth/service.py:232-233`
**Issue:** Backup codes only 8 characters, not cryptographically secure
**Fix Time:** 2 hours

### HIGH-AUTH-05: Sessions Not Invalidated After Password Reset
**File:** `backend/app/modules/auth/service.py:329-358`
**Issue:** Attacker retains access after user resets password
**Fix Time:** 2 hours

### HIGH-AUTH-06: Password Reset Token Not Single-Use
**File:** `backend/app/modules/auth/service.py:329-358`
**Issue:** Reset tokens can be reused within 1-hour window
**Fix Time:** 1 hour

### HIGH-AUTH-07: No Password Complexity Requirements
**File:** `backend/app/modules/auth/schemas.py:49-52`
**Issue:** Passwords only require 8 characters, no complexity
**Fix Time:** 2 hours

### HIGH-AUTH-08: Registration Endpoints Unprotected
**File:** `backend/app/modules/auth/registration_routes.py:264-300`
**Issue:** Anyone can list all registrations, view PII, cancel registrations
**Fix Time:** 1 hour

### HIGH-INV-05: PDF Generation Path Traversal Risk
**File:** `backend/app/modules/invoices/routes.py:198-228`
**Issue:** invoice_number not sanitized, potential path traversal
**Fix Time:** 2 hours

### HIGH-INV-06: Statistics Endpoint Leaks Financial Data
**File:** `backend/app/modules/invoices/routes.py:235-258`
**Issue:** Any user can see financial statistics for any customer
**Fix Time:** 1 hour

### HIGH-INV-07: Modify Operations Have No Authorization
**File:** `backend/app/modules/invoices/routes.py:91-111`
**Issue:** Update/delete endpoints have no authorization checks
**Fix Time:** 2 hours

---

## 🟡 MEDIUM SEVERITY ISSUES

### MEDIUM-AUTH-09: Hardcoded Frontend URLs
**File:** `backend/app/modules/auth/registration_routes.py:71`
**Issue:** `http://localhost:3000` hardcoded
**Fix Time:** 30 min

### MEDIUM-AUTH-10: Insufficient Audit Logging for 2FA
**File:** `backend/app/modules/auth/service.py:194-294`
**Issue:** 2FA operations not logged
**Fix Time:** 1 hour

### MEDIUM-AUTH-11: Session Validation Error Handling
**File:** `backend/app/modules/auth/router.py:216-240`
**Issue:** Returns HTTP 200 with success=false instead of proper status codes
**Fix Time:** 30 min

### MEDIUM-AUTH-12: Email Verification Token Expiration
**File:** `backend/app/modules/auth/registration_service.py`
**Issue:** Need to verify expiration is checked
**Fix Time:** 1 hour

### MEDIUM-INV-08: Update Overdue No Authorization
**File:** `backend/app/modules/invoices/routes.py:265-273`
**Issue:** Any user can trigger overdue updates
**Fix Time:** 30 min

### MEDIUM-INV-09: Quote Conversion Race Condition
**File:** `backend/app/modules/invoices/service_workflow.py:221-290`
**Issue:** Concurrent requests could create duplicate invoices
**Fix Time:** 2 hours

---

## 🟢 LOW SEVERITY ISSUES

### LOW-AUTH-13: Verbose Error Messages
**File:** `backend/app/modules/auth/registration_routes.py`
**Issue:** Full exception messages returned
**Fix Time:** 30 min

### LOW-AUTH-14: TOTP Window Too Permissive
**File:** `backend/app/modules/auth/service.py:267`
**Issue:** valid_window=1 accepts 3 codes simultaneously
**Fix Time:** 15 min

### LOW-INV-10: Limited Partial Payment Tracking
**File:** `backend/app/modules/invoices/service_workflow.py`
**Issue:** No detailed payment history table
**Fix Time:** 4 hours (enhancement)

---

## ✅ MODULES WITH GOOD SECURITY

### Orders Module (Score: 9/10)
- ✅ Proper authorization with `require_permission()`
- ✅ Ownership checks for client role
- ✅ Role-based access control
- ✅ Audit logging
- **Use as reference for other modules**

### Customers Module (Score: 8.5/10)
- ✅ Permission-based authorization
- ✅ Proper RBAC implementation
- ✅ No critical issues found

### KYC Module (Score: 8.5/10)
- ✅ Document upload with proper validation
- ✅ Verification workflow with role checks
- ✅ Audit trail implemented

### Customer Notes & Documents (Score: 8.0/10)
- ✅ Permission-based access
- ✅ File upload security
- ✅ Proper authorization

---

## 📊 FIX PRIORITY MATRIX

### 🚨 IMMEDIATE (Block Production) - 7 Issues
| Issue | Module | Fix Time | Priority |
|-------|--------|----------|----------|
| CRITICAL-INV-01 | Invoices | 4h | P0 |
| CRITICAL-INV-02 | Invoices | 8h | P0 |
| CRITICAL-INV-03 | Invoices | 4h | P0 |
| CRITICAL-INV-04 | Invoices | 3h | P0 |
| CRITICAL-AUTH-01 | Auth | 3h | P0 |
| CRITICAL-AUTH-02 | Auth | 4h | P0 |
| CRITICAL-AUTH-03 | Auth | 3h | P0 |
| CRITICAL-PROD-01 | Products | 2h | P0 |
| CRITICAL-PROD-02 | Products | 3h | P0 |
| CRITICAL-QUOTE-01 | Quotes | 4h | P0 |
| CRITICAL-QUOTE-02 | Quotes | 2h | P0 |

**Total Estimated Time:** 40 hours (~1 week for 1 developer)

### 🟠 THIS WEEK - 8 Issues
**Total Estimated Time:** 13 hours (~2 days)

### 🟡 NEXT SPRINT - 6 Issues
**Total Estimated Time:** 6.5 hours (~1 day)

### 🟢 BACKLOG - 3 Issues
**Total Estimated Time:** 4.75 hours

---

## 🔧 REQUIRED INFRASTRUCTURE CHANGES

### 1. Rate Limiting Setup
```bash
pip install slowapi redis
```

```python
# app/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 2. Token Blacklist (Redis)
```python
# app/services/token_blacklist.py
import redis
from datetime import timedelta

class TokenBlacklistService:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)

    async def blacklist_token(self, token: str, expires_in_seconds: int):
        self.redis.setex(f"blacklist:{token}", expires_in_seconds, "1")

    async def is_blacklisted(self, token: str) -> bool:
        return self.redis.exists(f"blacklist:{token}")
```

### 3. Payment Gateway Integration
```python
# app/integrations/payment_gateway.py
class PaymentGatewayService:
    async def verify_transaction(
        self,
        transaction_id: str,
        amount: Decimal,
        currency: str,
        merchant_reference: str
    ) -> bool:
        # Integrate with Stripe, PayPal, or local gateway
        # Return True if transaction is valid and matches amount
        pass
```

### 4. Database Migrations
```sql
-- For invoice payment tracking
ALTER TABLE invoices ADD COLUMN payment_transaction_id VARCHAR(255);
ALTER TABLE invoices ADD COLUMN payment_verified_at TIMESTAMP;
CREATE INDEX idx_invoices_transaction_id ON invoices(payment_transaction_id);

-- For payment history
CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    recorded_by_id UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- For failed login tracking
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    attempted_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_failed_login_email_time (email, attempted_at)
);

-- For password reset token tracking
CREATE TABLE used_reset_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    used_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_used_reset_tokens_expires ON used_reset_tokens(expires_at);
```

---

## 📝 TESTING REQUIREMENTS

After fixes, implement these security tests:

### 1. Authorization Tests
```python
def test_invoice_authorization_client_cannot_view_others():
    """Client A cannot view Client B's invoices"""
    client_a_token = login_as_client_a()
    client_b_invoice_id = create_invoice_for_client_b()

    response = requests.get(
        f"/api/v1/invoices/{client_b_invoice_id}",
        headers={"Authorization": f"Bearer {client_a_token}"}
    )

    assert response.status_code == 403

def test_invoice_payment_requires_admin():
    """Only admins can record payments"""
    client_token = login_as_client()
    invoice_id = create_invoice()

    response = requests.post(
        f"/api/v1/invoices/{invoice_id}/payment",
        json={"amount": 100, "payment_method": "cash"},
        headers={"Authorization": f"Bearer {client_token}"}
    )

    assert response.status_code == 403
```

### 2. Rate Limiting Tests
```python
def test_login_rate_limit():
    """Login rate limit blocks after 5 attempts"""
    for i in range(6):
        response = requests.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrong"
        })

    assert response.status_code == 429  # Too Many Requests
```

### 3. Payment Verification Tests
```python
def test_payment_requires_valid_transaction_id():
    """Payment must be verified with gateway"""
    admin_token = login_as_admin()

    response = requests.post(
        f"/api/v1/invoices/{invoice_id}/payment",
        json={
            "amount": 100,
            "payment_method": "credit_card",
            "transaction_id": "fake_tx_id"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 400
    assert "verification failed" in response.json()["detail"]
```

---

## 🎯 ACTION PLAN

### Week 1: Critical Fixes (40 hours)
**Goal:** Make application safe for production

#### Days 1-2: Invoice Module
- [ ] Add authorization to all 14 invoice endpoints (4h)
- [ ] Implement payment gateway verification (8h)
- [ ] Add price validation against product catalog (4h)
- [ ] Implement payment idempotency (3h)
- [ ] Write authorization tests for invoices (2h)

#### Days 3-4: Authentication Module
- [ ] Implement rate limiting (3h)
- [ ] Add account lockout mechanism (4h)
- [ ] Implement refresh token rotation (3h)
- [ ] Setup Redis for token blacklist (2h)
- [ ] Write security tests for auth (2h)

#### Day 5: Products & Quotes
- [ ] Add authorization to product endpoints (2h)
- [ ] Add price change validation (3h)
- [ ] Add authorization to quote endpoints (4h)
- [ ] Add price validation to quotes (2h)

### Week 2: High Priority (13 hours)
- [ ] Fix 2FA backup codes (2h)
- [ ] Invalidate sessions on password reset (2h)
- [ ] Single-use password reset tokens (1h)
- [ ] Add password complexity (2h)
- [ ] Protect registration endpoints (1h)
- [ ] Secure PDF generation (2h)
- [ ] Fix statistics authorization (1h)
- [ ] Add modify operation checks (2h)

### Week 3: Medium & Low Priority (11 hours)
- [ ] Fix hardcoded URLs (0.5h)
- [ ] Add 2FA audit logging (1h)
- [ ] Fix session error handling (0.5h)
- [ ] Verify email token expiration (1h)
- [ ] Authorize overdue endpoint (0.5h)
- [ ] Fix quote conversion race (2h)
- [ ] Generic error messages (0.5h)
- [ ] Review TOTP window (0.25h)
- [ ] Payment history tracking (4h)

---

## 🚫 DEPLOYMENT CHECKLIST

**DO NOT DEPLOY TO PRODUCTION UNTIL:**

- [ ] All CRITICAL issues fixed and tested
- [ ] Authorization tests passing (100% coverage on critical endpoints)
- [ ] Rate limiting configured and tested
- [ ] Payment gateway integration completed and verified
- [ ] Database migrations applied
- [ ] Redis setup for token blacklist
- [ ] Security penetration testing completed
- [ ] Code review by senior developer
- [ ] All HIGH severity issues addressed

---

## 📞 INCIDENT RESPONSE

If already deployed with these vulnerabilities:

1. **IMMEDIATE:** Take invoice/payment endpoints offline
2. **URGENT:** Reset all user sessions
3. **HIGH:** Audit all financial transactions in last 30 days
4. **HIGH:** Check for unauthorized invoice creation/modification
5. **HIGH:** Verify all payment records against bank statements
6. **MEDIUM:** Notify affected customers per GDPR requirements
7. **MEDIUM:** Implement fixes per priority matrix
8. **LOW:** Conduct security training for development team

---

## 📚 References

- **OWASP Top 10 2021:** https://owasp.org/Top10/
- **OWASP API Security Top 10:** https://owasp.org/www-project-api-security/
- **PCI DSS Requirements:** https://www.pcisecuritystandards.org/
- **GDPR Compliance:** https://gdpr.eu/
- **FastAPI Security:** https://fastapi.tiangolo.com/tutorial/security/

---

**Report Generated:** 2025-12-04
**Auditor:** Claude Code Security Audit
**Next Review:** After all CRITICAL fixes implemented

