# Authentication Module - Security Audit Report

**Date:** 2025-12-04
**Module:** Authentication (13 endpoints)
**Priority:** CRITICAL
**Status:** Review Complete

---

## Executive Summary

The Authentication module has been comprehensively reviewed for security vulnerabilities. Overall, the implementation demonstrates strong security practices with **bcrypt password hashing**, **JWT-based authentication**, and **2FA support**. However, several **CRITICAL and HIGH severity issues** have been identified that require immediate attention.

### Security Score: 7.5/10

**Strengths:**
- ✅ Bcrypt password hashing implemented
- ✅ JWT tokens with expiration
- ✅ 2FA with TOTP (pyotp)
- ✅ Audit logging for security events
- ✅ User enumeration protection in password reset
- ✅ Account lockout on inactive accounts

**Critical Issues Found:** 3
**High Issues Found:** 5
**Medium Issues Found:** 4
**Low Issues Found:** 2

---

## Detailed Findings

### 🔴 CRITICAL SEVERITY

#### 1. Missing Rate Limiting on Authentication Endpoints
**File:** `backend/app/modules/auth/router.py`
**Lines:** 51-70, 154-177

**Issue:**
No rate limiting is implemented on critical authentication endpoints:
- `/auth/login` - Vulnerable to brute force attacks
- `/auth/password-reset/request` - Can be abused for email bombing
- `/auth/2fa/verify` - Can be brute-forced (6 digit codes = 1M combinations)

**Impact:**
- Attackers can perform unlimited brute force attacks on user passwords
- Credential stuffing attacks possible
- Email bombing/DoS via password reset
- 2FA bypass through brute force

**Recommendation:**
```python
# Implement rate limiting using Redis or similar
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login(...):
    pass

@router.post("/password-reset/request")
@limiter.limit("3/hour")  # 3 requests per hour per IP
async def request_password_reset(...):
    pass

@router.post("/2fa/verify")
@limiter.limit("5/5minutes")  # 5 attempts per 5 min
async def verify_2fa(...):
    pass
```

**Priority:** FIX IMMEDIATELY

---

#### 2. No Account Lockout Mechanism After Failed Login Attempts
**File:** `backend/app/modules/auth/service.py:72-158`

**Issue:**
The login function logs failed attempts but does NOT implement account lockout after N failed attempts. An attacker can make unlimited login attempts against the same account.

**Current Code:**
```python
# Only logs failed attempts but doesn't lock account
await self.audit_service.log_action(
    action=AuditAction.LOGIN_FAILED,
    ...
)
raise UnauthorizedException("Invalid email or password")
```

**Impact:**
- Unlimited password guessing per account
- No protection against persistent brute force
- Compromised passwords will eventually be discovered

**Recommendation:**
```python
class AuthService:
    async def login(self, email: str, password: str, request: Optional[Request] = None):
        # Check failed login attempts
        failed_attempts = await self.get_failed_login_count(email, minutes=30)

        if failed_attempts >= 5:
            # Lock account for 30 minutes
            await self.lock_account_temporarily(email, minutes=30)
            raise UnauthorizedException(
                "Account temporarily locked due to multiple failed login attempts. "
                "Try again in 30 minutes."
            )

        user = await self.repository.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            await self.increment_failed_login_count(email)
            raise UnauthorizedException("Invalid email or password")

        # Reset failed attempts on successful login
        await self.reset_failed_login_count(email)
        ...
```

**Priority:** FIX IMMEDIATELY

---

#### 3. Refresh Token Rotation Not Implemented
**File:** `backend/app/modules/auth/service.py:160-192`

**Issue:**
When a refresh token is used to generate a new access token, the old refresh token is NOT invalidated. This violates OAuth 2.0 best practices and allows:
- Stolen refresh tokens to be used indefinitely
- No detection of token theft
- Replay attacks with old refresh tokens

**Current Code:**
```python
async def refresh_access_token(self, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    # ... validation ...

    # Only creates new access token, doesn't rotate refresh token
    access_token = create_access_token(data={"sub": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
```

**Impact:**
- Refresh tokens valid for 7 days (default) without rotation
- Token theft detection impossible
- Compromised refresh tokens remain valid

**Recommendation:**
```python
async def refresh_access_token(self, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    # ... validation ...

    # Check if refresh token is blacklisted
    if await self.is_token_blacklisted(refresh_token):
        raise UnauthorizedException("Token has been revoked")

    user = await self.repository.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User not found")

    # Blacklist old refresh token
    await self.blacklist_token(refresh_token)

    # Generate NEW refresh token and access token
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,  # NEW TOKEN
        "token_type": "bearer",
    }
```

**Priority:** FIX IMMEDIATELY

---

### 🟠 HIGH SEVERITY

#### 4. Weak 2FA Backup Codes Generation
**File:** `backend/app/modules/auth/service.py:232-233`

**Issue:**
Backup codes are generated using `pyotp.random_base32()[:8]` which:
- Only 8 characters long (limited entropy)
- Not cryptographically secure for backup codes
- Not hashed before storage (if stored)

**Current Code:**
```python
backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]
```

**Impact:**
- Backup codes may be predictable
- If codes are stored unhashed, database breach exposes 2FA bypass

**Recommendation:**
```python
import secrets
import hashlib

def generate_backup_codes(count: int = 10) -> tuple[list[str], list[str]]:
    """Generate secure backup codes and their hashes."""
    codes = []
    hashes = []

    for _ in range(count):
        # Generate cryptographically secure 12-character code
        code = secrets.token_hex(6).upper()  # 12 hex chars
        codes.append(code)

        # Hash before storing in database
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        hashes.append(code_hash)

    return codes, hashes

# In enable_2fa:
backup_codes, backup_code_hashes = generate_backup_codes()
await self.repository.store_backup_code_hashes(user, backup_code_hashes)

return Enable2FAResponse(
    secret=secret,
    qr_code_url=qr_code_url,
    backup_codes=backup_codes,  # Show to user ONCE
)
```

**Priority:** HIGH

---

#### 5. No Session Invalidation After Password Reset
**File:** `backend/app/modules/auth/service.py:329-358`

**Issue:**
After a password reset, existing sessions are NOT invalidated. If an attacker compromised an account and the user resets their password, the attacker can still use existing access tokens until they expire.

**Current Code:**
```python
async def reset_password(self, token: str, new_password: str) -> User:
    # ... validation ...

    # Update password
    return await self.repository.update_password(user, password_hash)
    # Missing: Invalidate all sessions
```

**Impact:**
- Attacker retains access after password reset
- User believes account is secure after reset
- No forced logout from all devices

**Recommendation:**
```python
async def reset_password(self, token: str, new_password: str) -> User:
    # ... validation ...

    # Hash new password
    password_hash = get_password_hash(new_password)

    # Update password
    user = await self.repository.update_password(user, password_hash)

    # CRITICAL: Invalidate all existing sessions
    session_manager = SessionManager()
    await session_manager.invalidate_all_user_sessions(user.id)

    # Blacklist all existing tokens for this user
    await self.blacklist_all_user_tokens(user.id)

    # Log security event
    await self.audit_service.log_action(
        action=AuditAction.PASSWORD_RESET_COMPLETED,
        resource_type="auth",
        description=f"Password reset completed for {user.email}",
        user_id=user.id,
        success=True,
    )

    # Send notification email
    await self.email_service.send_password_changed_notification(user.email)

    return user
```

**Priority:** HIGH

---

#### 6. Password Reset Token Not Single-Use
**File:** `backend/app/modules/auth/service.py:329-358`

**Issue:**
Password reset tokens are JWT-based with 1-hour expiration, but there's NO mechanism to ensure they are single-use. An attacker who intercepts a reset token can use it multiple times within the 1-hour window.

**Impact:**
- Reset token can be reused multiple times
- Race condition: attacker and user can both reset password
- Email interception leads to persistent access

**Recommendation:**
```python
# Add token blacklist after use
async def reset_password(self, token: str, new_password: str) -> User:
    # Verify token
    email = verify_reset_token(token)
    if not email:
        raise UnauthorizedException("Invalid or expired reset token")

    # Check if token already used
    if await self.is_reset_token_used(token):
        raise UnauthorizedException("Reset token has already been used")

    # Get user
    user = await self.repository.get_by_email(email)
    if not user:
        raise ValidationException("User not found")

    # Mark token as used BEFORE resetting password
    await self.mark_reset_token_used(token)

    # Hash and update password
    password_hash = get_password_hash(new_password)
    return await self.repository.update_password(user, password_hash)
```

Store used tokens in Redis with 1-hour TTL to match token expiration.

**Priority:** HIGH

---

#### 7. No Password Complexity Requirements
**File:** `backend/app/modules/auth/schemas.py:51-52`

**Issue:**
Password validation only checks minimum length (8 characters). No requirements for:
- Uppercase letters
- Lowercase letters
- Numbers
- Special characters
- Common password blacklist

**Current Code:**
```python
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
```

**Impact:**
- Users can set weak passwords like "password", "12345678"
- Easier brute force attacks
- Credential stuffing with common passwords

**Recommendation:**
```python
from pydantic import field_validator
import re

class UserCreate(UserBase):
    password: str = Field(..., min_length=12, max_length=100)

    @field_validator('password')
    def validate_password_complexity(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')

        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')

        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')

        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')

        # Check against common passwords
        common_passwords = ['password', '12345678', 'qwerty', 'admin123']
        if v.lower() in common_passwords:
            raise ValueError('Password is too common')

        return v
```

**Priority:** HIGH

---

#### 8. Registration Endpoints Not Protected
**File:** `backend/app/modules/auth/registration_routes.py`

**Issue:**
Several admin-level registration management endpoints have NO authentication/authorization:
- `GET /auth/register` (line 264) - List all registrations
- `GET /auth/register/{registration_id}` (line 98) - Get any registration
- `DELETE /auth/register/{registration_id}` (line 248) - Cancel any registration

**Current Code:**
```python
@router.get("", response_model=RegistrationListResponse)
def list_registrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    # NO AUTHENTICATION CHECK!
```

**Impact:**
- Anyone can list all pending registrations
- Enumerate email addresses
- View PII (names, phone numbers)
- Cancel other users' registrations
- Serious privacy violation and GDPR breach

**Recommendation:**
```python
from app.core.dependencies import get_current_user, require_role

@router.get("", response_model=RegistrationListResponse)
def list_registrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"])),  # ADMIN ONLY
):
    # Now protected
    pass

@router.get("/{registration_id}", response_model=RegistrationResponse)
def get_registration(
    registration_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"])),  # ADMIN ONLY
):
    pass

@router.delete("/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_registration(
    registration_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin"])),  # ADMIN ONLY
):
    pass
```

**Priority:** HIGH - IMMEDIATE FIX REQUIRED

---

### 🟡 MEDIUM SEVERITY

#### 9. Hardcoded Frontend URL in Email Links
**File:** `backend/app/modules/auth/registration_routes.py:71, 171`

**Issue:**
Frontend URLs are hardcoded as `http://localhost:3000` which will break in production and doesn't use HTTPS.

**Current Code:**
```python
verification_link = f"http://localhost:3000/verify-email?registration_id={registration.id}&token={token.token}"
```

**Recommendation:**
```python
# In settings.py
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://app.example.com")

# In code
verification_link = f"{settings.FRONTEND_URL}/verify-email?registration_id={registration.id}&token={token.token}"
```

**Priority:** MEDIUM

---

#### 10. Insufficient Audit Logging for 2FA Operations
**File:** `backend/app/modules/auth/service.py:194-294`

**Issue:**
2FA enable, disable, and verification operations are NOT logged in the audit trail. This makes it impossible to detect:
- Unauthorized 2FA disabling
- 2FA bypass attempts
- Suspicious 2FA activity

**Recommendation:**
Add audit logging for:
- 2FA enabled
- 2FA disabled
- 2FA verification attempts (success/failure)
- Backup code usage

**Priority:** MEDIUM

---

#### 11. Session Validation Missing in Key Operations
**File:** `backend/app/modules/auth/router.py:216-240`

**Issue:**
When invalidating a session, if the session is not found or doesn't belong to the user, the endpoint returns a success=false in the response body with HTTP 200. This is misleading and should return proper error status codes.

**Current Code:**
```python
if not session or session.user_id != user_id:
    return {"success": False, "message": "Session not found"}  # HTTP 200
```

**Recommendation:**
```python
if not session:
    raise HTTPException(status_code=404, detail="Session not found")

if session.user_id != user_id:
    raise ForbiddenException("Cannot invalidate another user's session")
```

**Priority:** MEDIUM

---

#### 12. Email Verification Token Expiration Not Validated
**File:** `backend/app/modules/auth/registration_service.py` (assumed)

**Issue:**
Based on the routes, email verification tokens should expire after 24 hours, but there's no evidence that expiration is checked when verifying. Old tokens could potentially be used.

**Recommendation:**
Verify that email verification tokens have proper expiration validation implemented in the service layer.

**Priority:** MEDIUM

---

### 🟢 LOW SEVERITY

#### 13. Error Messages Provide Verbose Information
**File:** `backend/app/modules/auth/registration_routes.py`

**Issue:**
Some error handling returns full exception messages which could leak implementation details:

```python
except Exception as e:
    raise HTTPException(status_code=400, detail=str(e))
```

**Recommendation:**
Use generic error messages for production and log detailed errors server-side.

**Priority:** LOW

---

#### 14. TOTP Window Too Permissive
**File:** `backend/app/modules/auth/service.py:267`

**Issue:**
TOTP verification uses `valid_window=1` which accepts codes from previous and next time steps (3 codes valid at once). While this helps with clock skew, it reduces security.

**Current Code:**
```python
is_valid = totp.verify(code, valid_window=1)
```

**Recommendation:**
Consider reducing to `valid_window=0` for production, or at least document the security implications of the current setting.

**Priority:** LOW

---

## Security Checklist Status

### Authentication Endpoints

✅ **POST /auth/register**
- ✅ Email validation and uniqueness
- ⚠️ Password strength insufficient (HIGH #7)
- ✅ Password hashing with bcrypt
- ❌ No CAPTCHA/bot prevention (out of scope)
- ✅ Default role assignment

❌ **POST /auth/login**
- ✅ Password verification with bcrypt
- ❌ No rate limiting (CRITICAL #1)
- ❌ No account lockout (CRITICAL #2)
- ✅ Audit logging implemented
- ✅ User status check (active/inactive)
- ⚠️ 2FA not enforced (feature incomplete)

❌ **POST /auth/refresh**
- ✅ Token validation
- ❌ No token rotation (CRITICAL #3)
- ✅ User existence check
- ❌ No token blacklist check

⚠️ **POST /auth/2fa/enable**
- ✅ Authentication required
- ⚠️ Weak backup codes (HIGH #4)
- ✅ QR code generation
- ⚠️ No audit logging (MEDIUM #10)

⚠️ **POST /auth/2fa/verify**
- ✅ Authentication required
- ❌ No rate limiting (CRITICAL #1)
- ⚠️ TOTP window too wide (LOW #14)
- ⚠️ No audit logging (MEDIUM #10)

⚠️ **POST /auth/2fa/disable**
- ✅ Requires current 2FA code
- ✅ Authentication required
- ⚠️ No audit logging (MEDIUM #10)

⚠️ **POST /auth/password-reset/request**
- ✅ User enumeration protection
- ❌ No rate limiting (CRITICAL #1)
- ✅ Email sent with reset link
- ⚠️ Hardcoded frontend URL (MEDIUM #9)

❌ **POST /auth/password-reset/confirm**
- ✅ Token expiration (1 hour)
- ❌ Token not single-use (HIGH #6)
- ❌ Sessions not invalidated (HIGH #5)
- ✅ Password hashing

✅ **GET /auth/sessions**
- ✅ Authentication required
- ✅ User can only see own sessions

⚠️ **DELETE /auth/sessions/{session_id}**
- ✅ Authorization check (owns session)
- ⚠️ Improper error handling (MEDIUM #11)

✅ **DELETE /auth/sessions**
- ✅ Authentication required
- ✅ Invalidates all user sessions

✅ **GET /auth/security/login-history**
- ✅ Authentication required
- ✅ Pagination implemented
- ✅ User can only see own history

✅ **GET /auth/security/activity**
- ✅ Authentication required
- ✅ Pagination implemented
- ✅ User can only see own activity

---

## Priority Action Items

### Immediate (Fix This Week)

1. **Implement rate limiting on all auth endpoints** (#1)
2. **Add account lockout mechanism** (#2)
3. **Implement refresh token rotation** (#3)
4. **Protect registration management endpoints** (#8)

### High Priority (Fix This Sprint)

5. **Strengthen 2FA backup codes** (#4)
6. **Invalidate sessions after password reset** (#5)
7. **Make password reset tokens single-use** (#6)
8. **Add password complexity requirements** (#7)

### Medium Priority (Fix Next Sprint)

9. **Use environment variable for frontend URL** (#9)
10. **Add audit logging for 2FA operations** (#10)
11. **Fix session validation error responses** (#11)
12. **Verify email token expiration validation** (#12)

### Low Priority (Backlog)

13. **Generic error messages in production** (#13)
14. **Review TOTP window configuration** (#14)

---

## Additional Recommendations

### 1. Implement Token Blacklist with Redis
```python
# Token blacklist service
class TokenBlacklistService:
    def __init__(self):
        self.redis = redis.Redis(...)

    async def blacklist_token(self, token: str, expires_in: int):
        """Add token to blacklist with TTL."""
        await self.redis.setex(f"blacklist:{token}", expires_in, "1")

    async def is_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        return await self.redis.exists(f"blacklist:{token}")
```

### 2. Add Security Headers
Ensure the following headers are set:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

### 3. Implement Login Monitoring
- Track suspicious login patterns (unusual location, time, device)
- Send email notifications for logins from new devices
- Implement "Is this you?" verification for suspicious logins

### 4. Add MFA Recovery Process
- Implement secure backup code verification
- Add admin override for 2FA recovery (with strong audit trail)
- Support for multiple 2FA methods (SMS backup, security keys)

### 5. Password History
- Prevent password reuse (store hashes of last 5 passwords)
- Implement password expiration policy (optional)

---

## Compliance Considerations

### GDPR
- ⚠️ Registration list endpoint exposes PII without auth (#8)
- ✅ Audit trail for data access
- ⚠️ Need data retention policy for audit logs

### PCI DSS (if handling payments)
- ✅ Strong password hashing (bcrypt)
- ❌ No account lockout mechanism (#2)
- ❌ No session timeout implemented
- ✅ Audit logging present

### OWASP Top 10 2021
- ✅ A02: Cryptographic Failures - Bcrypt used
- ❌ A01: Broken Access Control - Registration endpoints (#8)
- ❌ A07: Identification and Authentication Failures - Multiple issues (#1, #2, #3, #6, #7)
- ✅ A09: Security Logging - Audit trail present
- ⚠️ A05: Security Misconfiguration - Hardcoded URLs (#9)

---

## Conclusion

The authentication module has a solid foundation but requires **immediate attention** to 3 critical and 5 high-severity security issues. The most pressing concerns are:

1. Lack of rate limiting enabling brute force attacks
2. No account lockout mechanism
3. Missing token rotation/blacklisting
4. Unprotected admin endpoints exposing PII

**Recommendation:** Address all CRITICAL issues before production deployment. HIGH severity issues should be fixed within the current sprint. The codebase should not be considered production-ready until at minimum items #1, #2, #3, and #8 are resolved.

---

**Next Module:** Payment & Invoice Endpoints (Critical Priority)
