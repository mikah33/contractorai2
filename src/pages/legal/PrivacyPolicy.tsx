import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 2, 2025</p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Quick Summary:</strong> We collect only what's necessary to provide our services. We never sell your data. Your payment information is handled securely by Apple.
            </p>
          </div>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Account:</strong> Email, name, company name</li>
                <li><strong>Business Data:</strong> Projects, invoices, estimates, client information</li>
                <li><strong>Photos:</strong> Job site photos and documents you upload</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <p className="text-sm text-gray-700">
                  <strong>Apple App Store Subscriptions:</strong> Payment information is processed solely by Apple. We don't have access to your credit card numbers or billing addresses. We only receive confirmation that a subscription was purchased.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Automatically Collected</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Device:</strong> iOS version, device type, unique identifiers</li>
                <li><strong>Usage:</strong> Features used, time spent, interaction patterns</li>
                <li><strong>Location:</strong> Approximate or precise (with permission) for job sites</li>
                <li><strong>Camera/Photos:</strong> Access only with explicit permission</li>
                <li><strong>Calendar:</strong> Only if you enable sync</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Provide app functionality (calculators, project management, invoices)</li>
                <li>AI-powered features (pricing recommendations, insights)</li>
                <li>Verify subscriptions purchased through Apple</li>
                <li>Send notifications (appointments, project updates)</li>
                <li>Customer support and app improvements</li>
                <li>Security and fraud prevention</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Share Your Information</h2>
              <p className="text-gray-700 font-semibold mb-2">WE NEVER SELL YOUR PERSONAL INFORMATION.</p>
              <p className="text-gray-700 mb-2">We only share with:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Supabase:</strong> Secure database hosting (SOC 2, GDPR compliant)</li>
                <li><strong>OpenAI:</strong> AI features (data not used for training)</li>
                <li><strong>Apple:</strong> Subscription management (Apple's privacy policy applies)</li>
                <li><strong>Google Calendar:</strong> Only if you enable sync</li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <p className="text-sm text-gray-700">
                  <strong>Apple's Role:</strong> Apple processes all payments and manages subscriptions. Apple's Privacy Policy governs payment data. View at <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">apple.com/legal/privacy</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security</h2>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Encryption:</strong> SSL/TLS in transit, AES-256 at rest</li>
                <li><strong>Authentication:</strong> Secure OAuth 2.0 and JWT tokens</li>
                <li><strong>Access Controls:</strong> You can only access your own data</li>
                <li><strong>Payments:</strong> Handled by Apple (PCI DSS compliant)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Privacy Rights</h2>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Control Your Data</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Access:</strong> View your data anytime in app settings</li>
                <li><strong>Update:</strong> Edit your information directly</li>
                <li><strong>Export:</strong> Download your data (CSV, PDF)</li>
                <li><strong>Delete:</strong> Request account deletion</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">iOS Permissions</h3>
              <p className="text-gray-700 mb-2">Control app access in Settings:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li><strong>Location:</strong> Settings → Privacy → Location Services → ContractorAI</li>
                <li><strong>Camera:</strong> Settings → ContractorAI → Camera</li>
                <li><strong>Photos:</strong> Settings → ContractorAI → Photos</li>
                <li><strong>Calendar:</strong> Settings → ContractorAI → Calendars</li>
                <li><strong>Notifications:</strong> Settings → Notifications → ContractorAI</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Manage Subscriptions</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>View/cancel: Settings → [Your Name] → Subscriptions → ContractorAI</li>
                <li>Request refund: <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">reportaproblem.apple.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Active accounts: Data retained while subscription is valid</li>
                <li>Deleted accounts: Data removed within 30 days</li>
                <li>Backups: Removed within 90 days</li>
                <li>Legal requirements: May retain as required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Children's Privacy</h2>
              <p className="text-gray-700">
                Contractor AI is for business use by adults 18+. We don't knowingly collect information from children under 13. If we discover we have, we'll delete it immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. California & EU Rights</h2>
              <p className="text-gray-700 mb-2"><strong>California (CCPA):</strong> Right to know, delete, and opt-out (we don't sell data)</p>
              <p className="text-gray-700"><strong>EU (GDPR):</strong> Right to access, rectification, erasure, portability, and object to processing</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy. We'll notify you via email or in-app notice. Continued use means acceptance of changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
              <p className="text-gray-700">
                <strong>Elevated Systems LLC</strong><br />
                Email: support@contractorai.work<br />
                Privacy: privacy@contractorai.work<br />
                Response time: Within 30 days
              </p>
            </section>

            <section className="border-t pt-4 mt-8">
              <p className="text-sm text-gray-600 text-center">
                © 2025 Elevated Systems LLC. All rights reserved.<br />
                By using ContractorAI, you consent to this Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
