export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p>
            Welcome to Wohnung Matching (the "Platform"). We are committed to protecting your privacy and 
            ensuring you have a positive experience on our website. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Profile information (name, email, phone number)</li>
            <li>Housing preferences and search history</li>
            <li>Photos and apartment descriptions (for listings)</li>
            <li>Communication messages and chat history</li>
            <li>Application submissions and responses</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>To provide and maintain the Platform</li>
            <li>To facilitate connections between landlords and tenants</li>
            <li>To send you service-related announcements and updates</li>
            <li>To respond to your inquiries and support requests</li>
            <li>To improve and personalize your experience</li>
            <li>To enforce our Terms of Service and other agreements</li>
            <li>To detect and prevent fraudulent activity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against 
            unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over 
            the internet or electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of certain data processing</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at support@wohnung-matching.de
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating 
            the "Last Modified" date of this policy. Your continued use of the Platform following the posting of 
            revised Privacy Policy means that you accept and agree to the changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            <br />
            Email: support@wohnung-matching.de
          </p>
        </section>

        <p className="text-sm text-gray-500 border-t pt-6 mt-8">
          Last Modified: {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>
    </div>
  );
}
