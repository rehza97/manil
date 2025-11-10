# Phase 2.1: Ticket Attachments - Detailed Specification

**Feature:** Ticket File Attachments
**Priority:** 🔴 CRITICAL
**Estimated Duration:** 8-10 working days
**Status:** Ready for Implementation
**Date:** November 9, 2025

---

## 📋 Feature Overview

### Purpose
Enable users (customers and agents) to attach files to tickets and replies, improving communication and documentation.

### Scope
- File upload for tickets
- File upload for ticket replies
- File preview and download
- File deletion (soft delete)
- File type and size validation
- Virus scanning (optional first phase)
- Storage abstraction (supports local or S3)

### Out of Scope (Phase 2.1)
- Online file editing/collaboration
- File compression/optimization
- Advanced file preview (for now, download-only)
- File versioning
- File sharing with external users

---

## 🗄️ Database Design

### 1. TicketAttachment Table

```sql
CREATE TABLE ticket_attachments (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    reply_id VARCHAR(36) NULLABLE REFERENCES ticket_replies(id) ON DELETE CASCADE,

    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,  -- in bytes
    mime_type VARCHAR(100) NOT NULL,

    -- Validation results
    virus_scan_status VARCHAR(20) DEFAULT 'pending',  -- pending, clean, infected
    virus_scan_timestamp TIMESTAMP WITH TIME ZONE NULLABLE,
    virus_scan_result TEXT NULLABLE,

    -- Metadata
    uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP WITH TIME ZONE NULLABLE,
    deleted_by VARCHAR(36) NULLABLE REFERENCES users(id),

    -- Indexes
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_reply_id (reply_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_created_at (created_at),
    UNIQUE INDEX idx_file_uniqueness (file_path)
);
```

### 2. FileStorage Configuration Table (Optional)

```sql
CREATE TABLE file_storage_config (
    id VARCHAR(36) PRIMARY KEY,
    storage_type VARCHAR(20),  -- 'local' or 's3'
    base_path VARCHAR(500),
    max_file_size INTEGER,  -- in bytes
    allowed_mime_types TEXT,  -- JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### 1. Upload File to Ticket

```http
POST /api/v1/tickets/{ticket_id}/attachments
Content-Type: multipart/form-data

Parameters:
- file (binary, required) - The file to upload, max 50MB
- description (string, optional) - File description

Response: 201 Created
{
    "id": "attach-123",
    "ticket_id": "ticket-456",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_by": "user-789",
    "created_at": "2025-11-09T10:00:00Z",
    "virus_scan_status": "pending"
}

Error Responses:
- 400: Invalid file type or too large
- 404: Ticket not found
- 403: Permission denied (not owner/agent)
- 413: File too large
```

### 2. Upload File to Reply

```http
POST /api/v1/tickets/{ticket_id}/replies/{reply_id}/attachments
Content-Type: multipart/form-data

Parameters:
- file (binary, required) - The file to upload

Response: 201 Created
(Same as upload to ticket)

Error Responses:
- 400, 404, 403, 413 (same as above)
```

### 3. List Attachments for Ticket

```http
GET /api/v1/tickets/{ticket_id}/attachments
Query Parameters:
- skip (int, default: 0)
- limit (int, default: 20)

Response: 200 OK
{
    "data": [
        {
            "id": "attach-123",
            "ticket_id": "ticket-456",
            "file_name": "document.pdf",
            "file_size": 1024000,
            "mime_type": "application/pdf",
            "uploaded_by": "user-789",
            "created_at": "2025-11-09T10:00:00Z"
        }
    ],
    "total": 1,
    "skip": 0,
    "limit": 20
}
```

### 4. Get Specific Attachment

```http
GET /api/v1/attachments/{attachment_id}

Response: 200 OK
{
    "id": "attach-123",
    "ticket_id": "ticket-456",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_by": "user-789",
    "created_at": "2025-11-09T10:00:00Z"
}
```

### 5. Download Attachment

```http
GET /api/v1/attachments/{attachment_id}/download

Response: 200 OK
- Content-Type: (based on mime_type)
- Content-Disposition: attachment; filename="original_name.ext"
- File binary data

Error Responses:
- 404: Attachment not found
- 403: Permission denied (no access to ticket)
- 410: File deleted
```

### 6. Delete Attachment (Soft Delete)

```http
DELETE /api/v1/attachments/{attachment_id}

Response: 204 No Content

Error Responses:
- 404: Attachment not found
- 403: Permission denied (not uploader/admin)
```

### 7. List Attachments for Reply

```http
GET /api/v1/tickets/{ticket_id}/replies/{reply_id}/attachments

Response: 200 OK
{
    "data": [ /* attachment objects */ ],
    "total": 5
}
```

---

## 🛡️ Security Requirements

### 1. File Type Validation

**Allowed MIME Types (First Phase):**
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, txt
- Images: jpg, jpeg, png, gif
- Archives: zip, 7z (optional)
- Others: csv

**Blocked MIME Types:**
- Executable: exe, bat, cmd, sh, ps1, msi
- Script: js, py, rb, php
- Web: html, htm
- Any unknown type

**Implementation:**
```python
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_FILES_PER_TICKET = 20
MAX_TOTAL_SIZE_PER_TICKET = 500 * 1024 * 1024  # 500MB
```

### 2. File Upload Security

- ✅ Validate MIME type before saving
- ✅ Validate file extension matches MIME type
- ✅ Scan uploaded file for viruses (ClamAV or VirusTotal)
- ✅ Store files outside web root
- ✅ Rename files on storage (use UUID to prevent directory traversal)
- ✅ Check file size before processing
- ✅ Limit concurrent uploads per user
- ✅ Rate limit uploads (10 files per minute per user)

### 3. Access Control

- ✅ Only ticket creator/agent can upload
- ✅ Only ticket participants can download
- ✅ Only uploader/admin can delete
- ✅ Verify ticket ownership before access
- ✅ Check soft-deleted attachments (exclude from queries)

### 4. Storage Security

- ✅ Store files with unguessable names (UUID)
- ✅ Store outside web root (not directly accessible)
- ✅ Set proper file permissions (644 for files, 755 for directories)
- ✅ Use separate storage for each ticket (ticket_id in path)
- ✅ Encrypt sensitive files (optional for Phase 2)
- ✅ Implement cleanup job for orphaned files

---

## 💾 Backend Implementation

### 1. Models (models.py)

```python
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.config.database import Base

class VirusScanStatus(str, Enum):
    """Virus scan status for uploaded files."""
    PENDING = "pending"
    CLEAN = "clean"
    INFECTED = "infected"
    QUARANTINED = "quarantined"

class TicketAttachment(Base):
    """File attachment for ticket or reply."""

    __tablename__ = "ticket_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reply_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("ticket_replies.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # File information
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Virus scan
    virus_scan_status: Mapped[str] = mapped_column(
        String(20), default=VirusScanStatus.PENDING, nullable=False
    )
    virus_scan_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    virus_scan_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    uploaded_by: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<TicketAttachment {self.id} - {self.file_name}>"
```

### 2. Schemas (schemas.py)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TicketAttachmentCreate(BaseModel):
    """Request model for uploading attachment."""
    description: Optional[str] = Field(None, max_length=500)

class TicketAttachmentUpdate(BaseModel):
    """Request model for updating attachment."""
    description: Optional[str] = Field(None, max_length=500)

class TicketAttachmentResponse(BaseModel):
    """Response model for attachment."""
    id: str
    ticket_id: str
    reply_id: Optional[str]
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: str
    virus_scan_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketAttachmentListResponse(BaseModel):
    """Response model for attachment list."""
    data: list[TicketAttachmentResponse]
    total: int
    skip: int
    limit: int
```

### 3. Repository Layer

**Key Methods:**
- `create(ticket_id, file_info, uploader_id)` - Save attachment record
- `get_by_id(attachment_id)` - Get attachment details
- `get_by_ticket(ticket_id, skip, limit)` - List ticket attachments
- `get_by_reply(reply_id)` - List reply attachments
- `update_virus_status(attachment_id, status, result)` - Update scan status
- `delete(attachment_id, deleted_by)` - Soft delete
- `count_by_ticket(ticket_id)` - Count attachments
- `get_total_size_by_ticket(ticket_id)` - Sum file sizes

### 4. Service Layer

**Key Methods:**
- `validate_file(file, filename)` - Check type, size, extension
- `upload_attachment(ticket_id, reply_id, file, current_user)` - Full upload flow
- `get_attachment(attachment_id, current_user)` - Get with access check
- `list_attachments(ticket_id, current_user, skip, limit)` - List with access check
- `download_attachment(attachment_id, current_user)` - Get file path
- `delete_attachment(attachment_id, current_user)` - Soft delete with permission
- `scan_file(file_path)` - Virus scan (optional)
- `cleanup_orphaned_files()` - Scheduled cleanup job

### 5. Router/Endpoints

**Endpoints:**
- `POST /api/v1/tickets/{ticket_id}/attachments` - Upload to ticket
- `POST /api/v1/tickets/{ticket_id}/replies/{reply_id}/attachments` - Upload to reply
- `GET /api/v1/tickets/{ticket_id}/attachments` - List by ticket
- `GET /api/v1/attachments/{attachment_id}` - Get details
- `GET /api/v1/attachments/{attachment_id}/download` - Download file
- `DELETE /api/v1/attachments/{attachment_id}` - Delete attachment

---

## 🎨 Frontend Implementation

### 1. File Upload Component

**Features:**
- Drag-and-drop zone
- Click to browse
- File validation before upload
- Progress indicator
- Error messages
- Cancel upload button

**Props:**
```typescript
interface FileUploadProps {
    ticketId: string;
    onUploadSuccess: (attachment: TicketAttachment) => void;
    onUploadError: (error: Error) => void;
    maxFileSize?: number;
    acceptedFormats?: string[];
}
```

### 2. Attachment List Component

**Features:**
- Display file list with thumbnails
- File size formatting (KB, MB, GB)
- Download button
- Delete button (conditional)
- Loading states

### 3. Integration Points

**In TicketForm:**
- Add file upload section
- Show selected files before submission
- Allow adding attachments

**In TicketDetail:**
- Display attachments list
- Show upload form in reply section
- List reply attachments

---

## 🧪 Testing Strategy

### Unit Tests (Backend)
- [ ] File validation (type, size, extension)
- [ ] Permission checks (upload, download, delete)
- [ ] MIME type detection
- [ ] File size calculation
- [ ] Soft delete verification
- [ ] Query filtering (exclude deleted)

### Integration Tests
- [ ] Upload flow (create file record + save file)
- [ ] Download flow (get file + verify access)
- [ ] Delete flow (soft delete + verify removed from list)
- [ ] Concurrent uploads
- [ ] Transaction rollback on error

### API Tests
- [ ] Upload endpoint (success, 400, 403, 413)
- [ ] Download endpoint (success, 404, 403, 410)
- [ ] List endpoint (paginated, filtered)
- [ ] Delete endpoint (success, 404, 403)

### UI Tests
- [ ] File upload component (drag, click, progress)
- [ ] Attachment list (display, actions)
- [ ] Integration in ticket forms/details

---

## 📊 Performance Considerations

### File Storage
- Store files in `storage/tickets/{ticket_id}/`
- Use UUID for filenames to prevent collisions
- Implement cleanup job for deleted files (2-week retention)

### Database Queries
- Index on `ticket_id` and `reply_id` for fast lookups
- Use pagination for attachment lists
- Consider caching attachment count per ticket

### Upload Performance
- Chunk uploads for files >10MB
- Show progress indicator
- Allow pause/resume (optional Phase 2)

---

## 📋 Implementation Checklist

### Backend Setup
- [ ] Create TicketAttachment model
- [ ] Create database migration
- [ ] Create repository layer
- [ ] Create service layer with validation
- [ ] Create API endpoints
- [ ] Implement file storage service
- [ ] Add virus scanning (optional)
- [ ] Add rate limiting
- [ ] Add access control checks

### Frontend Setup
- [ ] Create file upload component
- [ ] Create attachment list component
- [ ] Integrate into TicketForm
- [ ] Integrate into TicketDetail
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add success notifications

### Testing
- [ ] Write unit tests (20+ tests)
- [ ] Write integration tests (10+ tests)
- [ ] Write API tests (10+ tests)
- [ ] Write UI tests (8+ tests)
- [ ] Manual testing

### Documentation
- [ ] API documentation
- [ ] Feature guide
- [ ] Security considerations
- [ ] Troubleshooting guide

---

## ⏱️ Timeline

**Total Duration:** 8-10 working days

```
Day 1: Database design + Models + Migration
Day 2: Repository layer + Service layer (upload/download/delete)
Day 3: API endpoints + Validation + Error handling
Day 4: File storage integration + Permission checks
Day 5: Frontend components (upload + list)
Day 6: Frontend integration in ticket forms
Day 7-8: Testing (unit + integration + API + UI)
Day 9: Security audit + Performance testing
Day 10: Documentation + Bug fixes
```

---

## 🚀 Success Criteria

- ✅ All endpoints working correctly
- ✅ Security validations in place
- ✅ <100ms upload response (excluding actual file write)
- ✅ 0 security vulnerabilities in file handling
- ✅ 85%+ test coverage for new code
- ✅ Documentation complete
- ✅ No breaking changes to existing API

---

**Document Created:** November 9, 2025
**Status:** Ready for Implementation
**Version:** 1.0

