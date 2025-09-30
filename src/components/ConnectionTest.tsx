import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [tablesStatus, setTablesStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test basic connection
      const { data, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (connectionError) {
        setConnectionStatus('❌ Connection Failed');
        setError(connectionError.message);
        return;
      }

      setConnectionStatus('✅ Connected to Supabase');

      // Test if main tables exist
      const tables = ['projects', 'estimates', 'clients'];
      const tableResults = [];

      for (const table of tables) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('count')
            .limit(1);
          
          if (tableError) {
            tableResults.push(`❌ ${table}: ${tableError.message}`);
          } else {
            tableResults.push(`✅ ${table}: OK`);
          }
        } catch (err) {
          tableResults.push(`❌ ${table}: ${err.message}`);
        }
      }

      setTablesStatus(tableResults.join('\n'));
    } catch (err) {
      setConnectionStatus('❌ Connection Failed');
      setError(err.message);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Database Connection Test</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Connection:</strong> {connectionStatus}
        </div>
        
        <div>
          <strong>Tables:</strong>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
            {tablesStatus}
          </pre>
        </div>
        
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionTest;
