import { useState, useEffect } from 'react';
import { Save, Bell, Lock, User, Loader2, Calendar, Upload, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/authStore';
import { requestNotificationPermission, registerServiceWorker, showNotification } from '../utils/notifications';
import StripeConnectButton from '../components/stripe/StripeConnectButton';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { profile, loading: dataLoading, refreshProfile } = useData();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [notifications, setNotifications] = useState({
    calendarReminders: true,
    marketingEmails: false,
    securityAlerts: true
  });

  const [localProfile, setLocalProfile] = useState({
    name: '',
    phone: '',
    company: '',
    address: '',
    defaultTerms: ''
  });

  // Load profile data when it becomes available
  useEffect(() => {
    if (profile) {
      setLocalProfile({
        name: profile.full_name || '',
        phone: profile.phone || '',
        company: profile.company || '',
        address: profile.address || '',
        defaultTerms: profile.default_terms || ''
      });
      setLogoUrl(profile.logo_url || null);
      setNotifications({
        calendarReminders: profile.calendar_reminders ?? true,
        marketingEmails: profile.marketing_emails ?? false,
        securityAlerts: profile.security_alerts ?? true
      });
    }
  }, [profile]);

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    // If enabling calendar reminders, request permission
    if (key === 'calendarReminders' && !notifications.calendarReminders) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await registerServiceWorker();
        alert('Calendar notifications enabled! You will receive reminders 15 minutes and 1 hour before events.');
      } else {
        alert('Please enable notifications in your browser settings to receive calendar reminders.');
        return;
      }
    }

    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProfileChange = (key: keyof typeof localProfile, value: string) => {
    setLocalProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    try {
      setUploadingLogo(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to upload logo');
        return;
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // Auto-save logo URL to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      await refreshProfile();
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(error?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLogoUrl(null);

      // Update profile to remove logo
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          logo_url: null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await refreshProfile();
      alert('Logo removed successfully!');
    } catch (error: any) {
      console.error('Error removing logo:', error);
      alert(error?.message || 'Failed to remove logo');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to save settings');
        setSaving(false);
        return;
      }

      // Save to profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: localProfile.name,
          phone: localProfile.phone,
          company: localProfile.company,
          address: localProfile.address,
          default_terms: localProfile.defaultTerms,
          calendar_reminders: notifications.calendarReminders,
          marketing_emails: notifications.marketingEmails,
          security_alerts: notifications.securityAlerts,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Refresh global profile data
      await refreshProfile();

      alert('Settings saved successfully!');
      setSaving(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(error?.message || 'Failed to save settings');
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        alert('Unable to get user email');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      alert('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert(error?.message || 'Failed to send password reset email');
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="flex items-center text-lg font-medium text-gray-900 mb-4">
              <User className="w-5 h-5 mr-2 text-gray-500" />
              Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={localProfile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={localProfile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={localProfile.company}
                  onChange={(e) => handleProfileChange('company', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Address</label>
                <textarea
                  value={localProfile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Default Terms & Conditions</label>
                <textarea
                  value={localProfile.defaultTerms}
                  onChange={(e) => handleProfileChange('defaultTerms', e.target.value)}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                  placeholder="Enter your standard terms and conditions that will be pre-filled on all new estimates..."
                />
                <p className="mt-2 text-xs text-gray-500">
                  These terms will automatically populate on new estimates. You can always edit them on individual estimates.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="flex items-center space-x-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="w-24 h-24 object-contain border-2 border-gray-300 rounded-lg p-2"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Remove logo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingLogo ? 'Uploading...' : logoUrl ? 'Update Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG up to 2MB. Logo will appear on estimates and in header.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h2 className="flex items-center text-lg font-medium text-gray-900 mb-4">
                <Bell className="w-5 h-5 mr-2 text-gray-500" />
                Notification Preferences
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      Calendar Reminders
                    </p>
                    <p className="text-sm text-gray-500">Get notified about calendar events and deadlines</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('calendarReminders')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      notifications.calendarReminders ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.calendarReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Marketing Emails</p>
                    <p className="text-sm text-gray-500">Receive news and special offers</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('marketingEmails')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      notifications.marketingEmails ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.marketingEmails ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Security Alerts</p>
                    <p className="text-sm text-gray-500">Important security notifications</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('securityAlerts')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      notifications.securityAlerts ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.securityAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h2 className="flex items-center text-lg font-medium text-gray-900 mb-4">
                <Lock className="w-5 h-5 mr-2 text-gray-500" />
                {t('settings.security')}
              </h2>
              <div className="space-y-4">
                <button
                  onClick={handleChangePassword}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Lock className="w-5 h-5 text-gray-500 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{t('settings.changePassword')}</p>
                      <p className="text-sm text-gray-500">{t('settings.changePasswordDesc')}</p>
                    </div>
                  </div>
                  <span className="text-gray-400">&rarr;</span>
                </button>
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h2 className="flex items-center text-lg font-medium text-gray-900 mb-4">
                <Globe className="w-5 h-5 mr-2 text-gray-500" />
                {t('settings.language')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.selectLanguage')}
                  </label>
                  <select
                    value={i18n.language}
                    onChange={async (e) => {
                      const newLanguage = e.target.value;
                      i18n.changeLanguage(newLanguage);

                      // Save to user profile
                      if (user) {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ language: newLanguage })
                          .eq('id', user.id);

                        if (error) {
                          console.error('Error saving language preference:', error);
                        } else {
                          await refreshProfile();
                        }
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="en">{t('settings.english')}</option>
                    <option value="es">{t('settings.spanish')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Connect Section */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Settings</h2>
        <StripeConnectButton />
      </div>
    </div>
  );
};

export default Settings;
