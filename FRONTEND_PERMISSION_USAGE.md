<!-- PERMISSION SYSTEM - FRONTEND USAGE EXAMPLES -->

# Permission System - Frontend Usage Guide

## Quick Reference

This guide shows how to use the permission system to control what employees can see and do in the application.

---

## 1. Check if User Can Access a Module

Use `canAccessModule()` to determine if entire sections should be visible.

### In Template (Most Common)
```vue
<template>
  <div>
    <!-- Show Insurance section only if user has access -->
    <section v-if="permissions.canAccessModule('insuranceModule')">
      <h2>Insurance Management</h2>
      <!-- Insurance content here -->
    </section>

    <!-- Show Reports section only if user has access -->
    <section v-else-if="permissions.canAccessModule('reportsModule')">
      <h2>Reports</h2>
      <!-- Reports content here -->
    </section>

    <!-- Show message if no modules -->
    <div v-else>
      <p>You don't have access to any modules.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
</script>
```

### In Script
```typescript
import { usePermissions } from '@/composables/usePermissions'

export default {
  setup() {
    const permissions = usePermissions()

    // Check if user can see insurance module
    if (permissions.canAccessModule('insuranceModule')) {
      // Show insurance features
      console.log('User can access insurance')
    }

    return { permissions }
  }
}
```

---

## 2. Check Granular Permissions (Specific Actions)

Use `hasPermission()` to control buttons/actions, not sections.

### Example: Hide/Show Edit Button
```vue
<template>
  <div class="insurance-item">
    <h3>{{ item.name }}</h3>
    <button>View Details</button>

    <!-- Show edit button only if user has permission -->
    <button 
      v-if="permissions.hasPermission('editInsurance')"
      @click="editItem"
    >
      Edit
    </button>

    <!-- Show delete button only if user has permission -->
    <button 
      v-if="permissions.hasPermission('deleteInsurance')"
      @click="deleteItem"
      class="btn-danger"
    >
      Delete
    </button>

    <!-- Show locked message if no edit permission -->
    <p v-if="!permissions.hasPermission('editInsurance')" class="text-muted">
      Read-only access (Contact admin to edit)
    </p>
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

const editItem = async () => {
  // Only gets here if user had permission
  // But also verify on backend!
}

const deleteItem = async () => {
  // Only gets here if user had permission
  // But also verify on backend!
}
</script>
```

### Example: Conditional Form Fields
```vue
<template>
  <form @submit.prevent="submitForm">
    <input v-model="form.name" type="text" placeholder="Insurance Name" />

    <!-- Show edit fields only if user has edit permission -->
    <fieldset v-if="permissions.hasPermission('editInsurance')" :disabled="false">
      <input v-model="form.description" type="text" placeholder="Description" />
      <textarea v-model="form.notes"></textarea>
    </fieldset>

    <!-- If no permission, show disabled fieldset with message -->
    <fieldset v-else :disabled="true">
      <input :value="form.description" type="text" disabled />
      <p class="text-muted">Read-only mode</p>
    </fieldset>

    <button v-if="permissions.hasPermission('editInsurance')">Save Changes</button>
    <button v-else disabled>You don't have permission to edit</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
const form = ref({
  name: '',
  description: '',
  notes: ''
})

const submitForm = async () => {
  // Frontend checks permission above
  // Backend MUST also verify permission on API
}
</script>
```

---

## 3. Check Multiple Permissions

### AND Logic - User needs ALL permissions
```typescript
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// User must have BOTH permissions to proceed
if (permissions.hasAllPermissions(['editInsurance', 'deleteInsurance'])) {
  // Show advanced features that require both permissions
}
```

### OR Logic - User needs AT LEAST ONE permission
```typescript
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// User needs at least one of these permissions
if (permissions.hasAnyPermission(['editInsurance', 'editSLI', 'editGIS'])) {
  // Show "Edit" menu
}
```

---

## 4. Admin Override

Admins have access to everything automatically.

```vue
<template>
  <div>
    <!-- This shows for ALL admin users -->
    <div v-if="permissions.isAdmin.value" class="admin-panel">
      <h2>Admin Settings</h2>
      <!-- Admin features -->
    </div>

    <!-- For non-admin users, check specific permissions -->
    <div v-else>
      <section v-if="permissions.canAccessModule('insuranceModule')">
        Insurance
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// isAdmin is a computed property
console.log(permissions.isAdmin.value) // true for admins
</script>
```

---

## 5. Show What User CAN Access

Useful for creating dashboards or "What's available to me?" pages.

```vue
<template>
  <div>
    <h2>My Available Modules</h2>
    <ul>
      <li v-for="module in permissions.getAccessibleModules()" :key="module">
        {{ module }}
      </li>
    </ul>

    <h2>My Permissions</h2>
    <ul>
      <li v-for="perm in permissions.getMyPermissions()" :key="perm.id">
        {{ perm.name }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
</script>
```

---

## 6. Disable Features Gracefully

Don't just hide buttons - explain WHY user can't access.

```vue
<template>
  <div>
    <!-- Good: Show disabled button with reason -->
    <div v-if="!permissions.hasPermission('deleteInsurance')" class="card-warning">
      <p>⚠️ Deletion not allowed</p>
      <p class="text-small">You don't have permission to delete insurance records.</p>
      <button disabled>Delete (Contact admin)</button>
    </div>

    <!-- If they have permission -->
    <div v-else class="card-danger">
      <p>⚠️ Delete this insurance record?</p>
      <button @click="deleteItem" class="btn-danger">
        Delete Permanently
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
</script>
```

---

## 7. In Sidebar/Navigation

The sidebar already uses `getVisibleModules()` to filter modules. It shows only modules the user can access.

```vue
<!-- This is already implemented in AppSidebar.vue -->
<template>
  <nav>
    <div v-for="module in visibleModules" :key="module.label">
      <RouterLink :to="module.path">
        {{ module.label }}
      </RouterLink>
      <!-- Child items are also filtered by permission -->
      <ul v-if="module.children">
        <li v-for="child in module.children" :key="child.label">
          <RouterLink :to="child.path">
            {{ child.label }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
```

---

## 8. Table Actions Column

```vue
<template>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td>{{ item.name }}</td>
        <td>{{ item.status }}</td>
        <td class="actions">
          <!-- Always show View button -->
          <button @click="viewItem(item)">View</button>

          <!-- Conditional Edit button -->
          <button 
            v-if="permissions.hasPermission('editInsurance')"
            @click="editItem(item)"
            class="btn-primary"
          >
            Edit
          </button>
          <span v-else class="text-muted">—</span>

          <!-- Conditional Delete button -->
          <button 
            v-if="permissions.hasPermission('deleteInsurance')"
            @click="deleteItem(item)"
            class="btn-danger"
          >
            Delete
          </button>
          <span v-else class="text-muted">—</span>

          <!-- Show export only if has permission -->
          <button 
            v-if="permissions.hasPermission('exportMonthlyReport')"
            @click="exportItem(item)"
            class="btn-secondary"
          >
            Export
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
</script>
```

---

## 9. Modals/Dialogs Based on Permissions

```vue
<template>
  <div>
    <!-- Show Edit Modal only if user has permission -->
    <EditModal 
      v-if="permissions.hasPermission('editInsurance')"
      :item="selectedItem"
      @save="onSave"
    />

    <!-- Show Read-Only Modal if no permission -->
    <ViewModal 
      v-else-if="showModal"
      :item="selectedItem"
      read-only
    />
  </div>
</template>

<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()
</script>
```

---

## 10. API Calls with Permission Checks

```typescript
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// Function to edit insurance
const editInsurance = async (insuranceId: string, data: any) => {
  // Frontend check - prevent API call if user doesn't have permission
  if (!permissions.hasPermission('editInsurance')) {
    console.error('You don\'t have permission to edit insurance')
    throw new Error('Permission denied')
  }

  try {
    // Make API call
    const response = await fetch(`/api/insurance/${insuranceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    // Backend will also check permissions and return 403 if unauthorized
    if (response.status === 403) {
      throw new Error('Backend denied: insufficient permissions')
    }

    return await response.json()
  } catch (error) {
    console.error('Edit failed:', error)
    throw error
  }
}
```

---

## 11. Computed Properties for Permissions

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

// Computed property for checking if user can edit
const canEdit = computed(() => permissions.hasPermission('editInsurance'))

// Computed property for checking if user can manage
const canManage = computed(() => 
  permissions.hasAllPermissions(['editInsurance', 'deleteInsurance'])
)

// Computed property for what user can do
const myCapabilities = computed(() => ({
  view: true, // Everyone can view
  edit: permissions.hasPermission('editInsurance'),
  delete: permissions.hasPermission('deleteInsurance'),
  export: permissions.hasPermission('exportMonthlyReport'),
}))
</script>

<template>
  <div>
    <!-- Use computed in template -->
    <button :disabled="!canEdit">Edit</button>
    <button :disabled="!canManage">Advanced Options</button>

    <!-- Or use capabilities object -->
    <div v-if="myCapabilities.export">
      <button @click="exportData">Export Report</button>
    </div>
  </div>
</template>
```

---

## Important Rules ⚠️

### 1. **Always Verify on Backend Too!**
```typescript
// ❌ BAD: Only checking frontend
const deleteItem = () => {
  if (permissions.hasPermission('deleteInsurance')) {
    // Frontend said yes, so let's delete
    deleteAPI(itemId)
  }
}

// ✅ GOOD: Frontend prevents unnecessary calls, backend validates
const deleteItem = () => {
  if (permissions.hasPermission('deleteInsurance')) {
    // Frontend check passed, but backend will also verify
    deleteAPI(itemId)  // Backend returns 403 if unauthorized
  }
}
```

### 2. **Never Trust Frontend Permission Checks**
- Employees can inspect network requests
- Employees can manipulate frontend code
- **Always validate permissions on backend API endpoints**

### 3. **Permission Naming Consistency**
- Use exact names from `src/utils/permissions.constants.ts`
- Backend must return same permission names
- Case-sensitive: `viewInsurance` ≠ `ViewInsurance`

### 4. **Module vs Permission**
- **Module**: Major feature section (Insurance, Payroll, Reports)
  - Controls if user can even SEE the section
  - Used for sidebar/navigation filtering
  - Use: `canAccessModule()`

- **Permission**: Granular action (view, edit, delete)
  - Controls what user CAN DO within a module
  - Used for button/field visibility
  - Use: `hasPermission()`

---

## Components Already Using Permissions

These components already have permission checks implemented:

1. **AppSidebar.vue** - Shows only modules user can access
   - Uses: `getVisibleModules()`
   - Filters based on `modules` array from backend

2. **Route Guards** (`router/index.ts`) - Prevents unauthorized navigation
   - Uses: `MODULE_REQUIREMENTS` mapping
   - Redirects to `/unauthorized` if no module access

---

## Common Patterns

### Pattern 1: Action Buttons
```vue
<template>
  <!-- View is always allowed -->
  <button @click="view">View</button>

  <!-- Edit only if permission -->
  <button v-if="permissions.hasPermission('editInsurance')" @click="edit">
    Edit
  </button>

  <!-- Delete only if permission -->
  <button v-if="permissions.hasPermission('deleteInsurance')" @click="delete">
    Delete
  </button>
</template>
```

### Pattern 2: Whole Section Access
```vue
<template>
  <div v-if="permissions.canAccessModule('insuranceModule')">
    <!-- Insurance section with all content -->
  </div>
</template>
```

### Pattern 3: Feature Availability
```vue
<template>
  <div>
    <feature-card 
      title="Export"
      :available="permissions.hasPermission('exportMonthlyReport')"
    />
  </div>
</template>
```

---

## Debugging Permissions

Open browser console and check:

```typescript
// Check if user is logged in
localStorage.getItem('token')

// Check user data
JSON.parse(localStorage.getItem('auth_user'))

// Check modules in auth store
useAuthStore().modules

// Check permissions in auth store
useAuthStore().permissions

// Check if user is admin
usePermissions().isAdmin.value

// Check if user can access insurance
usePermissions().canAccessModule('insuranceModule')

// Check if user can edit insurance
usePermissions().hasPermission('editInsurance')
```

---

## Frontend Files Reference

| File | Purpose |
|------|---------|
| `src/composables/usePermissions.ts` | Permission checking functions |
| `src/store/auth.store.ts` | Stores modules & permissions from backend |
| `src/router/index.ts` | Route guards that check permissions |
| `src/modules/index.ts` | Module filtering for sidebar |
| `src/utils/permissions.constants.ts` | Module & permission name constants |
| `src/services/api/auth.api.ts` | Login API calls |
| `src/components/layout/AppSidebar.vue` | Sidebar with permission-filtered modules |

---

## When to Use What

| Scenario | Use This | Function |
|----------|----------|----------|
| Show/hide entire section | Module | `canAccessModule()` |
| Show/hide edit button | Permission | `hasPermission()` |
| Show/hide delete button | Permission | `hasPermission()` |
| Check multiple required permissions | Permissions | `hasAllPermissions()` |
| Check at least one permission | Permissions | `hasAnyPermission()` |
| Check if user is admin | Role | `isAdmin.value` |
| Get user's role name | Role | `getUserRole()` |
| List what user can access | Both | `getAccessibleModules()` |
| List what user can do | Permissions | `getMyPermissions()` |

---

## Next Steps

1. ✅ Permission system is implemented
2. ⏳ Backend team needs to implement database & API
3. ⏳ Test with sample employees
4. ⏳ Verify route guards work
5. ⏳ Verify sidebar filters correctly
6. ⏳ Deploy to production
