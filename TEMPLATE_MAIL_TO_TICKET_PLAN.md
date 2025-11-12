# Template Management UI & Mail-to-Ticket Implementation Plan

## Phase Overview
- **Phase 3 (Frontend):** Template Management UI
- **Phase 2+ (Backend):** Mail-to-Ticket System

---

## 🎨 PART 1: Template Management UI (Frontend - Phase 3)

### Architecture Overview
```
TemplatePages/
├── TemplateListPage.tsx          (main list view with filters)
├── TemplateCreatePage.tsx        (create new template form)
├── TemplateEditPage.tsx          (edit existing template)
├── TemplateDetailPage.tsx        (view template details)
└── Components/
    ├── TemplateList.tsx          (list component with actions)
    ├── TemplateForm.tsx          (form for create/edit)
    ├── TemplateDetail.tsx        (detail view)
    ├── TemplateVariableReference.tsx (variable help panel)
    ├── TemplateCategoryFilter.tsx (category filter)
    └── TemplatePreview.tsx       (preview with variable substitution)
```

### API Endpoints Integration
```
GET    /api/v1/tickets/templates
POST   /api/v1/tickets/templates
GET    /api/v1/tickets/templates/{id}
PUT    /api/v1/tickets/templates/{id}
DELETE /api/v1/tickets/templates/{id}
GET    /api/v1/tickets/templates/variables/available
POST   /api/v1/tickets/templates/preview
```

### Component Specifications

#### 1. TemplateList Component
- Display templates in table format
- Columns: Title, Category, Usage Count, Created Date, Actions
- Filtering by category
- Search by title
- Pagination
- Quick actions (Edit, Delete, Preview, Use)
- Bulk delete capability

#### 2. TemplateForm Component
- Input fields:
  - Title (required, max 255)
  - Category (dropdown)
  - Content (textarea, rich text ready)
  - Is Default (checkbox)
- Variable insertion helper
- Template preview panel
- Validation on submit
- Success/error notifications

#### 3. TemplateDetail Component
- Read-only template view
- Variable reference panel
- Usage statistics
- Created/Updated metadata
- Quick copy button
- Back to list link

#### 4. TemplateVariableReference Component
- Display all available variables
- System variables (10):
  - {{customer_name}}
  - {{customer_email}}
  - {{ticket_id}}
  - {{ticket_subject}}
  - {{ticket_status}}
  - {{ticket_priority}}
  - {{agent_name}}
  - {{agent_email}}
  - {{current_date}}
  - {{current_time}}
- Custom variables (4):
  - {{company_name}}
  - {{support_email}}
  - {{phone_number}}
  - {{website_url}}
- Copy-to-clipboard for each variable

#### 5. TemplatePreview Component
- Real-time preview with variable substitution
- Show sample values for variables
- Highlight variables in content

### Routing Structure
```
/admin/tickets/templates
  ├── /                    (TemplateListPage)
  ├── /create             (TemplateCreatePage)
  ├── /:id/edit           (TemplateEditPage)
  └── /:id                (TemplateDetailPage)
```

### State Management (Zustand)
```typescript
interface TemplateStore {
  templates: ResponseTemplate[]
  selectedTemplate: ResponseTemplate | null
  isLoading: boolean
  filters: {
    category?: string
    search?: string
    page: number
    pageSize: number
  }
  // Actions
  fetchTemplates(): void
  createTemplate(data: TemplateData): void
  updateTemplate(id: string, data: TemplateData): void
  deleteTemplate(id: string): void
  setFilters(filters: Filters): void
}
```

---

## 📧 PART 2: Mail-to-Ticket System (Backend - Phase 2+)

### System Architecture

```
MailToTicket/
├── models/
│   ├── email_account.py       (IMAP account config)
│   ├── email_message.py       (raw email storage)
│   └── email_ticket_mapping.py (email ↔ ticket links)
├── services/
│   ├── email_parser.py        (parse emails)
│   ├── imap_service.py        (IMAP client)
│   ├── webhook_handler.py     (webhook receiver)
│   ├── spam_filter.py         (spam detection)
│   ├── bounce_handler.py      (bounce processing)
│   └── email_to_ticket.py     (creation logic)
├── routers/
│   ├── email_accounts_router.py (account management)
│   ├── email_parser_router.py   (parser testing)
│   └── webhook_router.py        (webhook endpoint)
└── jobs/
    ├── email_polling_job.py   (scheduled polling)
    └── bounce_processing_job.py (process bounces)
```

### Database Models

#### EmailAccount
```python
class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: str (UUID)
    email_address: str (unique, indexed)
    imap_server: str
    imap_port: int
    username: str
    password_encrypted: str  # Encrypted with secrets
    is_active: bool
    polling_interval: int  # minutes
    last_checked: datetime
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
```

#### EmailMessage
```python
class EmailMessage(Base):
    __tablename__ = "email_messages"

    id: str (UUID)
    message_id: str  # Unique email Message-ID header
    email_account_id: str  # FK to EmailAccount
    from_email: str (indexed)
    from_name: str
    to_emails: JSON
    cc_emails: JSON
    subject: str
    body_text: str
    body_html: str
    raw_email: str  # Full RFC822 format
    is_spam: bool
    spam_score: float
    ticket_id: str (nullable, FK)  # Linked ticket
    parent_message_id: str (nullable)  # For threading
    in_reply_to: str (nullable)  # For threading
    references: JSON  # All Message-IDs in thread
    received_date: datetime
    processed_at: datetime
    created_at: datetime
```

#### EmailTicketMapping
```python
class EmailTicketMapping(Base):
    __tablename__ = "email_ticket_mappings"

    id: str (UUID)
    email_message_id: str  # FK
    ticket_id: str  # FK
    email_account_id: str  # FK
    thread_id: str  # For grouping related messages
    is_customer_reply: bool
    is_system_generated: bool
    created_at: datetime
```

#### EmailBounce
```python
class EmailBounce(Base):
    __tablename__ = "email_bounces"

    id: str (UUID)
    email_address: str
    bounce_type: str  # "permanent", "temporary", "complaint"
    bounce_reason: str
    bounced_email_id: str (nullable)
    retry_count: int
    last_retry_at: datetime
    marked_invalid: bool
    created_at: datetime
    updated_at: datetime
```

### Service Layer

#### 1. Email Parser Service
```python
class EmailParserService:
    def parse_email(raw_email: str) -> ParsedEmail:
        """Parse RFC822 email into structured format"""
        - Extract headers (From, To, CC, Subject, Message-ID, In-Reply-To, References)
        - Extract body (text & HTML)
        - Extract attachments
        - Validate sender
        - Return ParsedEmail object

    def extract_attachments(email: Message) -> List[Attachment]:
        """Extract all attachments from email"""
        - Support base64 encoding
        - Validate file types
        - Generate storage paths

    def validate_sender(from_email: str) -> bool:
        """Verify sender is customer of ticket if replying"""
```

#### 2. IMAP Service
```python
class IMAPService:
    def __init__(account: EmailAccount):
        """Initialize IMAP connection"""

    async def connect() -> None:
        """Establish secure IMAP connection"""

    async def fetch_new_emails() -> List[RawEmail]:
        """Fetch unseen emails since last check"""
        - Query UNSEEN flag
        - Handle pagination for large folders

    async def mark_as_processed(uid: str) -> None:
        """Mark email as seen"""

    async def move_to_folder(uid: str, folder: str) -> None:
        """Move email to different folder"""

    async def disconnect() -> None:
        """Close IMAP connection"""
```

#### 3. Webhook Handler Service
```python
class WebhookHandlerService:
    def handle_sendgrid_webhook(payload: dict) -> None:
        """Process SendGrid bounce/complaint webhooks"""
        - Extract bounce type
        - Update EmailBounce table
        - Mark sender as invalid if permanent

    def handle_mailgun_webhook(payload: dict) -> None:
        """Process Mailgun bounce/complaint webhooks"""

    def validate_webhook_signature(signature: str, payload: bytes) -> bool:
        """Verify webhook authenticity"""
```

#### 4. Spam Filter Service
```python
class SpamFilterService:
    def check_spam(email: ParsedEmail) -> SpamResult:
        """Analyze email for spam indicators"""
        - Check sender reputation
        - Analyze content (keywords, phishing patterns)
        - Check authentication (SPF, DKIM, DMARC)
        - Calculate spam score (0-100)
        - Return SpamResult with score and reason

    def is_autoresponder(email: ParsedEmail) -> bool:
        """Detect auto-reply/out-of-office messages"""
        - Check for Precedence: auto_reply header
        - Check X-Autoreply header
        - Check for typical auto-reply keywords
```

#### 5. Bounce Handler Service
```python
class BounceHandlerService:
    def process_bounce(bounce_email: str, bounce_type: str) -> None:
        """Handle email bounce"""
        - Create/update EmailBounce record
        - If permanent: mark customer as invalid
        - If temporary: retry with exponential backoff

    def process_complaint(email: str) -> None:
        """Handle spam complaint"""
        - Mark email as unsubscribed
        - Log complaint
```

#### 6. Email to Ticket Service
```python
class EmailToTicketService:
    async def create_ticket_from_email(email: ParsedEmail, account: EmailAccount) -> Ticket:
        """Convert email to support ticket"""

        Logic:
        1. Check if email is reply to existing ticket (In-Reply-To header)
           ✓ If yes: add as ticket reply
           ✗ If no: check for threading clues (subject match)
        2. Validate sender (must be registered customer)
        3. Create new ticket:
           - Title: email subject
           - Description: email body (convert HTML to text)
           - Category: auto-detect from subject or default
           - Priority: auto-detect if urgent/critical
           - Customer: from sender email
           - Status: OPEN
           - First Response At: now
        4. Create EmailTicketMapping
        5. Process attachments:
           - Save to storage
           - Link to ticket
        6. Move email to processed folder
        7. Send acknowledgement email

    async def add_reply_from_email(email: ParsedEmail, ticket: Ticket) -> TicketReply:
        """Add email as reply to existing ticket"""
        - Validate sender is ticket customer or assigned agent
        - Create TicketReply
        - Process attachments
        - Create EmailTicketMapping
        - Update ticket timestamps

    def match_email_to_ticket(email: ParsedEmail) -> Optional[Ticket]:
        """Find related ticket for email reply"""
        Methods:
        1. Check In-Reply-To header
        2. Check References header
        3. Parse subject for [TICKET-123] pattern
        4. Match by sender + subject keywords
```

### API Endpoints

#### Email Accounts Management
```
POST   /api/v1/email-accounts
GET    /api/v1/email-accounts
GET    /api/v1/email-accounts/{id}
PUT    /api/v1/email-accounts/{id}
DELETE /api/v1/email-accounts/{id}
POST   /api/v1/email-accounts/{id}/test-connection
POST   /api/v1/email-accounts/{id}/sync-now
```

#### Email Messages
```
GET    /api/v1/email-messages
GET    /api/v1/email-messages/{id}
GET    /api/v1/email-messages/{id}/thread
POST   /api/v1/email-messages/{id}/mark-spam
DELETE /api/v1/email-messages/{id}
```

#### Webhook Endpoints
```
POST   /api/v1/webhooks/sendgrid
POST   /api/v1/webhooks/mailgun
POST   /api/v1/webhooks/test
```

#### Parser Testing
```
POST   /api/v1/email/parse-test (upload RFC822 file)
POST   /api/v1/email/simulate-email (for testing)
```

### Background Jobs (APScheduler)

#### Email Polling Job
```python
@periodic_task(interval=minutes(5))
async def poll_email_accounts():
    """Run every 5 minutes"""
    - Get all active email accounts
    - For each account:
        - Connect to IMAP
        - Fetch new emails
        - Parse each email
        - Check for spam
        - Create tickets/replies
        - Handle errors and update last_checked
```

#### Bounce Processing Job
```python
@periodic_task(interval=hours(1))
async def process_email_bounces():
    """Run every hour"""
    - Get unresolved bounces with retry_count < 3
    - For each bounce:
        - Retry sending
        - Update retry_count
    - Mark permanently bounced addresses as invalid
```

### Configuration & Secrets

#### Settings
```python
# Email Account Encryption
EMAIL_ACCOUNT_CIPHER: str  # Encryption key for passwords

# IMAP Settings
IMAP_MAX_CONNECTIONS: int = 10
IMAP_TIMEOUT: int = 30  # seconds

# Spam Detection
SPAM_THRESHOLD: float = 0.7  # 0-1 scale
AUTO_DETECT_PRIORITY: bool = True
AUTO_DETECT_CATEGORY: bool = True

# Email Polling
EMAIL_POLLING_INTERVAL: int = 5  # minutes
EMAIL_POLL_BATCH_SIZE: int = 50

# Bounce Handling
BOUNCE_RETRY_MAX_ATTEMPTS: int = 3
BOUNCE_RETRY_BACKOFF_FACTOR: float = 2.0

# Webhook
SENDGRID_WEBHOOK_KEY: str
MAILGUN_WEBHOOK_KEY: str
```

### Error Handling Strategy

```
IMAPError → Log + Retry with backoff
ParseError → Move to error folder + Create incident ticket
SpamError → Quarantine + Log
BounceError → Mark as failed + Admin notification
TicketCreationError → Store as draft + Retry later
```

---

## Implementation Order

### Phase 3A: Template Management UI (Weeks 1-2)
1. ✅ Create TypeScript types for templates
2. Create Template service layer
3. Create Zustand store for templates
4. Create TemplateForm component
5. Create TemplateList component
6. Create TemplateDetail component
7. Create TemplateVariableReference component
8. Create Pages (List, Create, Edit, Detail)
9. Add routing
10. Add to admin navigation

### Phase 2+A: Mail-to-Ticket Backend (Weeks 2-4)
1. Create database models (EmailAccount, EmailMessage, EmailBounce)
2. Create database migrations
3. Create Email Parser Service
4. Create IMAP Service
5. Create Email to Ticket Service
6. Create Spam Filter Service
7. Create Bounce Handler Service
8. Create Email Accounts Router (CRUD)
9. Create Webhook Router
10. Add APScheduler jobs
11. Create Email Messages Router
12. Testing & refinement

### Phase 2+B: Mail-to-Ticket Frontend (Weeks 4-5)
1. Create Email Account management pages
2. Create Email Messages viewer
3. Create Email sync trigger UI
4. Add statistics/dashboard

---

## Success Criteria

### Template Management UI
- ✅ All CRUD operations working
- ✅ Variable reference accessible
- ✅ Preview working with sample data
- ✅ Category filtering working
- ✅ Responsive design
- ✅ Permission-based access (admin only)

### Mail-to-Ticket System
- ✅ Email parsing working correctly
- ✅ Automatic ticket creation from emails
- ✅ Email threading/reply detection working
- ✅ Attachment extraction & storage
- ✅ Spam filtering operational
- ✅ Bounce handling working
- ✅ IMAP polling working (every 5 minutes)
- ✅ Webhook endpoints secured
- ✅ Error handling & logging comprehensive
- ✅ Customer receives acknowledgement email

---

## Timeline Estimate

- **Template Management UI:** 5-7 days
- **Mail-to-Ticket Backend:** 12-15 days
- **Mail-to-Ticket Frontend:** 3-5 days
- **Testing & Integration:** 3-5 days

**Total:** 4-5 weeks for both features
