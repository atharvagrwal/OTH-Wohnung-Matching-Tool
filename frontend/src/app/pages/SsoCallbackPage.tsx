import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function SsoCallbackPage() {
  const navigate = useNavigate();
  const { completeSsoLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('ssoCode');

    if (!code) {
      setError('Missing SSO login code. Please try again.');
      return;
    }

    completeSsoLogin(code)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('SSO login failed or the code expired. Please try again.'));
  }, [completeSsoLogin, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">SSO Login Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/login" className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-gray-700">
      Signing you in with OTH Single Sign-On...
    </div>
  );
}
