# AGENTS.md — Developer & AI Agent Guide

Welcome to the **Tiffin Management System (TMS) Backend** codebase. This guide serves as the authoritative operational and architectural reference for AI agents, pair programmers, and backend engineers extending, maintaining, or refactoring this application.

---

## 1. Core Architecture Pattern

The codebase adheres strictly to a clean 5-tier architecture:

```text
Routes  ──▶  Controller  ──▶  Service  ──▶  Repository  ──▶  Model
```

### Layer Responsibilities

| Layer | File Pattern | Responsibilities | Forbidden Patterns |
| :--- | :--- | :--- | :--- |
| **Routes** | `*.routes.ts` | Define HTTP endpoints, attach authentication middleware, and apply Zod validation middlewares (`validateBody`, `validateQuery`, `validateParams`). | No business logic. No database queries. |
| **Controller** | `*.controller.ts` | Parse HTTP requests (`req.body`, `req.params`, `req.query`), call the appropriate service method, and format the response using `sendSuccess()`. | No direct DB queries. No duplicate manual validation. No raw JSON responses outside standard helpers. |
| **Service** | `*.service.ts` | Implement all domain and business rules, package balance adjustments, financial calculations, state transitions, and throw `AppError` when invariants fail. | No HTTP request/response objects (`req`, `res`). No direct HTTP status sending. |
| **Repository** | `*.repository.ts` | Encapsulate database interactions (Mongoose queries, projections, aggregations, atomic `$inc`/`$set` operations). | No business logic or complex conditional policies. |
| **Model** | `*.model.ts` | Define Mongoose schemas, TypeScript document interfaces, indexes, and schema validations. | No controllers or route bindings. |

---

## 2. Technology Stack & Key Dependencies

- **Node.js**: `v20+` / `v22+`
- **Express.js**: `5.x` (Note: `req.params` is typed as `string | string[]` — always cast route IDs as `req.params.id as string`)
- **TypeScript**: `7.x` with strict type checking enabled (`noImplicitAny`, `strictNullChecks`)
- **MongoDB & Mongoose**: Mongoose `9.x` with containerized MongoDB `5.x`
- **Validation**: Zod `4.x` (Use `issue.path.map(p => String(p)).join(".")` when mapping issues)
- **Security**: `bcryptjs` for password hashing, `jsonwebtoken` for access/refresh tokens, `crypto` for SHA-256 token hashing, `helmet`, `cors`
- **API Documentation**: Bruno collection in `api-collection/`

---

## 3. Directory Layout

```text
backend/
├── src/
│   ├── config/              # Environment (Zod-validated) & DB connection
│   │   ├── database.ts
│   │   └── env.ts
│   ├── constants/           # Centralized constants & enum values
│   │   ├── app.constants.ts
│   │   ├── error-code.constants.ts
│   │   ├── error-detail.constants.ts
│   │   ├── http-status.constants.ts
│   │   └── message.constants.ts
│   ├── errors/              # Custom AppError class
│   │   └── app-error.ts
│   ├── middlewares/         # Auth, error, not-found, and validation middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   └── validation.middleware.ts
│   ├── modules/             # Domain modules
│   │   ├── auth/            # Admin auth & refresh token rotation
│   │   ├── billing/         # Monthly bills, payments & receipts
│   │   ├── customers/       # Customer profiles & statuses
│   │   ├── dashboard/       # Real-time aggregated statistics
│   │   ├── deliveries/      # Daily delivery batching & status tracking
│   │   ├── health/          # Ping & DB health check
│   │   └── subscriptions/   # Meal package tracking, pause & resume
│   ├── scripts/             # CLI utilities (Ex., create-admin.ts)
│   ├── types/               # Global TypeScript declarations
│   ├── utils/               # JWT, password, and response formatting helpers
│   ├── app.ts               # Express application composition
│   └── server.ts            # Process bootstrap and listener
├── package.json
└── tsconfig.json
```

---

## 4. Invariants & Critical Business Rules

When implementing or modifying any feature, respect these invariants:

### 1. Meal Package Balance & Expiry
- **NEVER** calculate package expiry using calendar days.
- A package completes **only** when its `remainingQuantity` reaches `0`.
- $$\text{remainingQuantity} = \text{totalTiffins} - \text{deliveredQuantity}$$
- Balances decrement **only** upon successful delivery (`DELIVERED`).
- `PENDING`, `SKIPPED`, and `FAILED` deliveries consume **zero** balance.
- Paused days consume **zero** balance.

### 2. Delivery Deduction & Reversal Logic
- Transitioning to `DELIVERED`:
  - Check subscription status (cannot deliver for `PAUSED` or `CANCELLED`).
  - Atomically decrement `remainingQuantity` and increment `deliveredQuantity`.
  - If `remainingQuantity == 0`, transition package status to `COMPLETED` and set `completionDate`.
- Reversing from `DELIVERED` to `SKIPPED` / `FAILED` / `PENDING`:
  - Increment `remainingQuantity` and decrement `deliveredQuantity`.
  - If package was `COMPLETED`, restore its status to `ACTIVE` and clear `completionDate`.
- Transitions between non-delivered statuses (Ex. `PENDING` $\leftrightarrow$ `SKIPPED`) perform **no** balance adjustment.

### 3. Idempotency Invariants
- **Daily Deliveries**: Enforced by a compound unique index `{ customer: 1, dateString: 1 }`. Running daily generation multiple times for the same date must safely skip existing records.
- **Monthly Billing**: Enforced by a compound unique index `{ customer: 1, billingPeriod: 1 }`. Re-running billing for a month syncs newly delivered meals without creating duplicate bills.

### 4. Financial Calculations
- Compute all monetary totals on the backend. Never accept precomputed totals from client requests.
- Overpayment protection: A payment amount cannot exceed `bill.pendingAmount`.

### 5. Refresh Token Security
- Raw refresh tokens must never be persisted. Always store SHA-256 hashes using `hashToken(rawToken)`.
- Enforce token rotation on every `/auth/refresh` call.
- If a revoked token is used, trigger immediate reuse mitigation by revoking all sessions for that administrator.

---

## 5. Standard API Response Contracts

All endpoints must return responses conforming to the shared envelope structure.

### Success Envelope
Use `sendSuccess(res, payload, message, statusCode)`:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "error_code": null,
  "detail": [],
  "payload": { ... }
}
```

### Error Envelope
Thrown via `throw new AppError(message, statusCode, errorCode, detail)`:
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "detail": [
    {
      "field": "phone",
      "code": "INVALID_FORMAT",
      "message": "Please enter a valid 10-digit Indian mobile number",
      "location": "body"
    }
  ],
  "payload": null
}
```
*Note: `detail` must always be an array (never `null`).*

---

## 6. How-To Recipes for Common Engineering Tasks

### Recipe A: Adding a New Route
1. Define validator in `*.validator.ts`.
2. Implement repository query in `*.repository.ts`.
3. Implement business logic and checks in `*.service.ts`.
4. Implement handler in `*.controller.ts`.
5. Wire route in `*.routes.ts` with appropriate middlewares:
   ```typescript
   router.post(
     "/",
     authenticate,
     validateBody(createSchema),
     controller.create
   );
   ```
6. Add corresponding Bruno `.bru` request inside `api-collection/`.
7. Verify build with `npm run type-check`.

### Recipe B: Validating Query and Route Parameters
Always use `validateQuery` and `validateParams` from `validation.middleware.ts`:
```typescript
import { validateQuery, validateParams } from "../../middlewares/validation.middleware";
import { querySchema, idParamSchema } from "./my.validator";

router.get("/", validateQuery(querySchema), controller.list);
router.get("/:id", validateParams(idParamSchema), controller.getById);
```

### Recipe C: Atomic Decrement on Mongoose Model
To prevent concurrency race conditions, use atomic operations with query conditions:
```typescript
const updated = await Subscription.findOneAndUpdate(
  { _id: subscriptionId, remainingQuantity: { $gt: 0 } },
  { $inc: { remainingQuantity: -1, deliveredQuantity: 1 } },
  { new: true }
);

if (!updated) {
  throw new AppError(
    "Insufficient package balance",
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.BAD_REQUEST
  );
}
```

---

## 7. Bruno API Collection Synchronization Rule

Whenever an endpoint is created, updated, or removed:
1. Locate or create the corresponding `.bru` file inside `api-collection/<module>/`.
2. Ensure the URL uses the `{{base_url}}` variable.
3. Configure `auth: bearer` with `token: {{token}}` for protected endpoints.
4. Provide a valid, realistic JSON payload and query parameters.
5. Verify the request executes cleanly in Bruno.

---

## 8. CLI Reference Commands

```bash
# Type-check TypeScript codebase
npm --prefix backend run type-check

# Compile production JavaScript into dist/
npm --prefix backend run build

# Seed initial administrator account
npm --prefix backend run create-admin

# Start development server with file watch
npm --prefix backend run dev

# Start containerized MongoDB
docker compose up -d

# Inspect MongoDB logs
docker compose logs -f mongodb
```
