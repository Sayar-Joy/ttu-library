import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import './LoginPage.css';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check existing session or handle OAuth callback
  useEffect(() => {
    let isMounted = true;

    async function checkSessionAndSync() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          setLoading(true);

          // Sync Google OAuth user with database
          const syncRes = await fetch('/api/auth/oauth-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
            })
          });

          const syncData = await syncRes.json();
          if (!syncRes.ok || !syncData.success) {
            throw new Error(syncData.message || 'Failed to synchronize account.');
          }

          if (isMounted) {
            sessionStorage.setItem('ttu_user', JSON.stringify(syncData.user));
            sessionStorage.setItem('ttu_session', JSON.stringify(session));

            if (syncData.user.role === 'librarian') {
              navigate('/admin');
            } else {
              navigate('/bookshelf');
            }
          }
        }
      } catch (err) {
        console.error('Session sync error:', err);
        if (isMounted) {
          setError(err.message || 'Error authenticating with Google. Please try again.');
          setLoading(false);
        }
      }
    }

    checkSessionAndSync();

    // Listen for auth state changes (e.g. after redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        checkSessionAndSync();
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/bookshelf`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (signInError) throw signInError;
    } catch (err) {
      console.error('Google Sign In error:', err);
      setError(err.message || 'Failed to initiate Google Sign In.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side - Immersive Visual */}
      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-overlay" />
        <div className="auth-left-content">
          <div className="auth-university-tag">Taninthayi Technological University</div>
          <h1 className="auth-left-title">TTU Library</h1>
          <p className="auth-left-subtitle">
            Your sanctuary for knowledge, research, and academic<br />inspiration.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <span className="feature-icon">📚</span>
              <span>Browse thousands of books and engineering references</span>
            </div>
            <div className="auth-feature-item">
              <span className="feature-icon">🪪</span>
              <span>Verified student membership & seamless checkouts</span>
            </div>
            <div className="auth-feature-item">
              <span className="feature-icon">⚡</span>
              <span>Fast one-click university Google authentication</span>
            </div>
          </div>
        </div>
        <div className="auth-left-badge">
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0L17.09 8.36H26.18L19.05 13.78L21.92 22L14 17.18L6.08 22L8.95 13.78L1.82 8.36H10.91L14 0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Right Side - Google OAuth Only */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-card-box">
            <div className="auth-portal-header">
              <div className="auth-logo-badge">📖</div>
              <h2 className="form-title">Student & Staff Portal</h2>
              <p className="form-subtitle">
                Sign in with your Google account to access your bookshelf and library services.
              </p>
            </div>

            {error && (
              <div className="auth-error-banner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#E74C3C" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 10.5v.5" stroke="#E74C3C" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="oauth-action-container">
              <button
                type="button"
                className="google-oauth-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <div className="oauth-loading-state">
                    <span className="oauth-spinner" />
                    <span>Connecting to Google…</span>
                  </div>
                ) : (
                  <>
                    <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.01 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="oauth-security-note">
                <span className="security-icon">🔒</span>
                <span>Secure OAuth 2.0 single sign-on powered by Supabase Auth</span>
              </div>
            </div>

            <div className="auth-membership-info-card">
              <div className="info-card-badge">First Time Signing In?</div>
              <p>
                Your account will be created automatically. To borrow books, you'll simply fill out a quick membership verification form for the librarian to approve.
              </p>
            </div>
          </div>

          <div className="auth-footer">
            <p>Need assistance? <a href="mailto:library@ttu.edu.mm" className="auth-footer-link">Contact Librarian Desk</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;