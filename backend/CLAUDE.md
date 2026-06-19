# Backend Development Rules

## Project Overview

Backend stack:

- Python 3.12+
- FastAPI
- PostgreSQL
- Redis
- JWT Authentication
- SQLAlchemy 2.0
- Alembic
- Docker

Follow enterprise-grade backend architecture.

---

## Architecture

Use Clean Architecture.

```
app/
├── api/
├── core/
├── db/
├── models/
├── schemas/
├── services/
├── repositories/
├── middleware/
├── dependencies/
├── utils/
├── ai/
├── cache/
└── tests/
```

---

## General Principles

- SOLID principles
- DRY
- KISS
- Separation of concerns
- Dependency Injection

Never place business logic inside routes.

---

## FastAPI Rules

Routes should:

- Receive request
- Validate input
- Call service
- Return response

Bad:

```python
@router.post("/")
def create_customer():
    # business logic here
    ...
```

Good:

```python
@router.post("/")
async def create_customer(
    data: CustomerCreate,
    service: CustomerService,
):
    return await service.create(data)
```

---

## Database Rules

Use:

- PostgreSQL
- SQLAlchemy 2.0
- Alembic migrations

Requirements:

- UUID primary keys
- Soft delete support
- `created_at` timestamps
- `updated_at` timestamps

Base model fields:

- `id`
- `created_at`
- `updated_at`

---

## Repository Pattern

All DB access must go through repositories.

Flow:

```
Route → Service → Repository → Database
```

Never query the database directly from routes.

---

## Authentication

Implement:

- Register
- Login
- Refresh Token
- Logout
- Profile

Use:

- JWT Access Token
- JWT Refresh Token

Store passwords using:

- bcrypt

Never store plain text passwords.

---

## Authorization

Role-Based Access Control.

Roles:

- Admin
- Manager
- User

Examples:

- Admin: full access
- Manager: customer management, dashboard
- User: limited access

---

## Validation

Use:

- Pydantic V2

Validate:

- Request body
- Query params
- Path params

Never trust client data.

---

## API Standards

Version all APIs.

Example:

```
/api/v1/auth
/api/v1/customers
/api/v1/interactions
/api/v1/dashboard
```

Response format:

```json
{
  "success": true,
  "message": "Customer created",
  "data": {}
}
```

Error format:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

## Customer Module

Required:

- Create Customer
- Update Customer
- Delete Customer
- Get Customer
- List Customers

Features:

- Search
- Pagination
- Filtering
- Sorting

---

## Interaction Module

Required:

- Create Interaction
- Update Interaction
- View Interaction
- List Interactions

Features:

- Customer mapping
- Notes storage
- Status tracking

---

## AI Integration Rules

Provider:

- OpenAI

Requirements — generate:

- Summary
- Sentiment
- Action Items
- Risks

Implementation flow:

```
AI Service → Prompt Builder → OpenAI Client → Response Parser
```

Must handle:

- Timeout
- Rate limit
- Invalid response
- AI failure fallback

Store AI results in database.

---

## Redis Rules

Cache:

- Dashboard metrics
- Customer list

Requirements:

- TTL = 5 minutes

Cache keys:

- `dashboard_metrics`
- `customer_list`

Must support:

- Cache invalidation
- Cache refresh
- No stale data

Invalidate after:

- Create
- Update
- Delete

---

## Logging

Use structured logging.

Log:

- Requests
- Errors
- Authentication events
- AI failures

Never log:

- Passwords
- Tokens
- Secrets

---

## Security

Requirements:

- JWT Authentication
- Rate Limiting
- CORS Protection
- Input Validation
- SQL Injection Protection

Always:

- Use environment variables
- Rotate secrets
- Hash passwords

---

## Docker Rules

Must include:

- FastAPI container
- PostgreSQL container
- Redis container

Use `docker-compose.yml` with services:

- `api`
- `postgres`
- `redis`

---

## Testing

Use:

- Pytest

Coverage:

- Services
- Repositories
- Authentication
- AI Integration

Minimum coverage: 80%

---

## Monitoring

Implement a health endpoint:

```
GET /health
```

Response:

```json
{
  "status": "healthy"
}
```

---

## Code Quality

Use:

- Ruff
- Black
- isort

Requirements:

- Type hints everywhere
- Docstrings for public methods
- Clean architecture
- Production-ready code

---

## Deliverable Quality

Every implementation must be:

- Scalable
- Secure
- Maintainable
- Testable
- Production-ready
