#!/bin/bash

# Script to apply calendar_events location column migration
# This script helps you run the SQL migration against your Supabase database

echo "======================================"
echo "Calendar Events Migration Script"
echo "======================================"
echo ""
echo "This script will guide you through adding the 'location' column"
echo "to your calendar_events table in Supabase."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "To install, run:"
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Option 1: Run via Supabase CLI
echo "Option 1: Run via Supabase CLI (Recommended)"
echo "-------------------------------------------"
echo "Command:"
echo "  supabase db execute --db-url '<your-connection-string>' --file docs/add-calendar-location-column.sql"
echo ""

# Option 2: Manual SQL execution
echo "Option 2: Run Manually in Supabase Dashboard"
echo "-------------------------------------------"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your project: ContractorAI"
echo "3. Navigate to: SQL Editor"
echo "4. Copy and paste the contents of:"
echo "   docs/add-calendar-location-column.sql"
echo "5. Click 'Run'"
echo ""

# Option 3: Show the SQL
echo "Option 3: View the SQL to run"
echo "-------------------------------------------"
read -p "Would you like to view the SQL? (y/n): " view_sql

if [ "$view_sql" = "y" ]; then
    echo ""
    echo "SQL Migration:"
    echo "=============="
    cat docs/add-calendar-location-column.sql
    echo ""
fi

echo ""
echo "Next Steps:"
echo "----------"
echo "1. Apply the migration using one of the options above"
echo "2. Verify the changes in Supabase Dashboard"
echo "3. Test the calendar event creation/editing in the app"
echo ""
echo "After migration, you can re-enable the location field in:"
echo "  - src/components/calendar/EventModal.tsx"
echo "  - src/services/calendarService.ts"
echo ""
