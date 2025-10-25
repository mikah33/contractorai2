# How to Run the Calendar Events Migration

This guide will help you add the `location` column to your `calendar_events` table in Supabase.

---

## 🎯 What This Migration Does

1. Adds a `location` column to store event locations
2. Updates existing events with `NULL` end_dates to use their start_date
3. Verifies the changes were applied correctly

**Impact:** Low - Non-breaking change, adds optional field

---

## 📋 Prerequisites

- Access to your Supabase dashboard
- Project: ContractorAI
- Database: PostgreSQL (via Supabase)

---

## 🚀 Method 1: Supabase Dashboard (Recommended)

This is the easiest method and requires no command-line tools.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account
   - Select your **ContractorAI** project

2. **Navigate to SQL Editor**
   - In the left sidebar, click on **SQL Editor**
   - Click **New query** button

3. **Copy the Migration SQL**
   - Open the file: `docs/add-calendar-location-column.sql`
   - Copy all the SQL code

4. **Paste and Run**
   - Paste the SQL into the query editor
   - Click the **Run** button (or press `Cmd/Ctrl + Enter`)

5. **Verify Success**
   - You should see results showing the columns in `calendar_events`
   - The `location` column should appear in the list

### Expected Output:
```
column_name       | data_type | is_nullable | column_default
------------------|-----------|-------------|---------------
id                | uuid      | NO          | gen_random_uuid()
title             | text      | NO          |
description       | text      | YES         |
start_date        | timestamp | NO          |
end_date          | timestamp | YES         |
event_type        | text      | NO          |
status            | text      | NO          |
location          | text      | YES         | ← NEW COLUMN!
...
```

---

## 🔧 Method 2: Supabase CLI

If you have the Supabase CLI installed, you can run the migration from your terminal.

### Steps:

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Get Your Database Connection String**
   - Go to Supabase Dashboard → Project Settings → Database
   - Copy the **Connection string** (Transaction pooler mode recommended)
   - It looks like: `postgresql://postgres:[password]@[host]:5432/postgres`

3. **Run the Migration**
   ```bash
   cd /Users/mikahalbertson/Claude-Main-Mind/projects/ContractorAI-Main-App

   supabase db execute \
     --db-url 'postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres' \
     --file docs/add-calendar-location-column.sql
   ```

4. **Verify Success**
   - Check the output for any errors
   - Should show successful execution

---

## 🛠️ Method 3: Using the Helper Script

We've provided a helper script to guide you through the process.

### Steps:

1. **Run the Helper Script**
   ```bash
   cd /Users/mikahalbertson/Claude-Main-Mind/projects/ContractorAI-Main-App
   ./docs/run-calendar-migration.sh
   ```

2. **Follow the Prompts**
   - The script will check if Supabase CLI is installed
   - It will display the SQL to run
   - It will show you different options

---

## ✅ After Migration

### 1. **Enable Location Field in Code**

Once the migration is complete, you can re-enable the location field:

**File:** `/src/components/calendar/EventModal.tsx`

Add back the location field in the form (around line 227):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">Location</label>
  {isEditing ? (
    <input
      type="text"
      value={formData.location}
      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder="Event location (optional)"
    />
  ) : (
    <p className="mt-1 text-gray-900">{formData.location || 'No location specified'}</p>
  )}
</div>
```

**File:** `/src/services/calendarService.ts`

Update the interface (around line 3):
```typescript
export interface CalendarEvent {
  // ... existing fields
  location?: string; // Add this back
}
```

### 2. **Update Event Handlers**

**File:** `/src/components/calendar/EventModal.tsx`

Re-enable location in the submission handlers:
```typescript
// In handleSubmit for updating events (around line 70)
await updateEvent(event.id, {
  title: formData.title,
  description: formData.description,
  start_date: formData.start,
  end_date: formData.end,
  event_type: formData.type as any,
  status: formData.status as any,
  weather_sensitive: formData.weatherSensitive,
  location: formData.location  // Add this back
});

// In handleSubmit for creating events (around line 82)
const newEvent = {
  title: formData.title,
  description: formData.description,
  start_date: formData.start,
  end_date: formData.end,
  event_type: formData.type as any,
  status: formData.status as any,
  weather_sensitive: formData.weatherSensitive,
  location: formData.location  // Add this back
};
```

### 3. **Test the Feature**

1. Open the calendar in your app
2. Click "Add Event"
3. Fill in the location field
4. Save the event
5. Click on the event to view it
6. Verify the location is displayed
7. Edit the event and update the location
8. Verify changes are saved

---

## 🐛 Troubleshooting

### Issue: "Could not find the 'location' column"
**Solution:** The migration hasn't been run yet. Follow the steps above.

### Issue: "Permission denied"
**Solution:** Make sure you're signed in to Supabase and have admin access to the project.

### Issue: "Migration script not found"
**Solution:** Make sure you're in the correct directory:
```bash
cd /Users/mikahalbertson/Claude-Main-Mind/projects/ContractorAI-Main-App
```

### Issue: "Syntax error in SQL"
**Solution:** Make sure you copied the entire SQL file contents, not just a portion.

---

## 📊 Verification Queries

After running the migration, you can verify with these SQL queries:

### Check if location column exists:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calendar_events'
  AND column_name = 'location';
```

### Check for NULL end_dates:
```sql
SELECT COUNT(*)
FROM calendar_events
WHERE end_date IS NULL;
```
*Should return 0 after migration*

### View all columns:
```sql
SELECT *
FROM information_schema.columns
WHERE table_name = 'calendar_events'
ORDER BY ordinal_position;
```

---

## 📞 Need Help?

If you encounter any issues:

1. Check the Supabase Dashboard → Logs for error details
2. Review the SQL syntax in `docs/add-calendar-location-column.sql`
3. Make sure you have the correct database selected
4. Try running the migration line by line to identify the issue

---

## ✨ Summary

**Before Migration:**
- ❌ Location field disabled in code
- ⚠️ Some events have NULL end_dates

**After Migration:**
- ✅ Location column exists in database
- ✅ All events have valid end_dates
- ✅ Location field can be re-enabled in code
- ✅ Full event location support

**Estimated Time:** 2-5 minutes
**Risk Level:** Low (non-breaking change)
**Rollback:** Not needed (adding a column is safe)

---

**Ready to run?** Choose your preferred method above and follow the steps!
