import { useState } from 'react';
import { useCalendarStoreSupabase } from '../../stores/calendarStoreSupabase';
import { CalendarService } from '../../services/calendarService';
import { supabase } from '../../lib/supabase';

const CalendarDebug = () => {
  const { events, loading, error, fetchEvents, addEvent } = useCalendarStoreSupabase();
  const [testResult, setTestResult] = useState<string>('');

  const testAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setTestResult(`Auth Status: ${user ? `Logged in as ${user.email}` : 'Not authenticated'}`);
    } catch (err) {
      setTestResult(`Auth Error: ${err}`);
    }
  };

  const testFetchEvents = async () => {
    try {
      setTestResult('Fetching events...');
      await fetchEvents();
      setTestResult(`Fetched ${events.length} events`);
    } catch (err) {
      setTestResult(`Fetch Error: ${err}`);
    }
  };

  const testCreateEvent = async () => {
    try {
      setTestResult('Creating test event...');
      const testEvent = {
        title: 'Test Event ' + new Date().toISOString(),
        description: 'This is a test event',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        event_type: 'task' as const,
        status: 'pending' as const
      };
      
      await addEvent(testEvent);
      setTestResult('Test event created successfully!');
    } catch (err) {
      setTestResult(`Create Error: ${err}`);
    }
  };

  const testDirectInsert = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTestResult('Not authenticated');
        return;
      }

      setTestResult('Direct insert test...');
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: 'Direct Test ' + Date.now(),
          start_date: new Date().toISOString(),
          event_type: 'task',
          status: 'pending',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        setTestResult(`Direct Insert Error: ${JSON.stringify(error)}`);
      } else {
        setTestResult(`Direct Insert Success: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setTestResult(`Direct Insert Exception: ${err}`);
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-bold text-yellow-800 mb-2">Calendar Debug Panel</h3>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-700">
          Events Count: {events.length} | Loading: {loading ? 'Yes' : 'No'} | Error: {error || 'None'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={testAuth}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Auth
        </button>
        <button
          onClick={testFetchEvents}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Fetch
        </button>
        <button
          onClick={testCreateEvent}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Create Event
        </button>
        <button
          onClick={testDirectInsert}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Direct Insert
        </button>
      </div>

      {testResult && (
        <div className="p-3 bg-gray-100 rounded text-sm font-mono whitespace-pre-wrap">
          {testResult}
        </div>
      )}

      <div className="mt-4">
        <h4 className="font-semibold text-sm mb-2">Current Events:</h4>
        <div className="max-h-40 overflow-y-auto text-xs">
          {events.length === 0 ? (
            <p className="text-gray-500">No events loaded</p>
          ) : (
            events.map((event, idx) => (
              <div key={event.id || idx} className="p-1 border-b">
                {event.title} - {event.start_date}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarDebug;