# Global Data Initialization System

## Overview
All app data (clients, projects, estimates) now loads automatically on startup, ensuring data is available on every page without clicking through tabs first.

## Implementation

### 1. App Initialization Hook (`/src/hooks/useAppInitialization.ts`)
- Runs once when app starts
- Loads all essential data in parallel:
  - Clients
  - Projects
  - Estimates
- Shows loading screen while data initializes

### 2. Smart Caching in Stores
All stores now implement intelligent caching:

**Clients Store** (`/src/stores/clientsStore.ts`):
```typescript
fetchClients: async (force = false) => {
  // Skip if already loaded (unless force=true)
  if (state.hasLoadedOnce && !force && state.clients.length > 0) {
    console.log('✅ Using cached clients data');
    return;
  }
  // ... fetch from database
}
```

**Projects Store** (`/src/stores/projectStore.ts`):
- Already had caching with `hasLoadedOnce` flag

**Estimates Store** (`/src/stores/estimateStore.ts`):
- Already had caching with `hasLoadedOnce` flag

### 3. App.tsx Integration
- Shows loading screen during:
  1. Authentication check
  2. Data initialization
- Data is ready before any page renders

## User Experience

**Before:**
- Dashboard loads → no data
- Click Finance → data loads
- Click Calendar → data loads
- Had to visit every page to get data

**After:**
- Login → loading screen appears
- All data loads in parallel (2-3 seconds)
- Dashboard shows with complete data
- Every page has instant access to data
- No need to click through tabs

## Manual Refresh

To force refresh data from database:
```typescript
// In any component
const { fetchClients } = useClientsStore();
const { fetchProjects } = useProjectsStore();
const { fetchEstimates } = useEstimatesStore();

// Force refresh
await fetchClients(true);  // force=true bypasses cache
await fetchProjects(true);
await fetchEstimates(true);
```

## Performance

- Initial load: ~2-3 seconds for all data
- Subsequent navigation: Instant (uses cached data)
- Cache persists until:
  - User logs out
  - Page refresh
  - Manual force refresh with `force=true`

## Benefits

✅ Consistent data across all pages
✅ Faster navigation (no repeated fetches)
✅ Better user experience
✅ Reduced database queries
✅ Prevents race conditions
