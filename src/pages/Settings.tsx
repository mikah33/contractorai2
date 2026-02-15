import { useState, useEffect } from 'react';
import {
  Save, Bell, Lock, User, Loader2, Calendar, Upload, X, Globe, Code,
  Trash2, AlertTriangle, CreditCard, CheckCircle, ExternalLink, XCircle,
  Clock, RefreshCw, ChevronRight, Mail, Building2, Phone, MapPin, FileText,
  Settings as SettingsIcon, LogOut, Eye, BookOpen, Home, ClipboardList, Moon, Megaphone, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { requestNotificationPermission, registerServiceWorker, showNotification } from '../utils/notifications';
import { BusinessEmailSetup } from '../components/settings/BusinessEmailSetup';
import EmailPreferences from '../components/settings/EmailPreferences';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import ThemeToggle from '../components/common/ThemeToggle';

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  email?: string;
  businessName?: string;
}

type SettingsSection = 'main' | 'profile' | 'notifications' | 'security' | 'payments' | 'language' | 'email' | 'tutorials' | 'theme' | 'danger' | 'marketing';

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { profile, loading: dataLoading, refreshProfile } = useData();
  const { theme, toggleTheme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    dashboardTutorialCompleted,
    visionCamTutorialCompleted,
    tasksTutorialCompleted,
    estimatingTutorialCompleted,
    projectsTutorialCompleted,
    paymentsTutorialCompleted,
    financeTutorialCompleted,
    teamsTutorialCompleted,
    emailTutorialCompleted,
    photosTutorialCompleted,
    marketingTutorialCompleted,
    setDashboardTutorialCompleted,
    setVisionCamTutorialCompleted,
    setTasksTutorialCompleted,
    setEstimatingTutorialCompleted,
    setProjectsTutorialCompleted,
    setPaymentsTutorialCompleted,
    setFinanceTutorialCompleted,
    setTeamsTutorialCompleted,
    setEmailTutorialCompleted,
    setPhotosTutorialCompleted,
    setMarketingTutorialCompleted,
    checkDashboardTutorial,
    checkVisionCamTutorial,
    checkTasksTutorial,
    checkEstimatingTutorial,
    checkProjectsTutorial,
    checkPaymentsTutorial,
    checkFinanceTutorial,
    checkTeamsTutorial,
    checkEmailTutorial,
    checkPhotosTutorial,
    checkMarketingTutorial
  } = useOnboardingStore();

  // Also keep localStorage sync for Vision Cam (backwards compatibility)
  const [showVisionCamTutorial, setShowVisionCamTutorial] = useState(() => {
    return !localStorage.getItem('visionCamTutorialHidden');
  });
  const [showDashboardTutorial, setShowDashboardTutorial] = useState(!dashboardTutorialCompleted);
  const [showTasksTutorial, setShowTasksTutorial] = useState(!tasksTutorialCompleted);
  const [showEstimatingTutorial, setShowEstimatingTutorial] = useState(!estimatingTutorialCompleted);
  const [showProjectsTutorial, setShowProjectsTutorial] = useState(!projectsTutorialCompleted);
  const [showPaymentsTutorial, setShowPaymentsTutorial] = useState(!paymentsTutorialCompleted);
  const [showFinanceTutorial, setShowFinanceTutorial] = useState(!financeTutorialCompleted);
  const [showTeamsTutorial, setShowTeamsTutorial] = useState(!teamsTutorialCompleted);
  const [showEmailTutorial, setShowEmailTutorial] = useState(!emailTutorialCompleted);
  const [showPhotosTutorial, setShowPhotosTutorial] = useState(!photosTutorialCompleted);
  const [showMarketingTutorial, setShowMarketingTutorial] = useState(!marketingTutorialCompleted);

  // Load tutorial states from Supabase
  useEffect(() => {
    if (user?.id) {
      checkDashboardTutorial(user.id);
      checkVisionCamTutorial(user.id);
      checkTasksTutorial(user.id);
      checkEstimatingTutorial(user.id);
      checkProjectsTutorial(user.id);
      checkPaymentsTutorial(user.id);
      checkFinanceTutorial(user.id);
      checkTeamsTutorial(user.id);
      checkEmailTutorial(user.id);
      checkPhotosTutorial(user.id);
      checkMarketingTutorial(user.id);
    }
  }, [user?.id]);

  // Sync state when Supabase values change
  useEffect(() => {
    setShowDashboardTutorial(!dashboardTutorialCompleted);
  }, [dashboardTutorialCompleted]);

  useEffect(() => {
    setShowVisionCamTutorial(!visionCamTutorialCompleted);
    // Also sync localStorage
    if (visionCamTutorialCompleted) {
      localStorage.setItem('visionCamTutorialHidden', 'true');
    } else {
      localStorage.removeItem('visionCamTutorialHidden');
    }
  }, [visionCamTutorialCompleted]);

  useEffect(() => {
    setShowTasksTutorial(!tasksTutorialCompleted);
  }, [tasksTutorialCompleted]);

  useEffect(() => {
    setShowEstimatingTutorial(!estimatingTutorialCompleted);
  }, [estimatingTutorialCompleted]);

  useEffect(() => {
    setShowProjectsTutorial(!projectsTutorialCompleted);
  }, [projectsTutorialCompleted]);

  useEffect(() => {
    setShowPaymentsTutorial(!paymentsTutorialCompleted);
  }, [paymentsTutorialCompleted]);

  useEffect(() => {
    setShowFinanceTutorial(!financeTutorialCompleted);
  }, [financeTutorialCompleted]);

  useEffect(() => {
    setShowTeamsTutorial(!teamsTutorialCompleted);
  }, [teamsTutorialCompleted]);

  useEffect(() => {
    setShowEmailTutorial(!emailTutorialCompleted);
  }, [emailTutorialCompleted]);

  useEffect(() => {
    setShowPhotosTutorial(!photosTutorialCompleted);
  }, [photosTutorialCompleted]);

  useEffect(() => {
    setShowMarketingTutorial(!marketingTutorialCompleted);
  }, [marketingTutorialCompleted]);

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus>({ connected: false });
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState({
    calendarReminders: true,
    securityAlerts: true
  });

  const [localProfile, setLocalProfile] = useState({
    name: '',
    phone: '',
    company: '',
    address: '',
    defaultTerms: '',
    contractorNotificationEmail: ''
  });

  // Load profile data when it becomes available, with fallback to auth metadata
  useEffect(() => {
    if (profile) {
      // Get auth metadata for fallback values
      const metadata = user?.user_metadata || {};

      setLocalProfile({
        name: profile.full_name || metadata.full_name || '',
        phone: profile.phone || metadata.phone || '',
        company: profile.company || metadata.company_name || '',
        address: profile.address || '',
        defaultTerms: profile.default_terms || '',
        contractorNotificationEmail: profile.contractor_notification_email || user?.email || ''
      });
      setLogoUrl(profile.logo_url || null);
      setNotifications({
        calendarReminders: profile.calendar_reminders ?? true,
        securityAlerts: profile.security_alerts ?? true
      });
    } else if (user) {
      // No profile yet, use auth metadata
      const metadata = user.user_metadata || {};
      setLocalProfile(prev => ({
        ...prev,
        name: metadata.full_name || '',
        phone: metadata.phone || '',
        company: metadata.company_name || '',
        contractorNotificationEmail: user.email || ''
      }));
    }
  }, [profile, user]);

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    try {
      setStripeLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'status' }
      });

      if (error) {
        console.error('Stripe status error:', error);
        setStripeError(error.message || 'Failed to check Stripe status');
        return;
      }
      setStripeError(null);
      setStripeStatus(data);
    } catch (error: any) {
      console.error('Error checking Stripe status:', error);
      setStripeError(error.message || 'Failed to check Stripe status');
    } finally {
      setStripeLoading(false);
    }
  };

  // Check status on load and handle URL params
  useEffect(() => {
    checkStripeStatus();

    // Handle URL params for Stripe Connect return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === 'true') {
      checkStripeStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('stripe_refresh') === 'true') {
      // User needs to restart onboarding
      handleStripeConnect();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Stripe Connect functions
  const handleStripeConnect = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'create' }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      setStripeError(error.message || 'Failed to connect Stripe account');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to access Stripe dashboard');
      }

      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'dashboard' }
      });

      if (error) {
        let errorMsg = 'Failed to open Stripe dashboard';
        if (error.context?.body) {
          try {
            const body = JSON.parse(error.context.body);
            errorMsg = body.error || errorMsg;
          } catch (e) {}
        } else if (error.message) {
          errorMsg = error.message;
        }
        throw new Error(errorMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No URL returned from Stripe');
      }
    } catch (error: any) {
      console.error('Error opening Stripe dashboard:', error);
      setStripeError(error.message || 'Failed to open dashboard. Please try again.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Stripe account? You will no longer be able to accept payments.')) {
      return;
    }

    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setStripeStatus({ connected: false });
      alert('Stripe account disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting Stripe:', error);
      setStripeError(error.message || 'Failed to disconnect');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    if (key === 'calendarReminders' && !notifications.calendarReminders) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await registerServiceWorker();
        alert('Calendar notifications enabled!');
      } else {
        alert('Please enable notifications in your browser settings.');
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

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

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

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

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
          contractor_notification_email: localProfile.contractorNotificationEmail,
          calendar_reminders: notifications.calendarReminders,
          security_alerts: notifications.securityAlerts,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion');
      return;
    }

    try {
      setDeletingAccount(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to delete your account');
        setDeletingAccount(false);
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id },
      });

      if (error) throw error;

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error?.message || 'Failed to delete account. Please contact support.');
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      window.location.href = '/auth/welcome';
    } catch (error: any) {
      console.error('Error logging out:', error);
      alert(error?.message || 'Failed to log out');
      setLoggingOut(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  // Categorized menu items
  const menuCategories = [
    {
      title: 'Account',
      items: [
        { id: 'profile' as SettingsSection, icon: User, label: 'Profile & Business', description: 'Name, company, logo, terms', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
        { id: 'security' as SettingsSection, icon: Lock, label: 'Security', description: 'Password, authentication', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
        { id: 'profile' as SettingsSection, icon: Users, label: 'Team', description: 'Manage your employees', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', navigateTo: '/employees-hub' },
      ]
    },
    {
      title: 'Integrations',
      items: [
        { id: 'payments' as SettingsSection, icon: CreditCard, label: 'Payments', description: stripeStatus.connected ? 'Stripe connected' : 'Connect Stripe', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
        { id: 'email' as SettingsSection, icon: Mail, label: 'Business Email', description: 'Professional email address', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'notifications' as SettingsSection, icon: Bell, label: 'Notifications', description: 'Calendar reminders, alerts', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
        { id: 'theme' as SettingsSection, icon: Moon, label: 'Appearance', description: theme === 'light' ? 'Light mode' : 'Dark mode', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', hasToggle: true },
        { id: 'tutorials' as SettingsSection, icon: BookOpen, label: 'Tutorials', description: 'Reset onboarding guides', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500' },
      ]
    },
    {
      title: 'More',
      items: [
        { id: 'marketing' as SettingsSection, icon: Megaphone, label: 'Marketing', description: 'Grow your business', bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', navigateTo: '/ad-analyzer' },
      ]
    },
  ];

  // Danger zone item (separate)
  const dangerItem = { id: 'danger' as SettingsSection, icon: Trash2, label: 'Delete Account', description: 'Permanently remove data', bgColor: 'bg-red-500/10', iconColor: 'text-red-500' };

  // Render section content
  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-4">
            {/* Name */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Full Name</label>
              <input
                type="text"
                value={localProfile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className={`w-full text-lg font-medium ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent`}
                placeholder="Your name"
              />
            </div>

            {/* Phone */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Phone</label>
              <input
                type="tel"
                value={localProfile.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                className={`w-full text-lg font-medium ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent`}
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Company */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Company Name</label>
              <input
                type="text"
                value={localProfile.company}
                onChange={(e) => handleProfileChange('company', e.target.value)}
                className={`w-full text-lg font-medium ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent`}
                placeholder="Your company"
              />
            </div>

            {/* Address */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Business Address</label>
              <textarea
                value={localProfile.address}
                onChange={(e) => handleProfileChange('address', e.target.value)}
                rows={2}
                className={`w-full text-lg font-medium ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent resize-none`}
                placeholder="123 Main St, City, State"
              />
            </div>

            {/* Notification Email */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Notification Email</label>
              <input
                type="email"
                value={localProfile.contractorNotificationEmail}
                onChange={(e) => handleProfileChange('contractorNotificationEmail', e.target.value)}
                className={`w-full text-lg font-medium ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent`}
                placeholder="notifications@company.com"
              />
              <p className={`text-xs ${themeClasses.text.muted} mt-2`}>Receive notifications when customers respond to estimates</p>
            </div>

            {/* Logo */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.muted} mb-3`}>Company Logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="w-20 h-20 object-contain border-2 border-gray-200 rounded-xl"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg active:scale-95"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-zinc-600 rounded-lg flex items-center justify-center">
                    <Upload className={`w-6 h-6 ${themeClasses.text.muted}`} />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="px-4 py-2.5 bg-blue-500/20 rounded-lg text-center font-medium text-blue-500 active:scale-95 transition-transform">
                    {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change' : 'Upload'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Default Terms */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Default Terms & Conditions</label>
              <textarea
                value={localProfile.defaultTerms}
                onChange={(e) => handleProfileChange('defaultTerms', e.target.value)}
                rows={4}
                className={`w-full ${themeClasses.text.primary} border-0 p-0 focus:ring-0 bg-transparent resize-none`}
                placeholder="Enter your standard terms..."
              />
              <p className={`text-xs ${themeClasses.text.muted} mt-2`}>Auto-fills on new estimates</p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 ${themeClasses.button.primary} rounded-lg font-semibold ${themeClasses.button.primaryHover} active:scale-[0.98] transition-all disabled:opacity-50`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-3">
            {/* Calendar Reminders */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Calendar Reminders</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Get notified about events</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange('calendarReminders')}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    notifications.calendarReminders ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      notifications.calendarReminders ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Security Alerts */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Security Alerts</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Important security notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange('securityAlerts')}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    notifications.securityAlerts ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      notifications.securityAlerts ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 ${themeClasses.button.primary} rounded-lg font-semibold ${themeClasses.button.primaryHover} active:scale-[0.98] transition-all disabled:opacity-50 mt-4`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-4">
            {stripeError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{stripeError}</p>
              </div>
            )}

            {stripeStatus.connected ? (
              <>
                {/* Connected Status Card */}
                <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                      <span className={`font-semibold ${themeClasses.text.primary}`}>Stripe Connected</span>
                    </div>
                    <button
                      onClick={checkStripeStatus}
                      disabled={stripeLoading}
                      className={`p-2 ${themeClasses.text.secondary} ${themeClasses.button.secondaryHover} rounded-lg transition-colors`}
                    >
                      <RefreshCw className={`w-4 h-4 ${stripeLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {stripeStatus.businessName && (
                    <p className={`text-sm ${themeClasses.text.secondary} mb-1`}>Business: {stripeStatus.businessName}</p>
                  )}
                  {stripeStatus.email && (
                    <p className={`text-sm ${themeClasses.text.secondary} mb-3`}>Email: {stripeStatus.email}</p>
                  )}

                  <div className="flex gap-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      stripeStatus.chargesEnabled ? 'bg-blue-500/20 text-blue-500' : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                    }`}>
                      {stripeStatus.chargesEnabled ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {stripeStatus.chargesEnabled ? 'Charges Active' : 'Charges Pending'}
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      stripeStatus.payoutsEnabled ? 'bg-blue-500/20 text-blue-500' : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                    }`}>
                      {stripeStatus.payoutsEnabled ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {stripeStatus.payoutsEnabled ? 'Payouts Active' : 'Payouts Pending'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={handleStripeDashboard}
                  disabled={stripeLoading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 ${themeClasses.button.primary} rounded-lg font-semibold ${themeClasses.button.primaryHover} active:scale-[0.98] transition-all disabled:opacity-50`}
                >
                  {stripeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                  {stripeStatus.detailsSubmitted ? 'Open Stripe Dashboard' : 'Complete Stripe Setup'}
                </button>

                <button
                  onClick={handleStripeDisconnect}
                  disabled={stripeLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  Disconnect Stripe
                </button>
              </>
            ) : (
              <>
                {/* Not Connected Info */}
                <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-5`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className={`font-semibold ${themeClasses.text.primary}`}>Accept Payments Online</p>
                      <p className={`text-sm ${themeClasses.text.secondary}`}>Connect Stripe to get started</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {['Accept credit card payments', 'Send payment links to customers', 'Get paid faster online', 'Track payments in one place'].map((item, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm ${themeClasses.text.secondary}`}>
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleStripeConnect}
                  disabled={stripeLoading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-4 ${themeClasses.button.primary} rounded-lg font-semibold ${themeClasses.button.primaryHover} active:scale-[0.98] transition-all disabled:opacity-50`}
                >
                  {stripeLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Connect Stripe Account
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-3">
            <button
              onClick={handleChangePassword}
              className={`w-full ${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4 active:scale-[0.98] transition-transform`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${themeClasses.text.primary}`}>Change Password</p>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>Send a password reset email</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
              </div>
            </button>

            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${themeClasses.text.primary}`}>Email Verified</p>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-3">
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} overflow-hidden`}>
              {[
                { code: 'en', label: 'English', flag: '🇺🇸' },
                { code: 'es', label: 'Español', flag: '🇪🇸' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={async () => {
                    i18n.changeLanguage(lang.code);
                    if (user) {
                      await supabase
                        .from('profiles')
                        .update({ language: lang.code })
                        .eq('id', user.id);
                      await refreshProfile();
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-4 border-b ${themeClasses.border.secondary} last:border-0 ${themeClasses.button.secondaryHover} transition-colors ${
                    i18n.language === lang.code ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`flex-1 text-left font-medium ${themeClasses.text.primary}`}>{lang.label}</span>
                  {i18n.language === lang.code && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-4">
            {/* Theme Description */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className={`font-semibold ${themeClasses.text.primary}`}>App Appearance</h3>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>Choose between light and dark mode</p>
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${themeClasses.text.primary} mb-1`}>Theme Mode</h4>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Currently using {theme === 'light' ? 'light' : 'dark'} mode
                  </p>
                </div>
                <ThemeToggle size="lg" showLabel />
              </div>
            </div>

            {/* Theme Info */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className={`text-sm ${themeClasses.text.secondary}`}>
                <p className="mb-2">
                  <strong className={themeClasses.text.primary}>Light Mode:</strong> Clean, bright interface perfect for daytime use
                </p>
                <p>
                  <strong className={themeClasses.text.primary}>Dark Mode:</strong> Easy on the eyes for low-light environments
                </p>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-6">
            <EmailPreferences />
            <BusinessEmailSetup />
          </div>
        );

      case 'tutorials':
        return (
          <div className="space-y-4">
            <p className={`text-sm ${themeClasses.text.secondary} px-1`}>
              Re-enable tutorials to see the onboarding guides again when using features.
            </p>

            {/* Dashboard Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Dashboard Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn about your dashboard overview</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showDashboardTutorial;
                    setShowDashboardTutorial(newValue);
                    if (user?.id) {
                      await setDashboardTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showDashboardTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showDashboardTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Vision Cam Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Vision Cam Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn how to use AI visualization</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showVisionCamTutorial;
                    setShowVisionCamTutorial(newValue);
                    // Save to both localStorage and Supabase
                    if (newValue) {
                      localStorage.removeItem('visionCamTutorialHidden');
                    } else {
                      localStorage.setItem('visionCamTutorialHidden', 'true');
                    }
                    if (user?.id) {
                      await setVisionCamTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showVisionCamTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showVisionCamTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tasks Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Tasks Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to manage tasks & calendar</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showTasksTutorial;
                    setShowTasksTutorial(newValue);
                    if (user?.id) {
                      await setTasksTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showTasksTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showTasksTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Estimating Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Estimating Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to create & send estimates</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showEstimatingTutorial;
                    setShowEstimatingTutorial(newValue);
                    if (user?.id) {
                      await setEstimatingTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showEstimatingTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showEstimatingTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Projects Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Projects Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to manage projects & teams</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showProjectsTutorial;
                    setShowProjectsTutorial(newValue);
                    if (user?.id) {
                      await setProjectsTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showProjectsTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showProjectsTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Finance Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Finance Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn P&L, revenue & expenses</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showFinanceTutorial;
                    setShowFinanceTutorial(newValue);
                    if (user?.id) {
                      await setFinanceTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showFinanceTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showFinanceTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Payments Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Invoices Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn invoicing & payment links</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showPaymentsTutorial;
                    setShowPaymentsTutorial(newValue);
                    if (user?.id) {
                      await setPaymentsTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showPaymentsTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showPaymentsTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Teams Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Teams Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to manage employees</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showTeamsTutorial;
                    setShowTeamsTutorial(newValue);
                    if (user?.id) {
                      await setTeamsTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showTeamsTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showTeamsTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Email Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Email Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to send emails & attachments</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showEmailTutorial;
                    setShowEmailTutorial(newValue);
                    if (user?.id) {
                      await setEmailTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showEmailTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showEmailTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Photos Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Photos Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn to capture & organize photos</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showPhotosTutorial;
                    setShowPhotosTutorial(newValue);
                    if (user?.id) {
                      await setPhotosTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showPhotosTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showPhotosTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Marketing Tutorial */}
            <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Marketing Tutorial</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Learn about marketing services</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !showMarketingTutorial;
                    setShowMarketingTutorial(newValue);
                    if (user?.id) {
                      await setMarketingTutorialCompleted(user.id, !newValue);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    showMarketingTutorial ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      showMarketingTutorial ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className={`text-xs ${themeClasses.text.muted} px-1`}>
              When enabled, the tutorial will show the next time you visit that feature.
            </p>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Danger Zone</p>
                  <p className="text-sm text-red-600 mt-1">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl font-medium active:scale-[0.98] transition-transform"
              >
                <Trash2 className="w-5 h-5" />
                Delete My Account
              </button>
            ) : (
              <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-4 space-y-4`}>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
                    Type DELETE to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1 px-4 py-3 bg-blue-500/20 text-blue-500 rounded-lg font-medium active:scale-[0.98] transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} pb-40`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-5 pt-4">
            <div className="flex items-center gap-4">
              {activeSection !== 'main' ? (
                <button
                  onClick={() => setActiveSection('main')}
                  className={`w-14 h-14 ${themeClasses.bg.tertiary} rounded-xl flex items-center justify-center hover:opacity-80 active:scale-95 transition-all`}
                >
                  <ChevronRight className={`w-7 h-7 ${themeClasses.text.secondary} rotate-180`} />
                </button>
              ) : (
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <SettingsIcon className="w-7 h-7 text-blue-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  {activeSection === 'main' ? 'Settings' :
                   activeSection === 'profile' ? 'Profile & Business' :
                   activeSection === 'notifications' ? 'Notifications' :
                   activeSection === 'theme' ? 'Appearance' :
                   activeSection === 'payments' ? 'Payments' :
                   activeSection === 'security' ? 'Security' :
                   activeSection === 'language' ? 'Language' :
                   activeSection === 'email' ? 'Business Email' :
                   activeSection === 'tutorials' ? 'Tutorials' :
                   activeSection === 'danger' ? 'Delete Account' : 'Settings'}
                </h1>
                {activeSection === 'main' && (
                  <p className={`text-base ${themeClasses.text.secondary}`}>Manage your preferences</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+100px)]" />

      {/* Content */}
      <div className="px-4 py-4">
        {activeSection === 'main' ? (
          <div className="space-y-6">
            {menuCategories.map((category) => (
              <div key={category.title}>
                {/* Section Header */}
                <h2 className={`text-sm font-semibold ${themeClasses.text.muted} uppercase tracking-wider mb-3 px-1`}>
                  {category.title}
                </h2>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if ('navigateTo' in item && item.navigateTo) {
                          navigate(item.navigateTo);
                        } else {
                          setActiveSection(item.id);
                        }
                      }}
                      className="card-interactive w-full p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`icon-container-md ${item.bgColor}`}>
                          <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${themeClasses.text.primary}`}>{item.label}</p>
                          <p className={`text-sm ${themeClasses.text.secondary}`}>{item.description}</p>
                        </div>
                        {'hasToggle' in item && item.hasToggle ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTheme();
                            }}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                              theme === 'dark' ? 'bg-blue-500' : 'bg-zinc-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                                theme === 'dark' ? 'translate-x-5 ml-0.5 bg-white' : 'translate-x-0.5 bg-white'
                              }`}
                            />
                          </button>
                        ) : (
                          <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Delete Account (Danger Zone) */}
            <div>
              <button
                onClick={() => setActiveSection(dangerItem.id)}
                className="card-interactive w-full p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`icon-container-md ${dangerItem.bgColor}`}>
                    <dangerItem.icon className={`w-5 h-5 ${dangerItem.iconColor}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${dangerItem.iconColor}`}>{dangerItem.label}</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>{dangerItem.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                </div>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="card-interactive w-full p-4 mt-2"
            >
              <div className="flex items-center gap-3">
                <div className="icon-container-md bg-status-red-100">
                  <LogOut className="w-5 h-5 text-status-red-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-status-red-700">
                    {loggingOut ? 'Logging out...' : 'Log Out'}
                  </p>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>{user?.email}</p>
                </div>
                {loggingOut && <Loader2 className="w-5 h-5 text-status-red-600 animate-spin" />}
              </div>
            </button>
          </div>
        ) : (
          renderSection()
        )}
      </div>
    </div>
  );
};

export default Settings;
