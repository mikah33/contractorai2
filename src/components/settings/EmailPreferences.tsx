import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
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
      setMessage(null);

      // First try to get by user_id
      let { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If not found by user_id, try by email
      if (!data && user.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (emailData) {
          // Update the record to include user_id
          await supabase
            .from('email_preferences')
            .update({ user_id: user.id })
            .eq('id', emailData.id);
          data = { ...emailData, user_id: user.id };
        }
        error = emailError;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading email preferences:', error);
        // Don't show error, just use defaults
        setPreferences({
          id: '',
          email: user.email || '',
          unsubscribed_from_all: false,
          unsubscribed_from_marketing: false,
          unsubscribed_from_estimates: false,
          unsubscribed_from_notifications: false,
          updated_at: new Date().toISOString()
        });
        return;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Try to create default preferences
        try {
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
            // Use local defaults without showing error
            setPreferences({
              id: '',
              email: user.email || '',
              unsubscribed_from_all: false,
              unsubscribed_from_marketing: false,
              unsubscribed_from_estimates: false,
              unsubscribed_from_notifications: false,
              updated_at: new Date().toISOString()
            });
          } else {
            setPreferences(newPrefs);
          }
        } catch {
          // Use local defaults
          setPreferences({
            id: '',
            email: user.email || '',
            unsubscribed_from_all: false,
            unsubscribed_from_marketing: false,
            unsubscribed_from_estimates: false,
            unsubscribed_from_notifications: false,
            updated_at: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
      // Use local defaults instead of showing error
      setPreferences({
        id: '',
        email: user?.email || '',
        unsubscribed_from_all: false,
        unsubscribed_from_marketing: false,
        unsubscribed_from_estimates: false,
        unsubscribed_from_notifications: false,
        updated_at: new Date().toISOString()
      });
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
      <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.primary} p-6`}>
        <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>Email Preferences</h3>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 ${themeClasses.bg.input} rounded w-3/4`}></div>
          <div className={`h-12 ${themeClasses.bg.input} rounded`}></div>
          <div className={`h-12 ${themeClasses.bg.input} rounded`}></div>
          <div className={`h-12 ${themeClasses.bg.input} rounded`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.primary} p-6`}>
      <div className="mb-6">
        <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-2`}>Email Preferences</h3>
        <p className={`text-sm ${themeClasses.text.secondary}`}>
          Manage what types of emails you receive from ContractorAI. You can unsubscribe from specific types or all emails.
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
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
          <div key={item.key} className={`flex items-center justify-between p-4 border ${themeClasses.border.primary} rounded-lg`}>
            <div className="flex-1">
              <h4 className={`font-medium ${themeClasses.text.primary}`}>{item.title}</h4>
              <p className={`text-sm ${themeClasses.text.secondary}`}>{item.description}</p>
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
                  ? 'bg-[#043d6b]'
                  : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
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
        <div className={`border-t ${themeClasses.border.primary} pt-4`}>
          <div className="flex items-center justify-between p-4 border-2 border-red-500/30 rounded-lg bg-red-500/10">
            <div className="flex-1">
              <h4 className="font-medium text-red-400">Unsubscribe from All Emails</h4>
              <p className="text-sm text-red-400/80">
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
                  : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
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

      {preferences && preferences.email && (
        <div className={`mt-6 pt-4 border-t ${themeClasses.border.primary}`}>
          <p className={`text-xs ${themeClasses.text.muted}`}>
            Email: {preferences.email}
          </p>
          {preferences.updated_at && (
            <p className={`text-xs ${themeClasses.text.muted}`}>
              Last updated: {new Date(preferences.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {saving && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#043d6b] border-t-transparent mr-2"></div>
          <span className={`text-sm ${themeClasses.text.secondary}`}>Saving preferences...</span>
        </div>
      )}
    </div>
  );
};

export default EmailPreferences;