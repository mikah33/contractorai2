import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useEstimateRealtime from '../../hooks/useEstimateRealtime';
import useEstimateStore from '../../stores/estimateStore';

interface EstimateRealtimeTestProps {
  isOpen: boolean;
  onClose: () => void;
}

const EstimateRealtimeTest: React.FC<EstimateRealtimeTestProps> = ({ isOpen, onClose }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { estimates } = useEstimateStore();

  // Set up real-time subscription
  useEstimateRealtime(userId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runEstimateRealtimeTest = async () => {
    if (!userId) {
      addTestResult('❌ No user authenticated');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      addTestResult('🚀 Starting estimate real-time test...');

      // Step 1: Create a test estimate
      addTestResult('📝 Creating test estimate...');

      const testEstimate = {
        id: `test-estimate-${Date.now()}`,
        title: 'Real-time Test Estimate',
        client_name: 'Test Customer',
        status: 'draft' as const,
        subtotal: 1000,
        tax_rate: 8.5,
        tax_amount: 85,
        total: 1085,
        user_id: userId,
        notes: 'This is a test estimate for real-time functionality'
      };

      const { data: createdEstimate, error: createError } = await supabase
        .from('estimates')
        .insert([testEstimate])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create estimate: ${createError.message}`);
      }

      addTestResult('✅ Test estimate created successfully');
      addTestResult(`📊 Estimate ID: ${createdEstimate.id}`);

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Update the estimate status to test real-time sync
      addTestResult('🔄 Updating estimate status to "sent"...');

      const { error: updateError } = await supabase
        .from('estimates')
        .update({ status: 'sent' })
        .eq('id', createdEstimate.id);

      if (updateError) {
        throw new Error(`Failed to update estimate: ${updateError.message}`);
      }

      addTestResult('✅ Estimate status updated to "sent"');

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Create an email response record to simulate customer response
      addTestResult('📧 Simulating customer response...');

      const { error: responseError } = await supabase
        .from('estimate_email_responses')
        .insert([{
          estimate_id: createdEstimate.id,
          customer_name: testEstimate.client_name,
          customer_email: 'test@example.com',
          email_subject: 'Test Response',
          email_body: 'Test body',
          pdf_url: 'https://example.com/test.pdf',
          client_id: null,
          user_id: userId,
          accepted: true,
          responded_at: new Date().toISOString()
        }]);

      if (responseError) {
        throw new Error(`Failed to create response: ${responseError.message}`);
      }

      addTestResult('✅ Customer response simulated (accepted)');

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Update estimate to approved status
      addTestResult('🎉 Updating estimate to approved...');

      const { error: approveError } = await supabase
        .from('estimates')
        .update({ status: 'approved' })
        .eq('id', createdEstimate.id);

      if (approveError) {
        throw new Error(`Failed to approve estimate: ${approveError.message}`);
      }

      addTestResult('✅ Estimate approved');

      // Wait a moment then clean up
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 5: Clean up test data
      addTestResult('🧹 Cleaning up test data...');

      await supabase.from('estimate_email_responses').delete().eq('estimate_id', createdEstimate.id);
      await supabase.from('estimates').delete().eq('id', createdEstimate.id);

      addTestResult('✅ Test completed successfully');
      addTestResult('🔍 Check the estimates list to verify real-time updates occurred');

    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black/70" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-[#1C1C1E] rounded-2xl shadow-xl border border-blue-500/30">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500/30">
            <h3 className="text-lg font-semibold text-white">Real-time Estimate Test</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                This test will create a test estimate, update its status, and simulate a customer response
                to verify that real-time updates are working properly.
              </p>
            </div>

            <button
              onClick={runEstimateRealtimeTest}
              disabled={isRunning || !userId}
              className="w-full flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? '⏳ Running Test...' : '🚀 Run Real-time Test'}
            </button>

            {testResults.length > 0 && (
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Test Results:</h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm text-zinc-400 font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-zinc-500">
              Current estimates in store: {estimates.length}
              <br />
              User ID: {userId || 'Not authenticated'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateRealtimeTest;