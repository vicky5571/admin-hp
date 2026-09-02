# Graph Report - admin-hp  (2026-08-31)

## Corpus Check
- 215 files · ~126,989 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1594 nodes · 3659 edges · 85 communities (62 shown, 23 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 120 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Reports & Analytics
- Procurement UI
- Frontend API & Pages
- Sales Entities
- Cashier Shifts
- POS Components
- Project Documentation
- Domain Status Enums
- Returns DTOs
- Catalog Management
- IMEI UI
- Sales UI & Audit
- Shared Enums & Audit
- Goods Receipt DTOs
- Supplier DTOs
- Frontend Dependencies
- Dashboard Analytics
- Backend App Configuration
- Settings Configuration
- Catalog Entities
- IMEI Backend
- Backend Dev Dependencies
- Authentication Backend
- Frontend Compiler Config
- Backend Runtime Dependencies
- IMEI DTOs
- Dashboard Layout & Users
- Authorization Guards
- Backend Compiler Config
- Operations Controllers
- Purchase Orders
- User Administration
- Sales API
- Sales DTOs
- Purchase Order DTOs
- Shared Query DTOs
- Users & Roles Entities
- Goods Receipt Entities
- Purchase Order Services
- Procurement Entities
- Inventory Adjustments
- Shift Operations
- Database Seeding
- Audit API
- Audit Implementation
- Stock Adjustments
- User DTOs
- Backend Scripts
- Adjustment Query DTOs
- Product Creation DTO
- Buyback DTO
- PO Payment DTO
- Product Query DTOs
- PO Query DTOs
- Frontend Static Assets
- Deployment Config
- Money & Tax Utils
- Adjustment API
- Sales Query DTOs
- Nest CLI Config
- Backend Package Metadata
- Initial Schema Migration
- Inventory Schema Migration
- Sales Schema Migration
- Returns Schema Migration
- IMEI Pricing Migration
- Receiving Fields Migration
- Shift Idempotency Migration
- IMEI Pricing Migration
- Supplier Optional Migration
- PO Payment Migration
- Salesperson Migration
- OpenCode Integration
- Backend Lint Config
- Validation Dependency
- NestJS Common
- Passport Authentication
- PDF Receipt
- Reactive Runtime
- TypeScript Dependencies
- Application Constants
- Frontend Lint Config
- Next.js Runtime Config
- PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `Roles()` - 94 edges
2. `apiFetch()` - 69 edges
3. `AuthUser` - 43 edges
4. `Product` - 42 edges
5. `User` - 39 edges
6. `Sale` - 35 edges
7. `ImeiUnit` - 34 edges
8. `CurrentUser` - 32 edges
9. `AuditLogsService` - 30 edges
10. `DateRangeQueryDto` - 27 edges

## Surprising Connections (you probably didn't know these)
- `File icon SVG asset` --relates_to--> `Next.js starter README`  [INFERRED]
  frontend/public/file.svg → frontend/README.md
- `Globe icon SVG asset` --relates_to--> `Next.js starter README`  [INFERRED]
  frontend/public/globe.svg → frontend/README.md
- `Window icon SVG asset` --relates_to--> `Next.js starter README`  [INFERRED]
  frontend/public/window.svg → frontend/README.md
- `Next.js starter README` --illustrates--> `Next wordmark SVG asset`  [INFERRED]
  frontend/README.md → frontend/public/next.svg
- `Next.js starter README` --relates_to--> `Vercel triangle SVG asset`  [INFERRED]
  frontend/README.md → frontend/public/vercel.svg

## Import Cycles
- None detected.

## Communities (85 total, 23 thin omitted)

### Community 0 - "Reports & Analytics"
Cohesion: 0.11
Nodes (17): DateRangeQueryDto, ReportPeriod, SalesSummaryQueryDto, StockMovementsQueryDto, StockOnHandQueryDto, IsDateString, IsEnum, IsOptional (+9 more)

### Community 1 - "Procurement UI"
Cohesion: 0.07
Nodes (47): CONDITION_OPTIONS, GoodsReceiptsPage(), ImeiIntakeItem, ReceiveRow, CONDITION_OPTIONS, emptyRow, ItemRow, PO_STATUSES (+39 more)

### Community 2 - "Frontend API & Pages"
Cohesion: 0.06
Nodes (45): InventoryPage(), PRODUCT_TYPES, ProductsPage(), SettingsPage(), ApiEnvelope, ApiError, ApKpiSummary, AppSettingsMap (+37 more)

### Community 3 - "Sales Entities"
Cohesion: 0.07
Nodes (37): Customer, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Payment, Column (+29 more)

### Community 4 - "Cashier Shifts"
Cohesion: 0.08
Nodes (33): CashMovementDto, CloseShiftDto, ListShiftsQueryDto, OpenShiftDto, IsEnum, IsNumber, IsOptional, IsPositive (+25 more)

### Community 5 - "POS Components"
Cohesion: 0.10
Nodes (32): PosCartTable(), PosCartTableProps, PosDiscountModal(), PosDiscountModalProps, PosHeldCartsModal(), PosHeldCartsModalProps, PosImeiPickerModal(), PosImeiPickerModalProps (+24 more)

### Community 6 - "Project Documentation"
Cohesion: 0.07
Nodes (45): REST API v1 contract, Searchable audit logs, Verified JWT authentication flow, Verified backend implementation state, SmartStore business success KPIs, Credential history purge and remote rewrite, Database migrations and seed data, Eight-week MVP delivery target (+37 more)

### Community 7 - "Domain Status Enums"
Cohesion: 0.08
Nodes (34): PaymentMethod, ProductType, RefundMethod, RestockType, ReturnStatus, SaleStatus, PRODUCT_SPECS, ProductSpec (+26 more)

### Community 8 - "Returns DTOs"
Cohesion: 0.06
Nodes (34): CreateReturnDto, CreateReturnItemDto, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString (+26 more)

### Community 9 - "Catalog Management"
Cohesion: 0.07
Nodes (19): CreateBrandDto, IsNotEmpty, IsString, CreateCategoryDto, IsNotEmpty, IsString, UpdateProductDto, ProductsController (+11 more)

### Community 10 - "IMEI UI"
Cohesion: 0.08
Nodes (31): IMEI_STATUSES, ImeiPage(), LookupResult, statusColor, PrintStocktakeSheetModal(), PrintStocktakeSheetModalProps, StocktakeItem, ProductImeisModal() (+23 more)

### Community 11 - "Sales UI & Audit"
Cohesion: 0.10
Nodes (30): ACTION_COLORS, AuditLogsPage(), PosCompletedSale(), PosCompletedSaleProps, addDays(), calcDelta(), daysAgo(), fmtCompactIDR() (+22 more)

### Community 12 - "Shared Enums & Audit"
Cohesion: 0.19
Nodes (11): ImeiStatus, MovementType, PoPaymentStatus, PoStatus, paginateMeta(), AuditLogsService, Injectable, MUTABLE_STATUSES (+3 more)

### Community 13 - "Goods Receipt DTOs"
Cohesion: 0.09
Nodes (27): CreateGoodsReceiptDto, GrImeiUnitDto, ReceiveGrItemDto, IsArray, IsDateString, IsInt, IsNumber, IsOptional (+19 more)

### Community 14 - "Supplier DTOs"
Cohesion: 0.09
Nodes (21): CreateSupplierDto, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, Type (+13 more)

### Community 15 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (33): eslint-config-next, dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next (+25 more)

### Community 16 - "Dashboard Analytics"
Cohesion: 0.12
Nodes (31): DashboardPage(), CHART_PERIODS, ChartPeriod, DAYS_OF_WEEK, daysAgo(), fmtCompactIDR(), fmtIDR(), formatChartLabel() (+23 more)

### Community 17 - "Backend App Configuration"
Cohesion: 0.07
Nodes (22): AppModule, Module, HttpExceptionFilter, ResponseTransformInterceptor, Injectable, AuthModule, Module, CatalogModule (+14 more)

### Community 18 - "Settings Configuration"
Cohesion: 0.08
Nodes (24): SettingItemDto, IsArray, IsNotEmpty, IsString, Type, ValidateNested, UpdateSettingsDto, AppSetting (+16 more)

### Community 19 - "Catalog Entities"
Cohesion: 0.12
Nodes (24): Brand, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Category, Column, CreateDateColumn (+16 more)

### Community 20 - "IMEI Backend"
Cohesion: 0.07
Nodes (24): ImeiUnit, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn (+16 more)

### Community 21 - "Backend Dev Dependencies"
Cohesion: 0.07
Nodes (29): devDependencies, eslint, @eslint/js, jest, @nestjs/cli, @nestjs/testing, ts-jest, ts-node (+21 more)

### Community 22 - "Authentication Backend"
Cohesion: 0.11
Nodes (16): AuthController, Body, Controller, Post, UseGuards, AuthService, Injectable, InjectRepository (+8 more)

### Community 23 - "Frontend Compiler Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 24 - "Backend Runtime Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, bcrypt, class-transformer, @nestjs/config, @nestjs/core, @nestjs/jwt, @nestjs/mapped-types, @nestjs/passport (+19 more)

### Community 25 - "IMEI DTOs"
Cohesion: 0.09
Nodes (17): IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, Type (+9 more)

### Community 26 - "Dashboard Layout & Users"
Cohesion: 0.11
Nodes (21): LoginPage(), DashboardLayout(), NavGroup, navigationGroups, NavItem, emptyForm, UserForm, UsersPage() (+13 more)

### Community 27 - "Authorization Guards"
Cohesion: 0.37
Nodes (6): ROLES_KEY, RoleName, JwtAuthGuard, Injectable, RolesGuard, Injectable

### Community 28 - "Backend Compiler Config"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+17 more)

### Community 29 - "Operations Controllers"
Cohesion: 0.14
Nodes (14): CurrentUser, AuthUser, Get, Body, Post, ShiftsController, Body, Controller (+6 more)

### Community 30 - "Purchase Orders"
Cohesion: 0.20
Nodes (11): Roles(), PurchaseOrdersController, Body, Controller, Delete, Get, Param, Post (+3 more)

### Community 31 - "User Administration"
Cohesion: 0.14
Nodes (10): Body, Controller, Get, Param, Patch, Post, UseGuards, UsersController (+2 more)

### Community 32 - "Sales API"
Cohesion: 0.16
Nodes (11): SalesController, Body, Controller, Get, Param, Post, Query, Res (+3 more)

### Community 33 - "Sales DTOs"
Cohesion: 0.21
Nodes (17): ArrayMinSize, CreatePaymentDto, CreateSaleDto, CreateSaleItemDto, QuoteSaleDto, QuoteSaleItemDto, IsArray, IsEnum (+9 more)

### Community 34 - "Purchase Order DTOs"
Cohesion: 0.12
Nodes (20): CreatePoItemDto, CreatePurchaseOrderDto, IsArray, IsDateString, IsInt, IsOptional, IsString, Min (+12 more)

### Community 35 - "Shared Query DTOs"
Cohesion: 0.12
Nodes (16): PaginationQueryDto, IsInt, IsOptional, Max, Min, Type, ListImeiQueryDto, IsEnum (+8 more)

### Community 36 - "Users & Roles Entities"
Cohesion: 0.17
Nodes (14): Role, Column, Entity, OneToMany, PrimaryGeneratedColumn, Column, CreateDateColumn, Entity (+6 more)

### Community 37 - "Goods Receipt Entities"
Cohesion: 0.10
Nodes (20): GoodsReceiptItem, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, GoodsReceiptItemImei (+12 more)

### Community 39 - "Procurement Entities"
Cohesion: 0.12
Nodes (16): PurchaseOrder, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn (+8 more)

### Community 40 - "Inventory Adjustments"
Cohesion: 0.12
Nodes (15): InjectRepository, StockBalance, Column, Entity, JoinColumn, PrimaryColumn, UpdateDateColumn, StockMovement (+7 more)

### Community 41 - "Shift Operations"
Cohesion: 0.22
Nodes (13): ShiftsPage(), FLOAT_PRESETS, ModalView, ShiftStatusModal(), ShiftStatusModalProps, CashierShift, closeShift(), fetchCurrentShift() (+5 more)

### Community 42 - "Database Seeding"
Cohesion: 0.24
Nodes (9): AppDataSource, runSeeders(), seedAdminUser(), seedAppSettings(), daysAgo(), seedDemoData(), ymd(), seedRoles() (+1 more)

### Community 43 - "Audit API"
Cohesion: 0.14
Nodes (11): AuditLogsController, Controller, Get, Query, UseGuards, ListAuditLogsQueryDto, IsDateString, IsInt (+3 more)

### Community 44 - "Audit Implementation"
Cohesion: 0.17
Nodes (10): AuditLogsModule, Module, InjectRepository, AuditLog, Column, Entity, JoinColumn, ManyToOne (+2 more)

### Community 45 - "Stock Adjustments"
Cohesion: 0.17
Nodes (11): Body, Post, CreateStockAdjustmentDto, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional (+3 more)

### Community 46 - "User DTOs"
Cohesion: 0.29
Nodes (12): ChangePasswordDto, CreateUserDto, ResetPasswordDto, IsBoolean, IsInt, IsOptional, IsString, MaxLength (+4 more)

### Community 47 - "Backend Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, lint, migration:revert, migration:run, seed, start:dev, start:prod (+3 more)

### Community 48 - "Adjustment Query DTOs"
Cohesion: 0.24
Nodes (8): AdjustmentType, ListAdjustmentsQueryDto, IsDateString, IsEnum, IsInt, IsOptional, IsPositive, Type

### Community 49 - "Product Creation DTO"
Cohesion: 0.22
Nodes (9): CreateProductDto, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString (+1 more)

### Community 50 - "Buyback DTO"
Cohesion: 0.22
Nodes (8): ExpressBuybackDto, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, Type

### Community 51 - "PO Payment DTO"
Cohesion: 0.22
Nodes (8): RecordPoPaymentDto, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Type

### Community 52 - "Product Query DTOs"
Cohesion: 0.25
Nodes (7): ListProductsQueryDto, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Type

### Community 53 - "PO Query DTOs"
Cohesion: 0.25
Nodes (6): ListPurchaseOrdersQueryDto, IsDateString, IsInt, IsOptional, IsString, Type

### Community 54 - "Frontend Static Assets"
Cohesion: 0.25
Nodes (8): Frontend Claude rules alias, File icon SVG asset, Globe icon SVG asset, Next wordmark SVG asset, Vercel triangle SVG asset, Window icon SVG asset, Next.js version-aware agent rules, Next.js starter README

### Community 55 - "Deployment Config"
Cohesion: 0.25
Nodes (7): root, framework, root, rewrites, services, backend, frontend

### Community 56 - "Money & Tax Utils"
Cohesion: 0.52
Nodes (5): calcPercentAmount(), sumAmounts(), toCents(), calcExclusiveTax(), calcInclusiveTax()

### Community 57 - "Adjustment API"
Cohesion: 0.29
Nodes (5): AdjustmentsController, Controller, Get, Query, UseGuards

### Community 58 - "Sales Query DTOs"
Cohesion: 0.29
Nodes (6): ListSalesQueryDto, IsDateString, IsInt, IsOptional, IsString, Type

### Community 59 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 60 - "Backend Package Metadata"
Cohesion: 0.40
Nodes (4): description, name, private, version

### Community 72 - "OpenCode Integration"
Cohesion: 0.50
Nodes (3): plugin, $schema, @dietrichgebert/ponytail

## Knowledge Gaps
- **219 isolated node(s):** `eslint`, `tseslint`, `$schema`, `collection`, `sourceRoot` (+214 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Roles()` connect `Purchase Orders` to `Reports & Analytics`, `Sales API`, `Cashier Shifts`, `Returns DTOs`, `Catalog Management`, `Audit API`, `Stock Adjustments`, `Goods Receipt DTOs`, `Supplier DTOs`, `Settings Configuration`, `IMEI DTOs`, `Authorization Guards`, `User Administration`, `Operations Controllers`, `Adjustment API`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `User` connect `Users & Roles Entities` to `Sales Entities`, `Cashier Shifts`, `Domain Status Enums`, `Procurement Entities`, `Inventory Adjustments`, `Audit Implementation`, `Stock Adjustments`, `Shared Enums & Audit`, `Settings Configuration`, `IMEI Backend`, `Authentication Backend`, `Authorization Guards`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `CashMovement` connect `Cashier Shifts` to `Sales Entities`, `Users & Roles Entities`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `eslint`, `tseslint`, `$schema` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reports & Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.11298701298701298 - nodes in this community are weakly interconnected._
- **Should `Procurement UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07467532467532467 - nodes in this community are weakly interconnected._
- **Should `Frontend API & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05725490196078432 - nodes in this community are weakly interconnected._