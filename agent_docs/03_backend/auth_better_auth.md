# Better Auth & RBAC Integration

## Goal
- Document how Better Auth and RBAC (Role-Based Access Control) are wired into this project.

## When to Use
- Adding auth-aware routes or adjusting auth behavior.
- Checking user permissions for protected operations.

## Where It Lives

### Authentication
- Auth config: `packages/auth/src/index.ts`
- Elysia plugin: `apps/server/src/plugins/auth.ts`

### Authorization (RBAC)
- Permission constants: `packages/db/src/permissions/permissions.ts`
- CASL ability builder: `packages/db/src/permissions/ability.ts`
- Backend permission plugin: `apps/server/src/plugins/permission.ts`
- Backend helpers: `apps/server/src/lib/permissions.ts`
- Frontend hook: `apps/web/src/hooks/use-ability.ts`

## Key Settings
- `basePath: "/api/auth"`
- Prisma adapter with SQLite
- Email verification via Resend (fallback logs in dev)
- OpenAPI schema extraction via `BetterAuthOpenAPI`

---

## RBAC Architecture

### Multi-Role System

⚠️ **IMPORTANT**: This is a **multi-role** system, NOT single-role.

```
User ─┬─ UserRoleAssignment ─── Role (code, permissions[], dataScope)
      ├─ UserLineBinding ─────── Line (for row-level access)
      └─ UserStationBinding ──── Station (for row-level access)
```

- Users can have **multiple roles** via the `UserRoleAssignment` junction table
- Each Role has a `permissions` field (JSON array of permission strings)
- Each Role has a `dataScope`: `"ALL"` | `"ASSIGNED_LINES"` | `"ASSIGNED_STATIONS"`
- Users have line/station bindings for row-level filtering

### Permission Point Format

Permissions follow the format `domain:action`:

```typescript
import { Permission } from "@better-app/db/permissions";

// Examples:
Permission.WO_READ          // "wo:read"
Permission.SYSTEM_USER_MANAGE  // "system:user_manage"
Permission.EXEC_TRACK_IN    // "exec:track_in"
```

See `packages/db/src/permissions/permissions.ts` for full list and `PERMISSION_GROUPS` for UI display.

### Common Mistakes

```typescript
// ❌ WRONG - session user has NO role field
if (user.role === "ADMIN") { ... }

// ❌ WRONG - session user has NO roles array
if (user.roles.includes("admin")) { ... }

// ✅ CORRECT - use requirePermission macro
.get("/admin", handler, {
  isAuth: true,
  requirePermission: Permission.SYSTEM_USER_MANAGE
})

// ✅ CORRECT - use ability for complex checks
.get("/data", ({ ability }) => {
  if (ability.can("read", "WorkOrder")) { ... }
}, { isAuth: true, loadAbility: true })
```

---

## Server Usage

### Basic Auth (Login Required)

```typescript
import { authPlugin } from "@/plugins/auth";

app
  .use(authPlugin)
  .get("/me", ({ user }) => {
    return { id: user.id, email: user.email };
  }, { isAuth: true });
```

### Permission Check (Specific Permission Required)

```typescript
import { authPlugin } from "@/plugins/auth";
import { permissionPlugin, Permission } from "@/plugins/permission";

app
  .use(authPlugin)
  .use(permissionPlugin)
  .get("/users", handler, {
    isAuth: true,
    requirePermission: Permission.SYSTEM_USER_MANAGE
  })
  // Multiple permissions (OR logic - any one is enough)
  .get("/data", handler, {
    isAuth: true,
    requirePermission: [Permission.WO_READ, Permission.RUN_READ]
  });
```

### CASL Ability (Fine-Grained Control)

```typescript
app
  .use(authPlugin)
  .use(permissionPlugin)
  .get("/workorders", ({ ability, userPermissions }) => {
    // ability: CASL MongoAbility instance
    // userPermissions: { id, roles[], lineIds[], stationIds[] }

    if (ability.can("read", "WorkOrder")) {
      // User has wo:read permission
    }

    // Row-level check with conditions
    if (ability.can("update", subject("WorkOrder", { lineId: "line-1" }))) {
      // User can update work orders on line-1
    }
  }, { isAuth: true, loadAbility: true });
```

---

## Frontend Usage

### Check Permission in Components

```typescript
import { useAbility } from "@/hooks/use-ability";
import { Permission } from "@better-app/db/permissions";

function AdminPanel() {
  const { hasPermission, isLoading } = useAbility();

  if (isLoading) return <Spinner />;

  if (!hasPermission(Permission.SYSTEM_USER_MANAGE)) {
    return <div>无权限访问</div>;
  }

  return <UserManagement />;
}
```

### Convenience Hook

```typescript
import { usePermission } from "@/hooks/use-permission";

function SettingsPage() {
  const { canManageUsers, canManageRoles } = usePermission();

  return (
    <div>
      {canManageUsers && <UserSection />}
      {canManageRoles && <RoleSection />}
    </div>
  );
}
```

### Multiple Permission Check

```typescript
const { hasAnyPermission, hasAllPermissions } = useAbility();

// OR logic - any one permission is enough
if (hasAnyPermission([Permission.WO_READ, Permission.RUN_READ])) { ... }

// AND logic - all permissions required
if (hasAllPermissions([Permission.WO_READ, Permission.WO_UPDATE])) { ... }
```

### Declarative Permission Guard (`<Can>` Component)

Use the `<Can>` component for declarative permission checks in JSX:

```typescript
import { Can } from "@/components/ability/can";
import { NoAccessCard } from "@/components/ability/no-access-card";
import { Permission } from "@better-app/db/permissions";

// Basic usage - show content if user has permission
<Can permissions={Permission.SYSTEM_USER_MANAGE}>
  <UserManagement />
</Can>

// With fallback for no permission
<Can
  permissions={Permission.SYSTEM_USER_MANAGE}
  fallback={<NoAccessCard description="需要用户管理权限" />}
>
  <UserManagement />
</Can>

// Multiple permissions with OR logic (default)
<Can permissions={[Permission.WO_READ, Permission.RUN_READ]}>
  <DataView />
</Can>

// Multiple permissions with AND logic
<Can permissions={[Permission.WO_READ, Permission.WO_UPDATE]} mode="all">
  <EditWorkOrder />
</Can>
```

---

## Adding New Permissions

1. Add to `packages/db/src/permissions/permissions.ts`:
   ```typescript
   export const Permission = {
     // ...existing
     NEW_DOMAIN_ACTION: "new_domain:action",
   } as const;
   ```

2. Add to `PERMISSION_GROUPS` for UI display.

3. Update `parsePermission()` in `ability.ts` if new domain/action patterns.

4. Re-export from `packages/db/src/permissions/index.ts` if needed.
