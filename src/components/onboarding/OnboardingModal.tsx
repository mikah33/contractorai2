import { useState, useEffect } from 'react';
import { User, Building2, Phone, MapPin, FileText, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useData } from '../../contexts/DataContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { user } = useAuthStore();
  const { markProfileCompleted } = useOnboardingStore();
  const { refreshProfile } = useData();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState({
    name: '',
    company: '',
    phone: '',
    address: '',
    defaultTerms: ''
  });

  // Auto-fill from auth metadata when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const metadata = user.user_metadata || {};
      setProfile(prev => ({
        ...prev,
        phone: metadata.phone || prev.phone
      }));
    }
  }, [isOpen, user]);

  const handleChange = (key: keyof typeof profile, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    // Basic validation for required fields
    if (!profile.name.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!profile.company.trim()) {
      alert('Please enter your company name');
      return;
    }

    try {
      setSaving(true);

      console.log('[Onboarding] Saving profile data:', {
        id: user.id,
        phone: profile.phone
      });

      // Save profile to Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile.name,
          company_name: profile.company,
          phone: profile.phone,
          address: profile.address,
          default_terms: profile.defaultTerms,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        console.error('[Onboarding] Profile save error:', profileError);
        throw profileError;
      }

      console.log('[Onboarding] Profile saved successfully:', profileData);

      // Refresh profile in the app
      await refreshProfile();

      // Mark onboarding as completed
      await markProfileCompleted(user.id);

      // Show success briefly then close
      setStep(2);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('[Onboarding] Error saving:', error);
      alert(error?.message || 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-orange-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white">
            {step === 1 ? 'Finish Setting Up Your Account' : 'All Set!'}
          </h2>
          <p className="text-orange-100 text-sm mt-1">
            {step === 1 ? 'Complete your profile to get started' : 'Your profile has been saved'}
          </p>
        </div>

        {step === 1 ? (
          <>
            {/* Form */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-orange-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="John Smith"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                  <Building2 className="w-4 h-4" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-orange-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Smith Roofing LLC"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-orange-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  Business Address
                </label>
                <textarea
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-orange-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              {/* Default Terms */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                  <FileText className="w-4 h-4" />
                  Default Terms & Conditions
                </label>
                <textarea
                  value={profile.defaultTerms}
                  onChange={(e) => handleChange('defaultTerms', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-orange-500/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  placeholder="Payment due within 30 days of invoice..."
                />
                <p className="text-xs text-zinc-500 mt-1">This will auto-fill on new estimates</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#151517] border-t border-orange-500/20">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save & Continue
                  </>
                )}
              </button>
              <p className="text-xs text-zinc-500 text-center mt-3">
                You can update these details anytime in Settings
              </p>
            </div>
          </>
        ) : (
          /* Success Step */
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-white">Profile Saved!</p>
            <p className="text-zinc-400 text-sm mt-1">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
