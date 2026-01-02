import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service (EULA)</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2, 2025</p>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By downloading, installing, accessing or using the Contractor AI mobile application ("App"), you agree to be bound by these Terms of Service and all applicable laws. This Agreement constitutes a legally binding agreement between you and Elevated Systems LLC ("Contractor AI"). If you do not agree, do not use our App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Subscription Terms and In-App Purchases</h2>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Auto-Renewable Subscriptions</h3>
              <p className="text-gray-700 mb-2">Contractor AI offers the following subscription options through Apple's In-App Purchase system:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Monthly:</strong> $34.99 per month</li>
                <li><strong>Quarterly:</strong> $84.99 per 3 months</li>
                <li><strong>Annual:</strong> $349.99 per year</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Payment and Billing</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Payment charged to your Apple ID at confirmation of purchase</li>
                <li>Subscriptions auto-renew unless turned off 24 hours before period ends</li>
                <li>Renewal charged within 24 hours prior to current period end</li>
                <li>Apple Inc. is the Merchant of Record for all purchases</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Managing Subscriptions</h3>
              <p className="text-gray-700 mb-2">Cancel anytime through your Apple ID:</p>
              <ol className="list-decimal pl-6 space-y-1 text-gray-700">
                <li>Open Settings on your iOS device</li>
                <li>Tap your name at the top</li>
                <li>Tap "Subscriptions"</li>
                <li>Select Contractor AI</li>
                <li>Tap "Cancel Subscription"</li>
              </ol>
              <p className="text-gray-700 mt-2">
                <strong>Important:</strong> You retain access until the end of your billing period. Subscriptions cannot be canceled before the period ends.
              </p>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Refund Policy - All Sales Final</h3>
              <p className="text-gray-700 mb-2 font-semibold">
                ALL PURCHASES ARE FINAL. NO REFUNDS WILL BE PROVIDED ONCE PAYMENT IS PROCESSED.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>All subscription purchases are non-refundable</li>
                <li>No partial refunds for unused subscription periods</li>
                <li>By completing a purchase, you acknowledge and agree that all sales are final</li>
                <li>For iOS purchases, Apple is the merchant of record - any refund requests must be directed to Apple at <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">reportaproblem.apple.com</a></li>
                <li>For web/Stripe purchases, no refunds will be issued under any circumstances</li>
                <li>You may cancel your subscription at any time to prevent future charges, but no refund will be provided for the current billing period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. License Grant</h2>
              <p className="text-gray-700">
                We grant you a limited, non-exclusive, non-transferable, revocable license to use the App on your device for personal or business use. You may not copy, modify, reverse engineer, or distribute the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Accounts</h2>
              <p className="text-gray-700 mb-2">To use our services, you must:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate information</li>
                <li>Maintain account security</li>
                <li>Accept responsibility for all account activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Privacy</h2>
              <p className="text-gray-700">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using the App, you agree to our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Disclaimers</h2>
              <p className="text-gray-700">
                <strong>THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We do not warrant that the App will be error-free, secure, or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
              <p className="text-gray-700">
                To the maximum extent permitted by law, Contractor AI shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid in the last 12 months or $100, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
              <p className="text-gray-700">
                We may suspend or terminate your access for breach of these terms. You may terminate by canceling your subscription and deleting the App.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Apple-Specific Terms</h2>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>This Agreement is between you and Contractor AI, not Apple</li>
                <li>Apple has no obligation to provide support</li>
                <li>Apple is not responsible for any claims relating to the App</li>
                <li>Apple is a third-party beneficiary and may enforce this Agreement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
              <p className="text-gray-700">
                <strong>Elevated Systems LLC</strong><br />
                Email: support@contractorai.work<br />
                Response time: Within 48 hours
              </p>
            </section>

            <section className="border-t pt-4 mt-8">
              <p className="text-sm text-gray-600 text-center">
                BY USING THE APP, YOU ACKNOWLEDGE THAT YOU HAVE READ AND AGREE TO THESE TERMS.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
