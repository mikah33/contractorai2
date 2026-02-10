import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface EmailPreferences {
  id: string;
  unsubscribed_from_all: boolean;
  unsubscribed_from_marketing: boolean;
  unsubscribed_from_estimates: boolean;
  unsubscribed_from_notifications: boolean;
  email: string;
  updated_at: string;
}

const EmailPreferences = () => {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's email preferences
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading email preferences:', error);
        setMessage({ type: 'error', text: 'Failed to load email preferences' });
        return;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences if they don't exist
        const { data: newPrefs, error: createError } = await supabase
          .from('email_preferences')
          .insert({
            user_id: user.id,
            email: user.email || '',
            unsubscribed_from_all: false,
            unsubscribed_from_marketing: false,
            unsubscribed_from_estimates: false,
            unsubscribed_from_notifications: false
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating email preferences:', createError);
          setMessage({ type: 'error', text: 'Failed to create email preferences' });
        } else {
          setPreferences(newPrefs);
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (field: keyof Omit<EmailPreferences, 'id' | 'email' | 'updated_at'>, value: boolean) => {
    if (!preferences || !user) return;

    try {
      setSaving(true);
      setMessage(null);

      const updates = { [field]: value };

      // If unsubscribing from all, set all other fields to true
      if (field === 'unsubscribed_from_all' && value) {
        updates.unsubscribed_from_marketing = true;
        updates.unsubscribed_from_estimates = true;
        updates.unsubscribed_from_notifications = true;
      }

      // If subscribing to any specific type, unsubscribe_from_all should be false
      if (field !== 'unsubscribed_from_all' && !value) {
        updates.unsubscribed_from_all = false;
      }

      const { data, error } = await supabase
        .from('email_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        setMessage({ type: 'error', text: 'Failed to update preferences' });
        return;
      }

      setPreferences(data);

      // Log the preference change
      await supabase.from('unsubscribe_log').insert({
        email: user.email || '',
        unsubscribe_type: field.replace('unsubscribed_from_', ''),
        source: 'settings_page',
        user_agent: navigator.userAgent
      });

      setMessage({ type: 'success', text: 'Email preferences updated successfully' });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error updating preference:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const getPreferenceStatus = (field: keyof Omit<EmailPreferences, 'id' | 'email' | 'updated_at'>) => {
    if (!preferences) return false;
    return !preferences[field]; // Return true if NOT unsubscribed (i.e., subscribed)
  };

  const handleToggle = (field: keyof Omit<EmailPreferences, 'id' | 'email' | 'updated_at'>) => {
    const currentValue = preferences?.[field] || false;
    updatePreference(field, !currentValue);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Preferences</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Preferences</h3>
        <p className="text-sm text-gray-600">
          Manage what types of emails you receive from ContractorAI. You can unsubscribe from specific types or all emails.
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {[
          {
            key: 'unsubscribed_from_marketing' as const,
            title: 'Marketing Emails',
            description: 'Product updates, feature announcements, and promotional content'
          },
          {
            key: 'unsubscribed_from_estimates' as const,
            title: 'Estimate Notifications',
            description: 'Email notifications related to estimates and proposals'
          },
          {
            key: 'unsubscribed_from_notifications' as const,
            title: 'System Notifications',
            description: 'Account activity, security alerts, and system updates'
          }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={getPreferenceStatus(item.key)}
                onChange={() => handleToggle(item.key)}
                disabled={saving || preferences?.unsubscribed_from_all}
                className="sr-only peer"
              />
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                getPreferenceStatus(item.key) && !preferences?.unsubscribed_from_all
                  ? 'bg-indigo-600'
                  : 'bg-gray-200'
              } ${saving || preferences?.unsubscribed_from_all ? 'opacity-50' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                  getPreferenceStatus(item.key) && !preferences?.unsubscribed_from_all
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}></div>
              </div>
            </label>
          </div>
        ))}

        {/* Unsubscribe from all emails option */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between p-4 border-2 border-red-200 rounded-lg bg-red-50">
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Unsubscribe from All Emails</h4>
              <p className="text-sm text-red-700">
                Stop receiving all email communications from ContractorAI
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={preferences?.unsubscribed_from_all || false}
                onChange={() => handleToggle('unsubscribed_from_all')}
                disabled={saving}
                className="sr-only peer"
              />
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                preferences?.unsubscribed_from_all
                  ? 'bg-red-600'
                  : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                  preferences?.unsubscribed_from_all
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {preferences && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Email: {preferences.email}
          </p>
          <p className="text-xs text-gray-500">
            Last updated: {new Date(preferences.updated_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {saving && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
          <span className="text-sm text-gray-600">Saving preferences...</span>
        </div>
      )}
    </div>
  );
};

export default EmailPreferences;