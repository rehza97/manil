# Module 1 (Customer Manager + KYC) - Senior Code Review

**Review Date:** 2025-10-18
**Reviewer:** Senior Engineer
**Scope:** Complete Module 1 backend & frontend implementation
**Status:** ⚠️ **CRITICAL ISSUES FOUND** - Requires immediate fixes before production

---

## Executive Summary

Module 1 implements customer management and KYC verification with **~2,200 lines of code** across backend and frontend. While the architecture follows best practices and layering principles, several **critical security and data integrity issues** were identified that must be addressed before production deployment.

**Overall Assessment:**
- ✅ **Architecture:** Excellent (proper layering, separation of concerns)
- ⚠️ **Security:** Needs Work (missing RBAC, unsafe file handling)
- ⚠️ **Data Integrity:** Needs Work (soft delete not implemented, missing validations)
- ✅ **Code Quality:** Good (clean, readable, well-structured)
- ⚠️ **Completeness:** Missing critical features (file download, proper error handling)

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. ❌ Customer Statistics Broken (BUG)
**File:** `backend/app/modules/customers/service.py:127`
```python
total = await self.repository.count_by_status(None)  # ❌ BROKEN
```

**Issue:** Repository method doesn't accept `None` for status parameter. This will crash at runtime.

**Impact:** Statistics endpoint returns 500 error
**Fix:**
```python
# In repository.py
async def count_all(self) -> int:
    """Count all customers."""
    query = select(func.count()).select_from(Customer)
    result = await self.db.execute(query)
    return result.scalar() or 0

# In service.py
total = await self.repository.count_all()
```

---

### 2. ❌ Missing RBAC/Permission Checks
**Files:** All router files

**Issue:** No permission checks on sensitive operations:
- Anyone can create/delete customers
- Anyone can verify KYC documents
- No role-based access control

**Impact:** **CRITICAL SECURITY VULNERABILITY**

**Fix:** Add permission decorators:
```python
from app.core.dependencies import require_permission
from app.core.permissions import Permission

@router.post("", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_CREATE)),
):
    ...
```

**Required Permissions:**
- `CUSTOMERS_CREATE`, `CUSTOMERS_EDIT`, `CUSTOMERS_DELETE`, `CUSTOMERS_VIEW`
- `KYC_VERIFY`, `KYC_UPLOAD`, `KYC_VIEW`

---

### 3. ❌ Soft Delete Not Implemented
**File:** `backend/app/modules/customers/repository.py:100`

**Issue:** `deleted_at` field exists but:
- Not set during deletion
- Not filtered in queries
- Hard delete still used

**Impact:** Data loss, audit trail broken, GDPR non-compliance

**Fix:**
```python
async def delete(self, customer: Customer, deleted_by: str) -> None:
    """Soft delete customer."""
    customer.deleted_at = datetime.now(timezone.utc)
    customer.deleted_by = deleted_by
    await self.db.commit()

async def get_all(self, ...) -> tuple[list[Customer], int]:
    query = select(Customer).where(Customer.deleted_at.is_(None))  # Filter deleted
    ...
```

---

### 4. ❌ Phone Number Validation Too Restrictive
**File:** `backend/app/modules/customers/schemas.py:30`

```python
phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")  # ❌ TOO STRICT
```

**Issue:** Rejects valid numbers like:
- `+1 (555) 123-4567`
- `00 44 20 7123 1234`
- `05 55 12 34 56` (French format)

**Impact:** Customer registration failures

**Fix:**
```python
phone: str = Field(..., min_length=7, max_length=20, description="Phone number")
# Validate in service layer with better logic
```

---

### 5. ❌ KYC File Download Endpoint Missing
**Files:** `kyc_router.py`, `kyc_service.py`

**Issue:** Documentation mentions download but **endpoint doesn't exist**

**Impact:** Users cannot download uploaded documents

**Fix:** Add to router:
```python
from fastapi.responses import FileResponse

@router.get("/documents/{document_id}/download")
async def download_kyc_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download KYC document file."""
    service = KYCService(db)
    document = await service.get_document(document_id)

    # Verify user has access to this customer's documents
    # ... add authorization check ...

    return FileResponse(
        path=document.file_path,
        media_type=document.mime_type,
        filename=document.file_name
    )
```

---

### 6. ❌ KYC Router URL Structure Wrong
**File:** `backend/app/modules/customers/kyc_router.py:19`

```python
router = APIRouter(prefix="/kyc", tags=["KYC"])  # ❌ WRONG
```

**Issue:** Creates endpoints like `/kyc/customers/{id}/documents` instead of `/customers/{id}/kyc/documents`

**Impact:** Inconsistent API structure, breaks frontend expectations

**Fix:**
```python
# Register under customers router with prefix
# In main.py or customers router:
customers_router.include_router(kyc_router, prefix="/{customer_id}/kyc")
```

---

### 7. ❌ Missing `updated_by` Tracking
**Files:** `repository.py:90`, `service.py:106`

**Issue:** Updates don't track who made the change

**Impact:** Audit trail incomplete

**Fix:**
```python
async def update(
    self,
    customer: Customer,
    customer_data: CustomerUpdate,
    updated_by: str  # ✅ Add this
) -> Customer:
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    customer.updated_by = updated_by  # ✅ Track updater
    await self.db.commit()
    await self.db.refresh(customer)
    return customer
```

---

### 8. ❌ No File Upload Transaction Safety
**File:** `backend/app/modules/customers/kyc_service.py:61-114`

**Issue:** If database insert fails after file is saved, orphaned file remains in storage

**Impact:** Storage bloat, data inconsistency

**Fix:**
```python
async def upload_document(...) -> KYCDocument:
    file_content = await file.read()
    file_size = len(file_content)

    # Validate first
    if file_size > self.MAX_FILE_SIZE:
        raise ValidationException("File too large")

    file_path = None
    try:
        # Save file
        file_path = self.storage.save_kyc_document(...)

        # Create DB record
        document = await self.repository.create(...)

        return document
    except Exception as e:
        # Rollback: delete file if DB failed
        if file_path:
            try:
                self.storage.delete_file(file_path)
            except:
                pass
        raise
```

---

## 🟡 MAJOR ISSUES (Should Fix Soon)

### 9. Missing Customer `state` Field
**File:** `backend/app/modules/customers/models.py`

**Issue:** Has `city`, `country`, `postal_code` but missing `state/province`

**Fix:** Add to model:
```python
state: Mapped[str | None] = mapped_column(
    String(100),
    nullable=True,
    index=True,
    doc="State or province",
)
```

---

### 10. No Virus Scanning on File Uploads
**File:** `kyc_service.py:88`

**Issue:** Files are accepted without malware scanning

**Risk:** Malware upload, storage compromise

**Recommendation:** Integrate ClamAV or similar:
```python
# Before saving
if not self.storage.scan_file(file_content):
    raise ValidationException("File failed security scan")
```

---

### 11. Performance: Statistics Uses Multiple Queries
**File:** `service.py:125-137`

**Issue:** 4 separate database queries for statistics

**Impact:** Slow response time, increased database load

**Fix:** Use single query with GROUP BY:
```python
async def get_statistics(self) -> dict:
    query = select(
        Customer.status,
        func.count(Customer.id).label('count')
    ).group_by(Customer.status)

    result = await self.db.execute(query)
    stats = {row.status: row.count for row in result}

    return {
        "total": sum(stats.values()),
        "active": stats.get(CustomerStatus.ACTIVE, 0),
        "pending": stats.get(CustomerStatus.PENDING, 0),
        "suspended": stats.get(CustomerStatus.SUSPENDED, 0),
    }
```

---

### 12. Missing KYC Expiry Date Handling
**File:** `kyc_models.py:119-125`

**Issue:** `expires_at` field exists but no automatic expiration logic

**Impact:** Expired documents remain "approved"

**Fix:** Add background job:
```python
# Run daily
async def expire_documents():
    now = datetime.now(timezone.utc)
    query = (
        update(KYCDocument)
        .where(KYCDocument.expires_at < now)
        .where(KYCDocument.status == KYCStatus.APPROVED)
        .values(status=KYCStatus.EXPIRED)
    )
    await db.execute(query)
```

---

### 13. No Duplicate Document Check
**File:** `kyc_service.py:61`

**Issue:** Can upload same document type multiple times

**Impact:** Confusion about which document is current

**Fix:**
```python
# In upload_document
existing = await self.repository.get_by_customer_and_type(
    customer_id, document_data.document_type
)
if existing and existing.status == KYCStatus.APPROVED:
    raise ValidationException(
        f"Approved {document_data.document_type} already exists"
    )
```

---

### 14. Missing Composite Indexes
**File:** `models.py`, `kyc_models.py`

**Issue:** Queries filter by multiple fields but no composite indexes

**Impact:** Slow query performance at scale

**Add to migration:**
```python
# customers table
op.create_index('idx_customers_status_type', 'customers', ['status', 'customer_type'])
op.create_index('idx_customers_deleted', 'customers', ['deleted_at'])

# kyc_documents table
op.create_index('idx_kyc_customer_status', 'kyc_documents', ['customer_id', 'status'])
op.create_index('idx_kyc_customer_type', 'kyc_documents', ['customer_id', 'document_type'])
```

---

### 15. Missing Error Logging
**All Files**

**Issue:** No logging of errors, only exception raising

**Impact:** Debugging production issues is impossible

**Fix:** Add logging:
```python
import logging
logger = logging.getLogger(__name__)

try:
    customer = await self.repository.create(...)
except Exception as e:
    logger.error(f"Failed to create customer: {e}", exc_info=True)
    raise
```

---

## 🔵 MINOR ISSUES (Nice to Have)

### 16. Hardcoded Configuration
**File:** `kyc_service.py:40-41`

```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # Hardcoded
```

**Fix:** Move to settings:
```python
# config/settings.py
KYC_MAX_FILE_SIZE: int = 10485760  # 10MB
KYC_ALLOWED_TYPES: list[str] = ["image/jpeg", "image/png", "application/pdf"]
```

---

### 17. Missing Response Schemas
**File:** `router.py:45-52`

**Issue:** Statistics endpoint returns plain dict, not a Pydantic model

**Fix:**
```python
class CustomerStatistics(BaseModel):
    total: int
    active: int
    pending: int
    suspended: int

@router.get("/statistics", response_model=CustomerStatistics)
```

---

### 18. No Input Sanitization
**Files:** All schemas

**Issue:** Text fields not sanitized for XSS

**Fix:** Add validators:
```python
from pydantic import field_validator
import bleach

class CustomerBase(BaseModel):
    name: str

    @field_validator('name')
    def sanitize_name(cls, v):
        return bleach.clean(v, strip=True)
```

---

### 19. Missing File Extension Validation
**File:** `kyc_service.py:82`

**Issue:** Only checks MIME type, not extension

**Risk:** MIME type spoofing

**Fix:**
```python
import os

allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png'}
ext = os.path.splitext(file.filename)[1].lower()
if ext not in allowed_extensions:
    raise ValidationException("Invalid file extension")
```

---

### 20. No Rate Limiting on Uploads
**File:** `kyc_router.py:22`

**Issue:** Users can spam file uploads

**Fix:** Add rate limiter:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/customers/{customer_id}/documents")
@limiter.limit("10/hour")  # 10 uploads per hour
async def upload_kyc_document(...):
```

---

## ✅ POSITIVE FINDINGS

1. **Excellent Architecture:** Proper separation of concerns (router → service → repository)
2. **Type Safety:** Full type hints throughout
3. **Async/Await:** Proper async implementation
4. **Validation:** Good use of Pydantic validators
5. **Documentation:** Most methods have clear docstrings
6. **Error Handling:** Custom exceptions used appropriately
7. **Database Design:** Proper use of indexes, foreign keys, enums
8. **Soft Delete Support:** Fields in place (just needs implementation)
9. **Audit Fields:** Complete audit trail fields
10. **Clean Code:** Readable, maintainable, follows PEP 8

---

## 📋 RECOMMENDATIONS

### Immediate Actions (Before Production):
1. ✅ Fix critical bugs (#1, #6, #7)
2. ✅ Implement RBAC/permissions (#2)
3. ✅ Implement soft delete properly (#3)
4. ✅ Add file download endpoint (#5)
5. ✅ Fix phone validation (#4)
6. ✅ Add transaction safety for uploads (#8)
7. ✅ Track `updated_by` in all updates (#7)

### Short Term (1-2 weeks):
1. Add virus scanning (#10)
2. Optimize statistics query (#11)
3. Add composite indexes (#14)
4. Implement document expiry (#12)
5. Add error logging (#15)
6. Add duplicate document check (#13)

### Long Term (1-3 months):
1. Add comprehensive unit tests (target: 80% coverage)
2. Add integration tests for critical paths
3. Implement file compression for large uploads
4. Add document OCR for automatic data extraction
5. Add audit log viewing UI
6. Implement document versioning

---

## 🧪 TESTING GAPS

**Unit Tests:** ❌ **0% coverage** - No tests found
**Integration Tests:** ❌ None
**E2E Tests:** ❌ None

**Critical Missing Tests:**
- Customer creation with duplicate email
- KYC upload with invalid file types
- Soft delete behavior
- Permission checks
- File upload rollback on error
- Pagination edge cases
- Search with SQL injection attempts

---

## 📊 CODE METRICS

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Lines | ~2,200 | - | ✅ |
| Max File Size | 260 lines | 150 | ⚠️ |
| Cyclomatic Complexity | 3.2 avg | <10 | ✅ |
| Type Coverage | 100% | 100% | ✅ |
| Test Coverage | 0% | 80% | ❌ |
| Documentation | 85% | 90% | ⚠️ |

**Files Exceeding 150 Lines:**
- `kyc_service.py` (260 lines) - Consider splitting
- `CustomerForm.tsx` (410 lines) - Consider breaking into smaller components

---

## 🎯 PRIORITY MATRIX

```
HIGH PRIORITY, HIGH IMPACT:
├── Fix statistics bug (#1)
├── Add RBAC permissions (#2)
├── Implement soft delete (#3)
└── Add file download (#5)

HIGH PRIORITY, MEDIUM IMPACT:
├── Fix phone validation (#4)
├── Add transaction safety (#8)
└── Fix KYC router URLs (#6)

MEDIUM PRIORITY, HIGH IMPACT:
├── Add virus scanning (#10)
├── Add composite indexes (#14)
└── Add error logging (#15)

LOW PRIORITY:
├── Hardcoded configs (#16)
├── Response schemas (#17)
└── Rate limiting (#20)
```

---

## 📝 CONCLUSION

Module 1 demonstrates **strong architectural foundations** with clean code and proper layering. However, **critical security and data integrity issues** prevent production deployment.

**Estimated Fix Time:**
- Critical issues: 2-3 days
- Major issues: 1 week
- Minor issues: 2-3 days
- **Total: ~2 weeks** to production-ready

**Recommendation:** **DO NOT DEPLOY** until critical issues (#1-8) are resolved.

---

**Reviewed by:** Senior Engineer
**Date:** 2025-10-18
**Next Review:** After critical fixes implemented
