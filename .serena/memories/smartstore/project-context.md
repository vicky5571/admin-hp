# SmartStore POS & Inventory — Project Context

Imported from session export: `session-ses_ff90.md` (Mumbo session `ses_ff904bd2cffe5wR3w3dWF6pWP3`).

## Product
- **Name:** SmartStore POS & Inventory (single-store smartphone shop)
- **Stack:** Node.js + NestJS + PostgreSQL + TypeORM + JWT auth
- **Currency:** Indonesian Rupiah (IDR)
- **Language:** English
- **Timeline:** 8-week MVP
- **Backend root:** `smartstore-backend/`

## Key Documents (authored in session, content lives in the session .md)
- `PRD.md` — product requirements
- `FEATURE_REQUIREMENTS.md` — detailed feature behavior
- `IMPLEMENTATION_ROADMAP.md` — 8-week phase plan
- `DATABASE_SCHEMA.md` — tables, keys, constraints (PostgreSQL)
- `API_SPEC.md` — REST endpoints
- `UAT_TEST_CASES.md` — end-to-end scenarios
- `BACKEND_FOLDER_STRUCTURE.md` — NestJS module tree

Note: these docs were printed as code blocks in the session but were NOT written to disk as files. They only exist inside `session-ses_ff90.md`.

## Roles
OWNER, ADMIN, CASHIER, INVENTORY, SUPERVISOR

## Core Entities / Modules
- auth (JWT, local strategy planned)
- users, roles
- catalog: products, brands, categories, tax_classes
- imei: imei_units (serialized inventory)
- inventory: purchase_orders, goods_receipts, stock_movements, stock_balances
- sales: sales, sale_items, payments, returns
- (reports, settings, audit_logs — planned)

## Enums
- ProductType: SERIALIZED, NON_SERIALIZED, SERVICE
- ImeiStatus: in_stock, sold, returned, defective
- PoStatus: draft, submitted, partially_received, completed, canceled
- SaleStatus: completed, voided, returned
- PaymentMethod: cash, transfer, ewallet, mixed
- MovementType: in, out, adjustment

## Current State (updated)
- Backend scaffolded; modules present on disk: auth, catalog, imei, inventory, roles, sales, users
- **`npm run typecheck`: PASSING (0 errors)** — fixed on 8/16/2026
- **`npm run build`: PASSING**
- Fixes applied:
  - `update-product.dto.ts`: changed `PartialType` import from `@nestjs/common` to `@nestjs/mapped-types` (also ran `npm install @nestjs/mapped-types` — was missing from deps)
  - `auth.module.ts`: added `?? 'replace_me'` fallback for jwt secret and `as any` cast on `expiresIn`
- Note: 2 npm vulnerabilities (1 high, 1 critical) remain — run `npm audit` to review

## Migration & Seeder Status (done)
- `src/database/migrations/0001-init-schema.ts` — creates roles, users, tax_classes, app_settings, audit_logs
- `src/database/seeds/seed.roles.ts` — OWNER, ADMIN, CASHIER, INVENTORY, SUPERVISOR
- `src/database/seeds/seed.tax-classes.ts` — VAT11_EXCLUSIVE, VAT11_INCLUSIVE, NON_TAX
- `src/database/seeds/seed.app-settings.ts` — CURRENCY_CODE, TAX_MODE, TAX_DEFAULT_RATE, RECEIPT_PREFIX, RECEIPT_FOOTER, RETURN_WINDOW_DAYS, MAX_DISCOUNT_PERCENT_CASHIER, SESSION_TIMEOUT_MINUTES, STORE_NAME, STORE_ADDRESS, STORE_PHONE
- `src/database/seeds/run-seeders.ts` + `src/database/seed-cli.ts` — orchestrator + CLI entry
- npm scripts: `migration:run`, `migration:revert`, `seed`
- New module: `src/modules/settings/entities/app-setting.entity.ts` (AppSetting entity, key-value table)

## Receiving Workflow (done)
Built the full procurement → receiving → stock pipeline:

### Entities (6 new)
- `supplier.entity.ts` — suppliers master
- `purchase-order.entity.ts` + `purchase-order-item.entity.ts` — PO with status lifecycle
- `goods-receipt.entity.ts` + `goods-receipt-item.entity.ts` + `goods-receipt-item-imei.entity.ts` — GRN with IMEI links

### Services + Controllers
- `suppliers/` — CRUD for suppliers (OWNER/ADMIN/INVENTORY)
- `purchase-orders/` — create (auto PO number), list, get, submit (DRAFT→SUBMITTED), cancel
- `goods-receipts/` — create GR with full transaction:
  - Validates PO status (must be SUBMITTED or PARTIALLY_RECEIVED)
  - Validates received qty ≤ outstanding qty per PO line
  - Serialized products: requires IMEI count == received_qty, registers IMEI units (IN_STOCK)
  - Non-serialized: single batch stock movement
  - Creates stock_movements (type=IN, ref=GRN)
  - Updates stock_balances (on_hand_qty += received)
  - Updates PO item received_qty
  - Updates PO status (PARTIALLY_RECEIVED or COMPLETED)
  - Auto-generates GRN number (GRN-YYYYMMDD-NNN)

### Migration
- `0002-inventory-schema.ts` — categories, brands, products, suppliers, imei_units, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, goods_receipt_item_imeis, stock_movements, stock_balances + indexes

### API Endpoints
- `GET/POST /suppliers`, `GET/PATCH /suppliers/:id`
- `GET/POST /purchase-orders`, `GET /purchase-orders/:id`, `POST /purchase-orders/:id/submit`, `POST /purchase-orders/:id/cancel`
- `GET/POST /goods-receipts`, `GET /goods-receipts/:id`

## POS Checkout (done)
Previous session had a basic version; now enhanced with:

### New Entity
- `customer.entity.ts` — customers table (name, phone, email), linked to sales

### Improvements to SalesService
- **Invoice number**: proper format `INV-YYYYMMDD-NNNN` (sequential per day, collision-safe fallback)
- **findAll**: full pagination + filters (dateFrom, dateTo, cashierId, status, invoiceNumber) with `ListSalesQueryDto`
- **Void sale** (`voidSale` method): reverses stock (on_hand_qty += qty), creates ADJUST_IN stock movement, restores IMEI status to IN_STOCK, sets sale status to VOIDED. Restricted to OWNER/ADMIN/SUPERVISOR.
- **Change calculation**: checkout response now includes `paidTotal` and `change` when payment > grand_total
- **Customer validation**: checks customer exists if customerId provided

### Sale Entity Update
- Added `customer` ManyToOne relation

### New DTO
- `list-sales.query.dto.ts` — pagination + filters

### Migration
- `0003-sales-schema.ts` — customers, sales, sale_items, sale_item_imeis, payments + all indexes + FKs

### API Endpoints
- `POST /sales/quote` — server-side totals preview
- `POST /sales` — finalize checkout (validates totals, stock, IMEI, payments)
- `GET /sales` — list with filters/pagination
- `GET /sales/:id` — sale detail with items/IMEIs/payments
- `GET /sales/:id/receipt` — receipt payload
- `POST /sales/:id/void` — void sale with stock reversal (OWNER/ADMIN/SUPERVISOR)

## Returns/Refunds (done)
Full return/refund workflow with validate + create + list.

### New Enums
- `RefundMethod`: CASH, BANK_TRANSFER, STORE_CREDIT
- `RestockType`: SELLABLE, DEFECTIVE
- `ReturnStatus`: COMPLETED, REJECTED

### New Entities
- `return.entity.ts` — returns header (return_number, sale_id, refund_total, refund_method, status, reason)
- `return-item.entity.ts` — return lines (sale_item_id, qty, unit_refund, line_refund_total, restock_type)
- `return-item-imei.entity.ts` — IMEI links to return items

### ReturnsService
- **validate()**: checks sale exists + COMPLETED, verifies items belong to sale, qty ≤ purchased, IMEIs are SOLD + belong to sale. Returns eligibility + maxRefundable per item.
- **create()**: transactional —
  - Auto-generates `RET-YYYYMMDD-NNNN`
  - For serialized: updates IMEI status (IN_STOCK if SELLABLE, DEFECTIVE if defective), links to return item
  - Stock movements: RETURN_IN for sellable, ADJUST_IN for defective
  - Stock balance: only updated for SELLABLE restock (defective doesn't go back to sellable on_hand)
  - Updates sale status (PARTIALLY_REFUNDED or REFUNDED)
- **findAll()**: pagination + filters (saleId, status, dateFrom, dateTo)
- **findOne()**: full relations

### API Endpoints
- `POST /returns/validate` — pre-check eligibility + max refundable (CASHIER/SUPERVISOR/ADMIN/OWNER)
- `POST /returns` — process return (SUPERVISOR/ADMIN/OWNER)
- `GET /returns` — list with filters
- `GET /returns/:id` — return detail

### Migration
- `0004-returns-schema.ts` — returns, return_items, return_item_imeis + indexes + FKs + CHECK constraints

## Reports/Dashboard (done)
Built 8 report endpoints using raw SQL queries via DataSource.

### New Module: `reports/`
- `reports.service.ts` — all report logic with raw SQL
- `reports.controller.ts` — 8 GET endpoints
- `reports.module.ts` — standalone module (no entities, uses DataSource directly)
- `dto/reports.dto.ts` — SalesSummaryQueryDto, DateRangeQueryDto, StockOnHandQueryDto, StockMovementsQueryDto

### API Endpoints (all OWNER/ADMIN, stock reports also INVENTORY)
1. `GET /reports/sales-summary` — by day/week/month, includes transaction_count, subtotal, discount, tax, grand_total
2. `GET /reports/sales-by-product` — qty_sold, net_sales, total_discount per product
3. `GET /reports/sales-by-cashier` — transaction_count, total_sales per cashier
4. `GET /reports/payment-breakdown` — by method (CASH/BANK_TRANSFER/E_WALLET)
5. `GET /reports/gross-profit` — per-product net_revenue, total_cost, gross_profit, margin_percent + summary totals
6. `GET /reports/stock-on-hand` — on_hand, reserved, stock_value, low_stock alerts + summary
7. `GET /reports/stock-movements` — paginated movement history with product/IMEI/user info
8. `GET /reports/returns-summary` — by day + by refund method, with summary totals

### Notes
- All sales-based reports filter on status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
- Date range filters (dateFrom, dateTo) supported on all relevant endpoints
- Stock-on-hand supports lowStockOnly filter and search by SKU/name
- Gross profit includes overall margin percentage
- Stock-on-hand includes total stock valuation

## Migrations Summary (4 total)
1. `0001-init-schema.ts` — roles, users, tax_classes, app_settings, audit_logs
2. `0002-inventory-schema.ts` — categories, brands, products, suppliers, imei_units, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, goods_receipt_item_imeis, stock_movements, stock_balances
3. `0003-sales-schema.ts` — customers, sales, sale_items, sale_item_imeis, payments
4. `0004-returns-schema.ts` — returns, return_items, return_item_imeis

## Frontend (done)
Monorepo layout: `admin-hp/backend/` + `admin-hp/frontend/`

### Stack
- Next.js 16 (App Router) + React 19 + TailwindCSS v4
- Auth: JWT token in localStorage, AuthContext provider
- API client: `src/lib/api.ts` with typed fetch functions + ApiError class

### Pages
| Path | Page | Features |
|---|---|---|
| `/login` | LoginPage | Auth form, redirects to dashboard on success |
| `/` | DashboardPage | Summary cards (today sales, stock value, returns) + sales table |
| `/pos` | PosPage | Full POS checkout: search products, cart with qty edit, payment method, amount, complete sale + success screen |
| `/products` | ProductsPage | Product list table (SKU, name, type, prices, status) |
| `/inventory` | InventoryPage | Stock-on-hand table with low-stock highlighting |
| `/sales` | SalesPage | Sales list with invoice, date, cashier, items, total, status |
| `/returns` | ReturnsPage | Returns list with refund total, method, status |
| `/reports` | ReportsPage | Gross profit summary, daily sales table, returns by method |

### Layout
- Sidebar navigation (Dashboard, POS, Products, Inventory, Sales, Returns, Reports)
- User info + sign out button in sidebar
- Protected: redirects to `/login` if no token
- Auth context: `useAuth()` hook provides `user`, `token`, `login()`, `logout()`, `loading`

## Database Setup (done)
- PostgreSQL 15.19 (Homebrew) initialized at `/usr/local/var/postgresql@15`
- Database `smartstore` created; superuser `postgres` password set to `postgres`
- `backend/.env` created (DB_HOST=127.0.0.1, DB_PORT=5432, DB_USER=postgres, DB_PASS=postgres, DB_NAME=smartstore, JWT_SECRET set)
- `brew services start postgresql@15` to run server (auto-starts on login)
- **All 4 migrations executed successfully** — 26 tables created (incl. migrations table)
- **All seeders executed successfully** — 5 roles, 3 tax classes, 11 app_settings
- Fixes applied during migration run:
  - `data-source.ts`: changed `export const AppDataSource` → `const AppDataSource` (only default export; TypeORM CLI requires single DataSource export). Updated `seed-cli.ts` to `import AppDataSource from './data-source'` (default import).
  - Registered `Category` and `Brand` entities in DataSource entities array (were missing, caused `Entity metadata for Product#category was not found`)

## Admin User Seeder (done)
- `src/database/seeds/seed.admin-user.ts` — creates initial OWNER + ADMIN users (idempotent, skips if exists)
- Wired into `run-seeders.ts` orchestrator (runs after roles/tax-classes/app-settings)
- Uses bcrypt (10 rounds) to hash passwords
- Accounts created:
  - **owner** / owner123 (OWNER role, email: owner@smartstore.local)
  - **admin** / admin123 (ADMIN role, email: admin@smartstore.local)

## Auth Flow Verified (done)
Tested all auth endpoints with server running on `localhost:3000` (API prefix `/api/v1`):
- `POST /auth/login` — returns JWT token + user object (id, fullName, role); updates `last_login_at`
- `GET /me` — returns authenticated user from JWT (guarded)
- `POST /auth/logout` — returns `{ loggedOut: true }` (guarded)
- `GET /users` — role-protected (OWNER/ADMIN only), returns user list with roles
- Error cases verified: wrong password → 401 Unauthorized, missing token → 401 Unauthorized
- Response envelope: `{ success, data, meta }` for success; `{ success: false, error: { code, message, details } }` for errors

## Settings Endpoints (done)
Built full settings module for key-value app_settings CRUD.

### New Module: `settings/`
- `settings.module.ts` — registers AppSetting entity, controller, service; exported in AppModule
- `settings.service.ts`:
  - `findAll()` — returns all settings as plain `{ key: value }` object (sorted by key)
  - `updateMany(dto, userId)` — bulk-updates; validates each key exists + per-key value format; sets `updatedBy` to authenticated user; returns full settings map after update
  - Per-key validators: CURRENCY_CODE (2–10 chars), TAX_MODE (EXCLUSIVE/INCLUSIVE/NONE), TAX_DEFAULT_RATE (0–100 number), RECEIPT_PREFIX (1–20 chars), RECEIPT_FOOTER (≤500 chars), RETURN_WINDOW_DAYS (int 0–365), MAX_DISCOUNT_PERCENT_CASHIER (0–100 number), SESSION_TIMEOUT_MINUTES (int 1–1440), STORE_NAME (1–160 chars), STORE_ADDRESS (≤500 chars), STORE_PHONE (≤40 chars)
- `settings.controller.ts`:
  - `GET /settings` — all authenticated staff (OWNER/ADMIN/CASHIER/INVENTORY/SUPERVISOR)
  - `PATCH /settings` — OWNER/ADMIN only; body: `{ "settings": [{ "key": "STORE_NAME", "value": "..." }] }`
- `dto/update-settings.dto.ts` — `SettingItemDto` (key/value pair) + `UpdateSettingsDto` (array of items with ValidateNested)

### Verified
- GET returns all 11 seeded settings as key-value map
- PATCH updates multiple keys at once, returns updated map
- `updated_by` correctly set to authenticated user id in DB
- Validation rejects: invalid TAX_MODE value, unknown keys, empty/missing settings array
- Auth: unauthenticated → 401, ADMIN can PATCH, role guard enforced

## Audit Logs Endpoint (done)
Built audit-logs module for querying the `audit_logs` table (created in migration 0001).

### New Module: `audit-logs/`
- `entities/audit-log.entity.ts` — AuditLog entity (id, eventTime, userId, action, entityType, entityId, metadataJson, ipAddress; ManyToOne to User)
- `dto/list-audit-logs.query.dto.ts` — extends PaginationQueryDto; filters: userId (int), action (string), entityType (string), dateFrom (ISO date), dateTo (ISO date)
- `audit-logs.service.ts` — `findAll()` with QueryBuilder: left-joins user (selects only safe fields — no passwordHash), applies all filters, paginates, orders by eventTime DESC
- `audit-logs.controller.ts` — `GET /audit-logs` (OWNER/ADMIN only, JWT + RolesGuard)
- `audit-logs.module.ts` — registers entity/controller/service

### Changes
- `app.module.ts` — registered AuditLogsModule
- `data-source.ts` — added AuditLog to entities array

### API Endpoint
- `GET /audit-logs` — paginated list with filters: `?userId=1&action=CREATE&entityType=SALE&dateFrom=ISO&dateTo=ISO&page=1&limit=20`
- Response: `{ data: [...], meta: { total, page, limit, pageCount } }`
- Each log entry includes joined `user` object (id, fullName, username, email, roleId, isActive — no passwordHash)
- Date filters compare against `event_time` column; pass ISO 8601 UTC strings (e.g. `2026-08-17T01:00:00Z`)

### Verified (12 scenarios)
- No filters: returns all 10 test rows with pagination meta
- Filter by action (CREATE → 4 results)
- Filter by userId (userId=2 → 3 results, all admin actions)
- Filter by entityType (SALE → 2 results)
- Pagination (page=1&limit=3 → 3 rows, total=10, pageCount=4)
- dateFrom filter (correct timezone-aware comparison)
- dateTo filter (correct timezone-aware comparison)
- Combined filters (userId=1&action=CREATE → 4 results)
- passwordHash NOT leaked in user relation
- Unauthenticated → 401
- ADMIN role can access
- OWNER role can access

### Test Data
Inserted 10 test audit log rows directly via SQL (LOGIN, CREATE, UPDATE, SUBMIT, VOID actions across USER, SUPPLIER, PURCHASE_ORDER, GOODS_RECEIPT, SALE, APP_SETTING entity types). Note: no audit log writing is wired into services yet — this is read-only endpoint only.

## npm Audit Fix (done)
- Upgraded `bcrypt` from 5.1.1 → 6.0.0
- bcrypt 5.x depended on `@mapbox/node-pre-gyp` → `tar@6.2.1` (critical: path traversal, symlink poisoning, DoS — 12 advisories)
- bcrypt 6.x dropped `@mapbox/node-pre-gyp` entirely (switched to `node-gyp-build`)
- Result: **0 vulnerabilities** (was 1 high + 1 critical)
- Verified: existing password hashes (created with bcrypt v5) are compatible with v6 — login still works for both owner and admin
- Typecheck + build pass clean

## Frontend Fixes (done)
Fixed multiple issues preventing the frontend from working:

### Port Conflict
- Backend stays on port 3000; frontend changed to port 3001 (`next dev -p 3001` in package.json scripts)
- `.env.local` already had `NEXT_PUBLIC_API_URL=http://localhost:3000` (correct — frontend calls backend on 3000)

### Root Page Fix
- Deleted default `src/app/page.tsx` (Next.js template "To get started, edit page.tsx")
- Root `/` route now handled by `(dashboard)/page.tsx` with auth-protected layout (redirects to `/login` if no token)

### API Client Fixes (`src/lib/api.ts`)
- Added `API_PREFIX = "/api/v1"` — all requests now hit correct backend prefix
- `apiFetch` now unwraps `json.data` from the `{ success, data, meta }` response envelope
- Error handling reads `json.error.message` (was `data.message` — didn't match backend)
- `LoginResponse` interface: `token` instead of `access_token`, `user` has `fullName` + `role` (no `username`)

### Auth Context Fix (`src/lib/auth-context.tsx`)
- `handleLogin`: reads `json.data.token` (was `data.access_token`)
- Error handling: reads `json.error.message` (was `err.message`)
- API path: `/api/v1/auth/login` (was `/auth/login` — missing prefix)

### Response Transform Interceptor Fix (`backend/src/common/interceptors/response-transform.interceptor.ts`)
- **Bug**: interceptor only extracted `data` and `meta` from payloads, discarding other top-level properties like `summary`, `period`, `byDay`, `byMethod`
- **Fix**: only flattens when BOTH `data` AND `meta` are present (paginated pattern); otherwise wraps entire payload as `data`
- This ensures report endpoints (`{ summary, data }`, `{ period, data }`, `{ summary, byDay, byMethod }`) are correctly passed through

### Verified
- Backend API: all endpoints return correct response shapes
- Frontend `/login`: renders SmartStore login form (not default template)
- Frontend `/`: auth-protected, redirects to `/login` if no token
- Frontend `/pos`, `/products`, etc.: render correctly
- Login flow: POST returns `{ token, user: { id, fullName, role } }` — matches frontend expectations
- Reports: `summary`, `period`, `byDay`, `byMethod` preserved in responses
- Pagination: `data` + `meta` still correctly extracted for paginated endpoints

### How to Run
```bash
# Terminal 1 — backend (port 3000)
cd backend && npm run start:dev

# Terminal 2 — frontend (port 3001)
cd frontend && npm run dev
# Open http://localhost:3001
```

### Login Credentials
- owner / owner123 (OWNER role)
- admin / admin123 (ADMIN role)

## Next Steps
- Wire audit log writing into services (auth login, settings update, sales void, returns, etc.)
- Build settings page in frontend
- Build audit logs page in frontend
