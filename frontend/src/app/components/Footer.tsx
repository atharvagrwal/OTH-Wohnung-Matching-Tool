import { Link } from 'react-router';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold mb-4">Wohnung Matching</h3>
            <p className="text-sm">Connect with roommates and find your perfect accommodation.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Links</h4>
            <nav className="space-y-2 text-sm">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <br />
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </nav>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <p className="text-sm">support@wohnung-matching.de</p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Wohnung Matching. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
