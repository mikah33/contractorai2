# Estimate Save Testing Guide

## Prerequisites
- Ensure you're logged in with a valid user account
- Open browser developer console (F12) to monitor logs
- Have access to Supabase dashboard to verify database entries

## Test Cases

### Test 1: Create New Estimate from Scratch
**Steps:**
1. Navigate to Estimates page
2. Click "New Estimate" button
3. Fill in estimate details (title, client name, etc.)
4. Add at least one item
5. Click "Save Estimate" from Download dropdown

**Expected Results:**
- Console shows: `💾 Starting estimate save...`
- Console shows: `✅ Estimate saved successfully to Supabase!`
- Green success message appears: "Saved successfully"
- Success message disappears after 3 seconds
- Estimate appears in database with correct data
- Estimate ID is a valid UUID

**Console Log Pattern:**
```
💾 Starting estimate save...
📝 Estimate data prepared: {...}
📊 updateEstimate called with id: ...
➕ Inserting new estimate...
✅ Estimate inserted successfully
✅ Estimate verified in database
✅ Estimate saved successfully to Supabase!
```

### Test 2: Create Estimate from Calculator
**Steps:**
1. Navigate to Pricing Calculator
2. Complete a calculation (e.g., concrete, roofing)
3. Click "Create Estimate" button
4. Verify estimate loads in Estimate Generator
5. Click "Save Estimate"

**Expected Results:**
- Estimate auto-saves on creation from calculator
- Console shows calculator save: `✅ SAVING: First save, proceeding...`
- Manual save updates the existing estimate
- No duplicate estimates created
- Calculator data is preserved in database

**Console Log Pattern:**
```
EstimateGenerator - Location state: {...}
Processing calculator data: {...}
✅ SAVING: First save, proceeding...
Estimate saved to database: {...}
Setting current estimate: {...}
```

### Test 3: Edit Existing Estimate (Auto-Save)
**Steps:**
1. Open an existing estimate for editing
2. Modify title or add/remove items
3. Wait 1-2 seconds after each change

**Expected Results:**
- Each change triggers auto-save
- Console shows: `🔄 Auto-saving estimate...`
- Console shows: `✅ Auto-save completed`
- No error messages
- Changes persist in database
- Unsaved changes indicator clears after auto-save

**Console Log Pattern:**
```
🔄 Auto-saving estimate... {id: "...", total: ...}
📊 updateEstimate called with id: ...
✏️ Updating existing estimate...
✅ Estimate updated successfully
✅ Auto-save completed
```

### Test 4: Manual Save of Edited Estimate
**Steps:**
1. Edit an existing estimate
2. Make several changes
3. Click "Save Estimate" manually

**Expected Results:**
- All changes saved to database
- Success message appears
- Estimate verified and refreshed
- Estimates list updated

### Test 5: Error Handling - Network Failure
**Steps:**
1. Open browser DevTools > Network tab
2. Set network to "Offline"
3. Try to save an estimate

**Expected Results:**
- Error alert appears with message
- Console shows: `❌ Error saving estimate:`
- Console shows error details
- No success message displayed
- Unsaved changes flag remains set

**Console Log Pattern:**
```
💾 Starting estimate save...
❌ Error in updateEstimate: ...
❌ Error saving estimate: ...
Error details: {message: "...", code: "...", ...}
```

### Test 6: Save Without Required Fields
**Steps:**
1. Create new estimate
2. Leave title empty or use only spaces
3. Try to save

**Expected Results:**
- Save attempt completes (title is optional in schema)
- OR validation error if title is required in UI
- Console logs show the save attempt

### Test 7: Verify Database Consistency
**Steps:**
1. Create/edit an estimate
2. Save it
3. Open Supabase dashboard
4. Check estimates table

**Expected Results:**
- Estimate exists in database
- All fields match the UI values
- `user_id` is correctly set
- `created_at` and `updated_at` timestamps are present
- Items are stored as JSONB array
- Schema matches:
  - `client_name` (not `client_id`)
  - `project_name` (not `project_id` unless linking to project)
  - `tax_rate`, `tax_amount`, `subtotal`, `total` are numeric

### Test 8: Concurrent Edits (Auto-Save Race Condition)
**Steps:**
1. Open estimate for editing
2. Make rapid changes (type quickly, add/remove items fast)
3. Observe console logs

**Expected Results:**
- Multiple auto-saves may queue
- All complete successfully
- No race condition errors
- Final state matches last change
- No data loss

### Test 9: Convert to Invoice After Save
**Steps:**
1. Create and save an estimate
2. Mark as approved
3. Convert to invoice

**Expected Results:**
- Estimate ID is valid and conversion works
- Invoice references correct estimate
- No errors due to save issues

### Test 10: Refresh After Save
**Steps:**
1. Create and save new estimate
2. Refresh browser (F5)
3. Navigate back to Estimates page

**Expected Results:**
- Saved estimate appears in list
- Can open and edit the estimate
- All data preserved correctly

## Debugging Checklist

If save fails, check:

1. **Console Logs**: Look for error messages with ❌ emoji
2. **Network Tab**: Check for failed API requests
3. **Error Details**: Look for error code and message
4. **User Authentication**: Verify user is logged in
5. **Estimate ID**: Check if ID is valid UUID format
6. **Database Schema**: Verify column names match
7. **Supabase Logs**: Check Supabase dashboard for backend errors

## Common Issues and Solutions

### Issue: "Invalid or missing estimate ID"
- **Cause**: Estimate ID is not a valid UUID
- **Solution**: Check UUID generation logic, ensure format matches

### Issue: Save succeeds but estimate not in list
- **Cause**: List not refreshing after save
- **Solution**: Check if `fetchEstimates()` is called after save

### Issue: Success message shows but data not in database
- **Solution**: This should NOT happen with new verification logic
- **Check**: Verification step should catch this

### Issue: Auto-save failing silently
- **Check**: Console logs for `❌ Error auto-saving estimate`
- **Solution**: Review error details, check network connection

### Issue: Duplicate estimates created
- **Cause**: Multiple save attempts with same ID
- **Solution**: Check for proper ID validation and upsert logic

## Expected Console Log Patterns

### Complete Successful Save:
```
💾 Starting estimate save... {id: "abc123", title: "Test", total: 1500}
📝 Estimate data prepared: {title: "Test", client_name: "John Doe", ...}
📊 updateEstimate called with id: abc123
📝 Update data: {title: "Test", ...}
[Check for existing]
✏️ Updating existing estimate... (or ➕ Inserting new estimate...)
✅ Estimate updated successfully (or inserted)
✅ Local state updated
✅ Database operation completed
✅ Estimate verified in database: {...}
✅ Estimate saved successfully to Supabase!
```

### Auto-Save:
```
🔄 Auto-saving estimate... {id: "abc123", total: 1500}
📊 updateEstimate called with id: abc123
📝 Update data: {...}
✏️ Updating existing estimate...
✅ Estimate updated successfully
✅ Local state updated
✅ Auto-save completed
```

### Error:
```
💾 Starting estimate save...
📝 Estimate data prepared: {...}
📊 updateEstimate called with id: abc123
❌ Error in updateEstimate: Error: ...
❌ Error saving estimate: Error: ...
Error details: {message: "Network error", code: "...", details: "..."}
```

## Verification Steps

After each test:
1. ✅ Check console logs match expected pattern
2. ✅ Verify database entry in Supabase
3. ✅ Confirm UI state is correct
4. ✅ Ensure no error messages
5. ✅ Check estimate appears in list
6. ✅ Verify all data fields are correct
7. ✅ Test editing the saved estimate

## Performance Metrics

Expected timings:
- Save operation: < 2 seconds
- Auto-save: < 1 second
- Verification fetch: < 500ms
- Total save with verification: < 3 seconds

## Success Criteria

All tests pass when:
- ✅ No console errors
- ✅ Success messages only on verified saves
- ✅ Data correctly persists to database
- ✅ Proper error handling and user feedback
- ✅ No duplicate entries
- ✅ Auto-save works reliably
- ✅ Manual save provides confirmation
