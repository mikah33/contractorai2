# Supabase Caching & Performance Optimization Guide

## 🚀 Overview

This app now uses **React Query (TanStack Query)** for intelligent caching of Supabase data. This provides:

- ⚡ **Instant loading** - Data cached for 5 minutes
- 🔄 **Auto-refresh** - Updates when you switch back to the app
- 💾 **Smart invalidation** - Cache updates automatically when you create/update/delete
- 🎯 **Optimistic updates** - UI updates immediately before server confirms
- 📊 **Background sync** - Keeps data fresh without blocking UI

## 📦 Cache Configuration

**Stale Time:** 5 minutes - Data is considered fresh for 5 minutes
**GC Time:** 10 minutes - Unused data stays in cache for 10 minutes
**Refetch on Focus:** Enabled - Data refreshes when you return to the app
**Refetch on Mount:** Disabled - Won't refetch if data is still fresh

## 🔧 How to Use

### Basic Query Hook

```tsx
import { useProjects } from '../hooks/useSupabaseQuery';

function MyComponent() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Create/Update/Delete with Auto Cache Invalidation

```tsx
import { useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useSupabaseQuery';

function ProjectForm() {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleCreate = async () => {
    await createProject.mutateAsync({
      name: 'New Project',
      status: 'active'
    });
    // Cache automatically updates - projects list refreshes!
  };

  const handleUpdate = async (id: string) => {
    await updateProject.mutateAsync({
      id,
      data: { status: 'completed' }
    });
    // Cache automatically updates!
  };

  const handleDelete = async (id: string) => {
    await deleteProject.mutateAsync(id);
    // Cache automatically updates!
  };

  return (
    <button
      onClick={handleCreate}
      disabled={createProject.isPending}
    >
      {createProject.isPending ? 'Creating...' : 'Create Project'}
    </button>
  );
}
```

## 📋 Available Hooks

### Projects
- `useProjects()` - Get all projects
- `useCreateProject()` - Create project
- `useUpdateProject()` - Update project
- `useDeleteProject()` - Delete project

### Clients
- `useClients()` - Get all clients
- `useCreateClient()` - Create client

### Estimates
- `useEstimates()` - Get all estimates
- `useCreateEstimate()` - Create estimate

### Finance
- `useReceipts()` - Get all receipts
- `usePayments()` - Get all payments
- `useInvoices()` - Get all invoices
- `useCreateReceipt()` - Create receipt (auto-updates finance summary)

### Calendar
- `useEvents()` - Get all events
- `useCreateEvent()` - Create event

## 🔄 Migration from Zustand Stores

### Before (Zustand):
```tsx
import useProjectStore from '../stores/projectStore';

function Component() {
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects(); // Manual fetch on mount
  }, []);

  return <div>{projects.length} projects</div>;
}
```

### After (React Query):
```tsx
import { useProjects } from '../hooks/useSupabaseQuery';

function Component() {
  const { data: projects = [], isLoading } = useProjects();
  // No useEffect needed! Data fetches automatically and caches

  if (isLoading) return <div>Loading...</div>;

  return <div>{projects.length} projects</div>;
}
```

## 🎯 Manual Cache Management

### Invalidate Specific Cache
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

function Component() {
  const queryClient = useQueryClient();

  const forceRefresh = () => {
    // Force refetch projects
    queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  };

  return <button onClick={forceRefresh}>Refresh</button>;
}
```

### Prefetch Data
```tsx
import { usePrefetchData } from '../hooks/useSupabaseQuery';

function LoginSuccess() {
  const { prefetchAll } = usePrefetchData();

  useEffect(() => {
    // Load all data in background after login
    prefetchAll();
  }, []);

  return <div>Welcome!</div>;
}
```

## 🐛 React Query Devtools

A devtools panel is available in development mode. Look for the React Query icon (flower) in the bottom-right corner.

**Features:**
- View all cached queries
- See query status (fresh, stale, loading)
- Manually refetch or invalidate queries
- Inspect query data

## ⚡ Performance Tips

1. **Use the cache!** Don't bypass it with manual Supabase calls
2. **Let React Query handle refetching** - avoid manual useEffect fetches
3. **Mutations auto-invalidate** - trust the system to update the cache
4. **Prefetch on login** - load all data in background after authentication
5. **Monitor with devtools** - check if queries are being called too often

## 🔒 Security

- All queries check authentication automatically
- Queries disabled if user is not logged in
- User ID automatically added to all Supabase queries

## 📈 Performance Metrics

**Before Caching:**
- Initial load: ~3-5 seconds (7 sequential requests)
- Navigation: ~500ms-1s per page
- Repeated views: Full refetch every time

**After Caching:**
- Initial load: ~3-5 seconds (one-time, parallel requests)
- Navigation: Instant (cached data)
- Repeated views: Instant until stale (5 min)
- Background refresh: Silent, non-blocking

## 🛠️ Troubleshooting

### Data not updating after mutation
```tsx
// Make sure you're using the mutation hook:
const createProject = useCreateProject();
await createProject.mutateAsync({ ... });
// NOT direct supabase call
```

### Stale data showing
```tsx
// Force refresh:
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: queryKeys.projects });
```

### Slow initial load
```tsx
// Add prefetching on login:
const { prefetchAll } = usePrefetchData();
useEffect(() => { prefetchAll(); }, []);
```

## 📚 Learn More

- [React Query Docs](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
