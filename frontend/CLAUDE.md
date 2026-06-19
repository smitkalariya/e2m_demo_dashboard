@AGENTS.md

# Frontend Development Rules

## Project Overview

This project is built using:

- Next.js (App Router)
- TypeScript
- Redux Toolkit
- Axios
- Tailwind CSS
- React Hook Form
- Zod

All frontend code must follow modern React, TypeScript, and Next.js best practices.

---

## General Principles

- Follow SOLID principles.
- Keep components small and reusable.
- Prefer composition over inheritance.
- Avoid code duplication.
- Follow DRY and KISS principles.
- Use TypeScript strict mode.
- Never use `any` unless absolutely necessary.
- Ensure all code is production-ready.

---

## Folder Structure

```
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   └── [id]/
│   │   ├── interactions/
│   │   ├── profile/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   ├── validation/
│   │   │   └── authSlice.ts
│   │   ├── customers/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   ├── validation/
│   │   │   └── customerSlice.ts
│   │   ├── interactions/
│   │   ├── dashboard/
│   │   └── ai-insights/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── cards/
│   │   └── feedback/
│   ├── services/
│   │   ├── axios.ts
│   │   ├── auth.service.ts
│   │   ├── customer.service.ts
│   │   ├── interaction.service.ts
│   │   └── dashboard.service.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   └── rootReducer.ts
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── providers/
│   ├── middleware/
│   └── config/
├── tests/
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Next.js Rules

### App Router

- Use App Router only.
- Prefer Server Components.
- Use Client Components only when required.
- Keep page files minimal.
- Move business logic outside pages.

### Data Fetching

- Never fetch directly inside components.
- Use the service layer.
- All API calls must go through the Axios instance.

Bad:

```ts
const data = await fetch(url);
```

Good:

```ts
const customers = await customerService.getCustomers();
```

---

## TypeScript Rules

### Types

- Use interfaces for API responses.
- Use type aliases for unions.
- No implicit `any`.
- Create reusable DTO types.

Example:

```ts
interface Customer {
  id: string;
  name: string;
  email: string;
}
```

---

## Component Rules

- One responsibility per component.
- Components should be under 200 lines.
- Extract reusable UI into common components.

Example:

```
CustomerCard.tsx
CustomerList.tsx
CustomerDetails.tsx
```

---

## State Management

### Redux Toolkit

Use Redux Toolkit for:

- Authentication
- User Profile
- Global Filters
- Dashboard Metrics

Do not store:

- Form state
- Local UI state

Use local state for:

- Modal visibility
- Dropdown state
- Temporary UI data

---

## API Layer

### Axios

Create a centralized Axios client.

```
services/
├── axios.ts
├── auth.service.ts
├── customer.service.ts
├── interaction.service.ts
└── dashboard.service.ts
```

Requirements:

- Request interceptor
- Response interceptor
- JWT injection
- Error handling
- Refresh token support

---

## Forms

Use:

- React Hook Form
- Zod

Requirements:

- Client-side validation
- Error messages
- Field-level validation

Example forms:

- Login
- Register
- Customer Create
- Interaction Create

---

## Authentication

Implement:

- Login
- Register
- Logout
- Protected Routes
- Role-Based Access

Roles:

- Admin
- Manager
- User

Requirements:

- JWT storage in secure cookies
- Automatic logout on token expiry

---

## UI Standards

Requirements:

- Fully responsive
- Mobile-first
- Accessible
- Semantic HTML

Must support:

- Loading states
- Empty states
- Error states
- Skeleton loaders

---

## Error Handling

Always handle:

- API failures
- Network failures
- Unauthorized access
- Validation failures

Never expose backend errors directly.

---

## Performance Rules

- Lazy load heavy components.
- Use dynamic imports.
- Memoize expensive computations.
- Optimize images.
- Avoid unnecessary re-renders.

---

## Testing Expectations

Write tests for:

- Utility functions
- Redux slices
- Critical components

Tools:

- Jest
- React Testing Library

---

## Code Style

- ESLint
- Prettier
- Husky pre-commit hooks

Rules:

- Single responsibility
- Descriptive naming
- No commented dead code
- No `console.log` in production

---

## Security

Never:

- Store secrets in frontend
- Hardcode API URLs
- Expose sensitive data

Always:

- Use environment variables
- Sanitize user input
- Escape dynamic content

---

## Deliverable Quality

Every implementation must be:

- Type-safe
- Scalable
- Maintainable
- Reusable
- Production-ready
