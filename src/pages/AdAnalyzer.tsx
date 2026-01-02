import { useState, useEffect } from 'react';
import { Globe, MessageSquare, Star, Smartphone, Target, CheckCircle, ArrowRight, Zap, Users, TrendingUp, X, Crown, Megaphone, BarChart3, MousePointer, DollarSign, PieChart, Rocket, Loader2, Send } from 'lucide-react';
import { MarketingTutorialModal } from '../components/marketing/MarketingTutorialModal';
import { useOnboardingStore } from '../stores/onboardingStore';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { revenueCatService, PRODUCT_IDS } from '../services/revenueCatService';

const AdAnalyzer = () => {
  const [showModal, setShowModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [showMarketingTutorial, setShowMarketingTutorial] = useState(false);
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [hasAds, setHasAds] = useState(false);
  const [showContactModal, setShowContactModal] = useState<'premium' | 'ads' | null>(null);
  const [contactNote, setContactNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const isIOS = Capacitor.getPlatform() === 'ios';

  const { marketingTutorialCompleted, checkMarketingTutorial, setMarketingTutorialCompleted } = useOnboardingStore();

  // Check tutorial status and subscription status on mount
  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTutorialUserId(user.id);
        const completed = await checkMarketingTutorial(user.id);
        if (!completed) {
          setShowMarketingTutorial(true);
        }

        // Check subscription status on iOS
        if (isIOS) {
          try {
            await revenueCatService.initialize(user.id);
            const status = await revenueCatService.getMarketingSubscriptionStatus();
            setHasPremium(status.hasPremium);
            setHasAds(status.hasAds);
          } catch (error) {
            console.error('[Marketing] Error checking subscription:', error);
          }
        }
      }
    };
    initialize();
  }, []);

  const handleMarketingTutorialComplete = async (dontShowAgain: boolean) => {
    setShowMarketingTutorial(false);
    if (dontShowAgain && tutorialUserId) {
      await setMarketingTutorialCompleted(tutorialUserId, true);
    }
  };

  const handlePurchasePremium = async () => {
    if (!isIOS) {
      // Fallback to email for non-iOS
      window.open('mailto:admin@elevatedsystems.info?subject=Premium%20Plan%20Interest&body=Hi,%20I%27m%20interested%20in%20the%20Premium%20Plan%20for%20ContractorAI.', '_blank');
      return;
    }

    try {
      setPurchasing('premium');
      setPurchaseError(null);

      const result = await revenueCatService.purchaseProduct(PRODUCT_IDS.MARKETING_PREMIUM);

      if (result.success) {
        setHasPremium(true);
        setShowModal(false);
        alert('Thank you for subscribing to Marketing Premium! Our team will be in touch shortly to get you set up.');
      }
    } catch (error: any) {
      console.error('[Marketing] Purchase error:', error);
      setPurchaseError(error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handlePurchaseAds = async () => {
    if (!isIOS) {
      // Fallback to email for non-iOS
      window.open('mailto:admin@elevatedsystems.info?subject=Ads%20%26%20Lead%20Generation%20Interest&body=Hi,%20I%27m%20interested%20in%20the%20Ads%20%26%20Lead%20Generation%20plan%20for%20ContractorAI.', '_blank');
      return;
    }

    try {
      setPurchasing('ads');
      setPurchaseError(null);

      const result = await revenueCatService.purchaseProduct(PRODUCT_IDS.MARKETING_ADS);

      if (result.success) {
        setHasAds(true);
        setShowAdsModal(false);
        alert('Thank you for subscribing to Ads & Lead Generation! Our team will be in touch shortly to discuss your ad campaigns.');
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
    if (!contactNote.trim() || !tutorialUserId) return;

    setSendingNote(true);
    try {
      const packageType = showContactModal === 'premium' ? 'Website + Marketing Package' : 'Ads & Lead Generation Package';
      const productId = showContactModal === 'premium' ? PRODUCT_IDS.MARKETING_PREMIUM : PRODUCT_IDS.MARKETING_ADS;
      const price = showContactModal === 'premium' ? 299.99 : 899.99;

      const { data, error } = await supabase.functions.invoke('notify-marketing-signup', {
        body: {
          userId: tutorialUserId,
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
    <div className="min-h-full bg-[#0F0F0F] pb-24">
      {/* Marketing Tutorial Modal */}
      <MarketingTutorialModal
        isOpen={showMarketingTutorial}
        onClose={() => setShowMarketingTutorial(false)}
        onComplete={handleMarketingTutorialComplete}
      />

      {/* Header - matches app theme */}
      <div className="bg-[#1C1C1E] border-b border-orange-500/30 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="px-4 pb-3 pt-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white">Marketing</h1>
              <p className="text-xs text-zinc-400 leading-tight">Grow your business with premium services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 py-4 space-y-4">
        {/* Premium Plan Card */}
        <button
          onClick={() => setShowModal(true)}
          className={`w-full bg-[#1C1C1E] border rounded-lg p-4 text-left active:scale-[0.98] transition-transform ${
            hasPremium ? 'border-green-500/50' : 'border-orange-500/30'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              hasPremium ? 'bg-green-500/20' : 'bg-orange-500/20'
            }`}>
              <Crown className={`w-6 h-6 ${hasPremium ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
            {hasPremium ? (
              <span className="px-2 py-1 bg-green-500/20 rounded-full text-green-500 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-500 text-xs font-semibold">
                PREMIUM
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Website + Marketing Package</h3>
          <p className="text-zinc-400 text-sm mb-3">FREE professional website, text marketing, automated reviews & more</p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">$299.99</span>
              <span className="text-zinc-400 text-sm">/month</span>
            </div>
            <div className={`flex items-center text-sm font-medium ${hasPremium ? 'text-green-500' : 'text-orange-500'}`}>
              {hasPremium ? 'Manage Subscription' : 'View Details'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </button>

        {/* Ads & Lead Generation Card */}
        <button
          onClick={() => setShowAdsModal(true)}
          className={`w-full bg-[#1C1C1E] border rounded-lg p-4 text-left active:scale-[0.98] transition-transform ${
            hasAds ? 'border-green-500/50' : 'border-orange-500/30'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              hasAds ? 'bg-green-500/20' : 'bg-orange-500/20'
            }`}>
              <Megaphone className={`w-6 h-6 ${hasAds ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
            {hasAds ? (
              <span className="px-2 py-1 bg-green-500/20 rounded-full text-green-500 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-1 bg-orange-500/20 rounded-full text-orange-500 text-xs font-semibold">
                LEAD GEN
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Ads & Lead Generation</h3>
          <p className="text-zinc-400 text-sm mb-3">We run your Meta & Google ads and generate qualified leads for you</p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">$899.99</span>
              <span className="text-zinc-400 text-sm">/month</span>
            </div>
            <div className={`flex items-center text-sm font-medium ${hasAds ? 'text-green-500' : 'text-orange-500'}`}>
              {hasAds ? 'Manage Subscription' : 'View Details'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-h-[90vh] bg-[#1C1C1E] rounded-t-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1C1C1E] border-b border-orange-500/30 px-4 py-4 flex items-center justify-between">
              <div>
                <span className="text-orange-500 text-xs font-semibold">PREMIUM PLAN</span>
                <h2 className="text-lg font-bold text-white">Website + Marketing</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 bg-[#2C2C2E] rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 py-4 space-y-3">
              {/* Pricing */}
              <div className="bg-[#2C2C2E] border border-orange-500/30 rounded-lg p-4 text-center">
                <p className="text-zinc-400 text-sm mb-1">Starting at</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">$299.99</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="text-orange-500 text-sm font-medium">Includes FREE professional website</p>
              </div>

              <h3 className="text-base font-semibold text-white pt-2">What You Get</h3>

              {/* Feature 1 - Website */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm">FREE Professional Website That Ranks</h4>
                    <p className="text-zinc-400 text-xs mt-1">Custom website optimized for Google with local SEO</p>
                    <button
                      onClick={handleViewExample}
                      className="inline-flex items-center text-orange-500 text-xs font-medium mt-2"
                    >
                      View Example <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature 2 - Lead Integration */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Leads Sync to ContractorAI</h4>
                    <p className="text-zinc-400 text-xs mt-1">Website leads automatically appear in your Clients tab</p>
                  </div>
                </div>
              </div>

              {/* Feature 3 - Text Back */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Instant Text-Back System</h4>
                    <p className="text-zinc-400 text-xs mt-1">Missed calls get automatic text responses</p>
                  </div>
                </div>
              </div>

              {/* Feature 4 - Reviews */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">5-Star Reviews on Autopilot</h4>
                    <p className="text-zinc-400 text-xs mt-1">Automated review requests after every job</p>
                  </div>
                </div>
              </div>

              {/* Feature 5 - Remarketing */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">1 Year Text Remarketing</h4>
                    <p className="text-zinc-400 text-xs mt-1">$1,200 value - Re-engage past customers automatically</p>
                  </div>
                </div>
              </div>

              {/* Feature 6 - Weekly SEO */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Weekly SEO Updates</h4>
                    <p className="text-zinc-400 text-xs mt-1">We continuously optimize your site to rank higher</p>
                  </div>
                </div>
              </div>

              {/* Everything Included */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 border border-orange-500/30">
                <h4 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
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
                      <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-zinc-300 text-xs">{item}</span>
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
                      className="w-full mt-3 py-3 bg-[#2C2C2E] border border-orange-500/50 text-orange-500 font-semibold rounded-lg text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Contact Us
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePurchasePremium}
                    disabled={purchasing === 'premium'}
                    className="w-full py-4 bg-orange-500 text-white font-bold rounded-lg text-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center"
                  >
                    {purchasing === 'premium' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isIOS ? (
                      'Subscribe Now - $299.99/month'
                    ) : (
                      'Get Started - Contact Us'
                    )}
                  </button>
                )}
                {purchaseError && purchasing === null && (
                  <p className="text-center text-red-500 text-xs mt-2">{purchaseError}</p>
                )}
                <p className="text-center text-zinc-500 text-xs mt-3">
                  {isIOS ? 'Cancel anytime. Subscription auto-renews monthly.' : 'Limited spots available each month'}
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
            className="w-full max-h-[90vh] bg-[#1C1C1E] rounded-t-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1C1C1E] border-b border-orange-500/30 px-4 py-4 flex items-center justify-between">
              <div>
                <span className="text-orange-500 text-xs font-semibold">LEAD GENERATION</span>
                <h2 className="text-lg font-bold text-white">Ads & Lead Generation</h2>
              </div>
              <button
                onClick={() => setShowAdsModal(false)}
                className="w-10 h-10 bg-[#2C2C2E] rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 py-4 space-y-3">
              {/* Pricing */}
              <div className="bg-[#2C2C2E] border border-orange-500/30 rounded-lg p-4 text-center">
                <p className="text-zinc-400 text-sm mb-1">Starting at</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">$899.99</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="text-orange-500 text-sm font-medium">+ Ad spend (you control your budget)</p>
              </div>

              <h3 className="text-base font-semibold text-white pt-2">What You Get</h3>

              {/* Feature 1 - Meta Ads */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Meta Ads Management</h4>
                    <p className="text-zinc-400 text-xs mt-1">Full Facebook & Instagram ad campaigns targeting your ideal customers</p>
                  </div>
                </div>
              </div>

              {/* Feature 2 - Google Ads */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MousePointer className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Google Ads Management</h4>
                    <p className="text-zinc-400 text-xs mt-1">Search & display ads to capture high-intent local customers</p>
                  </div>
                </div>
              </div>

              {/* Feature 3 - Ad Creatives */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Ad Creatives Included</h4>
                    <p className="text-zinc-400 text-xs mt-1">We create professional images & videos using content you provide or our available assets</p>
                  </div>
                </div>
              </div>

              {/* Feature 4 - Weekly Reports */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Weekly Analytics Reports</h4>
                    <p className="text-zinc-400 text-xs mt-1">Detailed performance reports showing leads, clicks, and ROI</p>
                  </div>
                </div>
              </div>

              {/* Feature 5 - Lead Generation */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Qualified Lead Generation</h4>
                    <p className="text-zinc-400 text-xs mt-1">We generate real leads for your contracting business</p>
                  </div>
                </div>
              </div>

              {/* Feature 6 - Budget Optimization */}
              <div className="bg-[#2C2C2E] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Budget Optimization</h4>
                    <p className="text-zinc-400 text-xs mt-1">We maximize your ad spend to get you the best cost per lead</p>
                  </div>
                </div>
              </div>

              {/* Everything Included */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 border border-orange-500/30">
                <h4 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
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
                      <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-zinc-300 text-xs">{item}</span>
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
                      className="w-full mt-3 py-3 bg-[#2C2C2E] border border-orange-500/50 text-orange-500 font-semibold rounded-lg text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Contact Us
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePurchaseAds}
                    disabled={purchasing === 'ads'}
                    className="w-full py-4 bg-orange-500 text-white font-bold rounded-lg text-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center"
                  >
                    {purchasing === 'ads' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isIOS ? (
                      'Subscribe Now - $899.99/month'
                    ) : (
                      'Contact Us'
                    )}
                  </button>
                )}
                {purchaseError && purchasing === null && (
                  <p className="text-center text-red-500 text-xs mt-2">{purchaseError}</p>
                )}
                <p className="text-center text-zinc-500 text-xs mt-3">
                  {isIOS ? 'Cancel anytime. Ad spend budget separate.' : 'Limited spots available each month'}
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
            className="w-full max-w-md bg-[#1C1C1E] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#1C1C1E] border-b border-orange-500/30 px-4 py-4 flex items-center justify-between">
              <div>
                <span className="text-orange-500 text-xs font-semibold">
                  {showContactModal === 'premium' ? 'WEBSITE + MARKETING' : 'ADS & LEAD GENERATION'}
                </span>
                <h2 className="text-lg font-bold text-white">Contact Us</h2>
              </div>
              <button
                onClick={() => setShowContactModal(null)}
                className="w-10 h-10 bg-[#2C2C2E] rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {noteSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">Message Sent!</h3>
                  <p className="text-zinc-400 text-sm">We'll get back to you shortly.</p>
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-sm mb-4">
                    Have a question or need assistance with your subscription? Leave us a note and we'll get back to you.
                  </p>
                  <textarea
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full h-32 bg-[#2C2C2E] border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleSendContactNote}
                    disabled={sendingNote || !contactNote.trim()}
                    className="w-full mt-4 py-3 bg-orange-500 text-white font-semibold rounded-lg active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
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
