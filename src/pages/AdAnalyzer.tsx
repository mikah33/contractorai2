import { useState, useEffect } from 'react';
import { Globe, MessageSquare, Star, Smartphone, Target, CheckCircle, ArrowRight, Zap, Users, TrendingUp, X, Crown, Megaphone, BarChart3, MousePointer, DollarSign, PieChart, Rocket, Loader2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { revenueCatService, PRODUCT_IDS } from '../services/revenueCatService';
import { revenueCatWebService } from '../services/revenueCatWebService';

const AdAnalyzer = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [showModal, setShowModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [hasAds, setHasAds] = useState(false);
  const [showContactModal, setShowContactModal] = useState<'premium' | 'ads' | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const isIOS = Capacitor.getPlatform() === 'ios';

  // Check subscription status on mount and mark marketing as viewed
  useEffect(() => {
    // Mark marketing page as viewed for onboarding checklist
    localStorage.setItem('onsite_marketing_viewed', 'true');

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check subscription status
        try {
          if (isIOS) {
            await revenueCatService.initialize(user.id);
            const status = await revenueCatService.getMarketingSubscriptionStatus();
            setHasPremium(status.hasPremium);
            setHasAds(status.hasAds);
          } else {
            // Web - use RevenueCat Web SDK
            await revenueCatWebService.initialize(user.id);
            const status = await revenueCatWebService.getMarketingSubscriptionStatus();
            setHasPremium(status.hasPremium);
            setHasAds(status.hasAds);
          }
        } catch (error) {
          console.error('[Marketing] Error checking subscription:', error);
        }
      }
    };
    initialize();
  }, []);

  const handlePurchasePremium = async () => {
    try {
      setPurchasing('premium');
      setPurchaseError(null);

      if (isIOS) {
        // iOS - Present RevenueCat native paywall
        await revenueCatService.presentPaywallWithOffering('Marketing');
        const status = await revenueCatService.getMarketingSubscriptionStatus();
        setHasPremium(status.hasPremium);

        if (status.hasPremium) {
          setShowModal(false);
          alert('Thank you for subscribing to Marketing Premium! Our team will be in touch shortly to get you set up.');
        }
      } else {
        // Web - Use RevenueCat Web Billing
        const result = await revenueCatWebService.purchaseByOffering('Marketing');
        const status = await revenueCatWebService.getMarketingSubscriptionStatus();
        setHasPremium(status.hasPremium);

        if (status.hasPremium) {
          setShowModal(false);
          alert('Thank you for subscribing to Marketing Premium! Our team will be in touch shortly to get you set up.');
        }
      }
    } catch (error: any) {
      console.error('[Marketing] Purchase error:', error);
      setPurchaseError(error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseAds = async () => {
    try {
      setPurchasing('ads');
      setPurchaseError(null);

      if (isIOS) {
        // iOS - Present RevenueCat native paywall
        await revenueCatService.presentPaywallWithOffering('Ads Management');
        const status = await revenueCatService.getMarketingSubscriptionStatus();
        setHasAds(status.hasAds);

        if (status.hasAds) {
          setShowAdsModal(false);
          alert('Thank you for subscribing to Ads & Lead Generation! Our team will be in touch shortly to discuss your ad campaigns.');
        }
      } else {
        // Web - Use RevenueCat Web Billing
        const result = await revenueCatWebService.purchaseByOffering('Ads Management');
        const status = await revenueCatWebService.getMarketingSubscriptionStatus();
        setHasAds(status.hasAds);

        if (status.hasAds) {
          setShowAdsModal(false);
          alert('Thank you for subscribing to Ads & Lead Generation! Our team will be in touch shortly to discuss your ad campaigns.');
        }
      }
    } catch (error: any) {
      console.error('[Marketing] Purchase error:', error);
      setPurchaseError(error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleContactUs = () => {
    window.open('mailto:admin@elevatedsystems.info?subject=Premium%20Plan%20Interest&body=Hi,%20I%27m%20interested%20in%20the%20Premium%20Plan%20for%20ContractorAI.', '_blank');
  };

  const handleContactAds = () => {
    window.open('mailto:admin@elevatedsystems.info?subject=Ads%20%26%20Lead%20Generation%20Interest&body=Hi,%20I%27m%20interested%20in%20the%20Ads%20%26%20Lead%20Generation%20plan%20for%20ContractorAI.', '_blank');
  };

  const handleViewExample = () => {
    window.open('https://aaron-construction.netlify.app/', '_blank');
  };

  const handleSendContactNote = async () => {
    if (!contactNote.trim() || !userId) return;

    setSendingNote(true);
    try {
      const packageType = showContactModal === 'premium' ? 'Website + Marketing Package' : 'Ads & Lead Generation Package';
      const productId = showContactModal === 'premium' ? PRODUCT_IDS.MARKETING_PREMIUM : PRODUCT_IDS.MARKETING_ADS;
      const price = showContactModal === 'premium' ? 299.99 : 899.99;

      const { data, error } = await supabase.functions.invoke('notify-marketing-signup', {
        body: {
          userId: userId,
          productId,
          productName: `${packageType} - Contact Request`,
          price,
          note: contactNote,
        },
      });

      console.log('[Contact] Function response:', data, error);

      if (error) {
        console.error('Error sending note:', error, JSON.stringify(error));
        alert('Failed to send message. Please try again.');
      } else if (data && !data.success) {
        console.error('Function returned error:', data.error);
        alert('Failed to send message: ' + (data.error || 'Unknown error'));
      } else {
        setNoteSent(true);
        setContactNote('');
        setTimeout(() => {
          setShowContactModal(null);
          setNoteSent(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending note:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Fixed Header with safe area background */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-5 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-black">Marketing</h1>
                <p className="text-base text-gray-500">Grow your business with premium services</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+100px)]" />

      {/* Cards */}
      <div className="px-4 py-4 space-y-4">
        {/* Premium Plan Card */}
        <div className={`w-full bg-white rounded-2xl border-2 p-8 text-left relative overflow-hidden min-h-[320px] flex flex-col ${
          hasPremium ? 'border-green-400' : 'border-gray-300'
        }`}>
          {/* Background icon visual */}
          <div className="absolute top-4 right-4 opacity-15">
            <Crown className={`w-40 h-40 ${hasPremium ? 'text-green-500' : 'text-blue-500'} transform rotate-12`} />
          </div>

          {/* Header */}
          <div className="flex items-center gap-5 mb-5 relative z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              hasPremium ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              <Crown className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-2xl text-black">Website + Marketing</h3>
              <p className="text-lg text-gray-500">Complete digital presence</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-600 mt-2 mb-6 relative z-10 leading-relaxed font-medium italic flex-grow">
            Get a FREE custom website that ranks on Google, automatic text-back for missed calls, 5-star review requests on autopilot, and leads that sync directly to your app.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => setShowModal(true)}
            className={`w-full py-5 px-6 rounded-xl text-white text-xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg ${
              hasPremium ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-500 shadow-blue-500/20'
            }`}
          >
            <Crown className="w-6 h-6" />
            {hasPremium ? 'Manage Subscription' : 'View Details - $299.99/mo'}
          </button>
        </div>

        {/* Ads & Lead Generation Card */}
        <div className={`w-full bg-white rounded-2xl border-2 p-8 text-left relative overflow-hidden min-h-[320px] flex flex-col ${
          hasAds ? 'border-green-400' : 'border-gray-300'
        }`}>
          {/* Background icon visual */}
          <div className="absolute top-4 right-4 opacity-15">
            <Megaphone className={`w-40 h-40 ${hasAds ? 'text-green-500' : 'text-blue-500'} transform rotate-12`} />
          </div>

          {/* Header */}
          <div className="flex items-center gap-5 mb-5 relative z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              hasAds ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              <Megaphone className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-2xl text-black">Ads & Lead Generation</h3>
              <p className="text-lg text-gray-500">Done-for-you advertising</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-600 mt-2 mb-6 relative z-10 leading-relaxed font-medium italic flex-grow">
            We handle everything — Facebook, Instagram & Google ads with professional creatives, weekly performance reports, and qualified leads delivered straight to you.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => setShowAdsModal(true)}
            className={`w-full py-5 px-6 rounded-xl text-white text-xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg ${
              hasAds ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-500 shadow-blue-500/20'
            }`}
          >
            <Megaphone className="w-6 h-6" />
            {hasAds ? 'Manage Subscription' : 'View Details - $899.99/mo'}
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80" onClick={() => setShowModal(false)}>
          <div
            className={`w-full max-h-[90vh] ${themeClasses.bg.secondary} rounded-t-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 ${themeClasses.bg.secondary} border-b border-blue-500/30 px-4 py-4 flex items-center justify-between`}>
              <div>
                <span className="text-blue-500 text-xs font-semibold">PREMIUM PLAN</span>
                <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Website + Marketing</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className={`w-10 h-10 ${themeClasses.bg.tertiary} rounded-full flex items-center justify-center`}
              >
                <X className={`w-5 h-5 ${themeClasses.text.secondary}`} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 py-4 space-y-3">
              {/* Pricing */}
              <div className={`${themeClasses.bg.tertiary} border border-blue-500/30 rounded-lg p-4 text-center`}>
                <p className={`${themeClasses.text.secondary} text-sm mb-1`}>Starting at</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-3xl font-bold ${themeClasses.text.primary}`}>$299.99</span>
                  <span className={`${themeClasses.text.secondary}`}>/month</span>
                </div>
                <p className="text-blue-500 text-sm font-medium">Includes FREE professional website</p>
              </div>

              <h3 className={`text-base font-semibold ${themeClasses.text.primary} pt-2`}>What You Get</h3>

              {/* Feature 1 - Website */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>FREE Professional Website That Ranks</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Custom website optimized for Google with local SEO</p>
                    <button
                      onClick={handleViewExample}
                      className="inline-flex items-center text-blue-500 text-xs font-medium mt-2"
                    >
                      View Example <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature 2 - Lead Integration */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Leads Sync to ContractorAI</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Website leads automatically appear in your Clients tab</p>
                  </div>
                </div>
              </div>

              {/* Feature 3 - Text Back */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Instant Text-Back System</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Missed calls get automatic text responses</p>
                  </div>
                </div>
              </div>

              {/* Feature 4 - Reviews */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>5-Star Reviews on Autopilot</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Automated review requests after every job</p>
                  </div>
                </div>
              </div>

              {/* Feature 5 - Remarketing */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>1 Year Text Remarketing</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>$1,200 value - Re-engage past customers automatically</p>
                  </div>
                </div>
              </div>

              {/* Feature 6 - Weekly SEO */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Weekly SEO Updates</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>We continuously optimize your site to rank higher</p>
                  </div>
                </div>
              </div>

              {/* Everything Included */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4 border border-blue-500/30`}>
                <h4 className={`font-semibold ${themeClasses.text.primary} text-sm mb-3 flex items-center gap-2`}>
                  <Zap className="w-4 h-4 text-blue-500" />
                  Everything Included
                </h4>
                <div className="space-y-2">
                  {[
                    'Custom website (FREE - $2,500 value)',
                    'Local SEO optimization',
                    'Weekly SEO updates',
                    'Leads sync to ContractorAI',
                    'Missed call text-back',
                    'Automated review requests',
                    'Full CRM + mobile app',
                    '1 year remarketing ($1,200 value)',
                    'Priority support'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className={`${themeClasses.text.primary} text-xs`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 pb-6">
                {hasPremium ? (
                  <>
                    <div className="w-full py-4 bg-green-500/20 border border-green-500 text-green-500 font-bold rounded-lg text-lg text-center">
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Subscribed
                    </div>
                    <button
                      onClick={() => setShowContactModal('premium')}
                      className={`w-full mt-3 py-3 ${themeClasses.bg.tertiary} border border-blue-500/50 text-blue-500 font-semibold rounded-lg text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2`}
                    >
                      <Send className="w-4 h-4" />
                      Contact Us
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePurchasePremium}
                    disabled={purchasing === 'premium'}
                    className={`w-full py-4 bg-blue-500 ${themeClasses.text.primary} font-bold rounded-lg text-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center`}
                  >
                    {purchasing === 'premium' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe Now - $299.99/month'
                    )}
                  </button>
                )}
                {purchaseError && purchasing === null && (
                  <p className="text-center text-red-500 text-xs mt-2">{purchaseError}</p>
                )}
                <p className={`text-center ${themeClasses.text.secondary} text-xs mt-3`}>
                  Cancel anytime. Subscription auto-renews monthly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ads & Lead Generation Modal */}
      {showAdsModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80" onClick={() => setShowAdsModal(false)}>
          <div
            className={`w-full max-h-[90vh] ${themeClasses.bg.secondary} rounded-t-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 ${themeClasses.bg.secondary} border-b border-blue-500/30 px-4 py-4 flex items-center justify-between`}>
              <div>
                <span className="text-blue-500 text-xs font-semibold">LEAD GENERATION</span>
                <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Ads & Lead Generation</h2>
              </div>
              <button
                onClick={() => setShowAdsModal(false)}
                className={`w-10 h-10 ${themeClasses.bg.tertiary} rounded-full flex items-center justify-center`}
              >
                <X className={`w-5 h-5 ${themeClasses.text.secondary}`} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 py-4 space-y-3">
              {/* Pricing */}
              <div className={`${themeClasses.bg.tertiary} border border-blue-500/30 rounded-lg p-4 text-center`}>
                <p className={`${themeClasses.text.secondary} text-sm mb-1`}>Starting at</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`text-3xl font-bold ${themeClasses.text.primary}`}>$899.99</span>
                  <span className={`${themeClasses.text.secondary}`}>/month</span>
                </div>
                <p className="text-blue-500 text-sm font-medium">+ Ad spend (you control your budget)</p>
              </div>

              <h3 className={`text-base font-semibold ${themeClasses.text.primary} pt-2`}>What You Get</h3>

              {/* Feature 1 - Meta Ads */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Meta Ads Management</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Full Facebook & Instagram ad campaigns targeting your ideal customers</p>
                  </div>
                </div>
              </div>

              {/* Feature 2 - Google Ads */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MousePointer className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Google Ads Management</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Search & display ads to capture high-intent local customers</p>
                  </div>
                </div>
              </div>

              {/* Feature 3 - Ad Creatives */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Ad Creatives Included</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>We create professional images & videos using content you provide or our available assets</p>
                  </div>
                </div>
              </div>

              {/* Feature 4 - Weekly Reports */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Weekly Analytics Reports</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>Detailed performance reports showing leads, clicks, and ROI</p>
                  </div>
                </div>
              </div>

              {/* Feature 5 - Lead Generation */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Qualified Lead Generation</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>We generate real leads for your contracting business</p>
                  </div>
                </div>
              </div>

              {/* Feature 6 - Budget Optimization */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${themeClasses.text.primary} text-sm`}>Budget Optimization</h4>
                    <p className={`${themeClasses.text.secondary} text-xs mt-1`}>We maximize your ad spend to get you the best cost per lead</p>
                  </div>
                </div>
              </div>

              {/* Everything Included */}
              <div className={`${themeClasses.bg.tertiary} rounded-lg p-4 border border-blue-500/30`}>
                <h4 className={`font-semibold ${themeClasses.text.primary} text-sm mb-3 flex items-center gap-2`}>
                  <Zap className="w-4 h-4 text-blue-500" />
                  Everything Included
                </h4>
                <div className="space-y-2">
                  {[
                    'Meta (Facebook & Instagram) ads',
                    'Google Search & Display ads',
                    'Professional ad creatives (images & videos)',
                    'Weekly analytics reports',
                    'Qualified lead generation',
                    'A/B testing & optimization',
                    'Landing page optimization',
                    'Retargeting campaigns',
                    'Dedicated account manager'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className={`${themeClasses.text.primary} text-xs`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 pb-6">
                {hasAds ? (
                  <>
                    <div className="w-full py-4 bg-green-500/20 border border-green-500 text-green-500 font-bold rounded-lg text-lg text-center">
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Subscribed
                    </div>
                    <button
                      onClick={() => setShowContactModal('ads')}
                      className={`w-full mt-3 py-3 ${themeClasses.bg.tertiary} border border-blue-500/50 text-blue-500 font-semibold rounded-lg text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2`}
                    >
                      <Send className="w-4 h-4" />
                      Contact Us
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePurchaseAds}
                    disabled={purchasing === 'ads'}
                    className={`w-full py-4 bg-blue-500 ${themeClasses.text.primary} font-bold rounded-lg text-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center`}
                  >
                    {purchasing === 'ads' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe Now - $899.99/month'
                    )}
                  </button>
                )}
                {purchaseError && purchasing === null && (
                  <p className="text-center text-red-500 text-xs mt-2">{purchaseError}</p>
                )}
                <p className={`text-center ${themeClasses.text.secondary} text-xs mt-3`}>
                  Cancel anytime. Ad spend budget separate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 px-4" onClick={() => setShowContactModal(null)}>
          <div
            className={`w-full max-w-md ${themeClasses.bg.secondary} rounded-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`${themeClasses.bg.secondary} border-b border-blue-500/30 px-4 py-4 flex items-center justify-between`}>
              <div>
                <span className="text-blue-500 text-xs font-semibold">
                  {showContactModal === 'premium' ? 'WEBSITE + MARKETING' : 'ADS & LEAD GENERATION'}
                </span>
                <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Contact Us</h2>
              </div>
              <button
                onClick={() => setShowContactModal(null)}
                className={`w-10 h-10 ${themeClasses.bg.tertiary} rounded-full flex items-center justify-center`}
              >
                <X className={`w-5 h-5 ${themeClasses.text.secondary}`} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {noteSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className={`text-lg font-bold ${themeClasses.text.primary} mb-1`}>Message Sent!</h3>
                  <p className={`${themeClasses.text.secondary} text-sm`}>We'll get back to you shortly.</p>
                </div>
              ) : (
                <>
                  <p className={`${themeClasses.text.secondary} text-sm mb-4`}>
                    Have a question or need assistance with your subscription? Leave us a note and we'll get back to you.
                  </p>
                  <textarea
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="Type your message here..."
                    className={`w-full h-32 ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} rounded-lg p-3 ${themeClasses.text.primary} placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-blue-500`}
                  />
                  <button
                    onClick={handleSendContactNote}
                    disabled={sendingNote || !contactNote.trim()}
                    className={`w-full mt-4 py-3 bg-blue-500 ${themeClasses.text.primary} font-semibold rounded-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {sendingNote ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdAnalyzer;
