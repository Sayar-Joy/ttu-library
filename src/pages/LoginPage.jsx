import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { BookOpen, CreditCard, Zap, Shield, AlertCircle, Loader2, Star, Mail } from 'lucide-react';

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
    <div className="flex w-full min-h-screen">
      {/* Left Side - Immersive Visual */}
      <div className="relative w-1/2 min-h-screen overflow-hidden flex-shrink-0 hidden lg:flex">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-[center_top] brightness-[0.95]"
          style={{ backgroundImage: "url('/images/login.png')" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121c2e]/95 via-[#1b2b48]/45 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-12 pb-16 flex flex-col justify-end gap-4 max-w-[600px]">
          <span className="inline-flex self-start items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            <img src="/images/logo.jpg" alt="TTU Logo" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
            <span>Thanlyin Technological University</span>
          </span>

          <h1 className="text-[42px] font-extrabold leading-[1.15] tracking-tight text-white">
            TTU Library
          </h1>

          <p className="text-lg text-white/85 leading-relaxed">
            Your sanctuary for knowledge, research, and academic<br />inspiration.
          </p>

          <div className="flex flex-col gap-3 border-t border-white/15 pt-5">
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <BookOpen className="w-[18px] h-[18px] flex-shrink-0 opacity-90" />
              <span>Browse thousands of books and engineering references</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <CreditCard className="w-[18px] h-[18px] flex-shrink-0 opacity-90" />
              <span>Verified student membership & seamless checkouts</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <Zap className="w-[18px] h-[18px] flex-shrink-0 opacity-90" />
              <span>Fast one-click university Google authentication</span>
            </div>
          </div>
        </div>

        {/* Top-right crest badge */}
        <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-md border border-white/40 flex items-center justify-center z-20 shadow-lg p-2 overflow-hidden">
          <img src="/images/logo.jpg" alt="TTU Crest" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Right Side - Google OAuth */}
      <div className="flex-1 flex items-center justify-center bg-transparent min-h-screen px-6 py-10">
        <div className="w-full max-w-[440px] flex flex-col items-stretch">
          {/* Card */}
          <div className="bg-white/95 backdrop-blur-md border border-border/80 rounded-2xl p-8 sm:p-10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white shadow-md border border-border/80 flex items-center justify-center p-2 overflow-hidden">
                <img src="/images/logo.jpg" alt="TTU Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-[26px] font-bold text-foreground tracking-tight mb-2">
                Welcome from TTU Library
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Login and browse the whole library
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-3 rounded-lg text-[13px] mb-5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth button */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="w-full bg-foreground text-background border-none rounded-xl px-5 py-3.5 text-[15px] font-semibold flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Connecting to Google…</span>
                  </div>
                ) : (
                  <>
                    <svg className="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24">
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

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
                <Shield className="w-3.5 h-3.5 opacity-70" />
                <span>Secure Google authentication</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-[13px] text-muted-foreground">
              Need assistance?{' '}
              <a
                href="mailto:library@ttu.edu.mm"
                className="text-primary font-medium hover:underline transition-colors inline-flex items-center gap-1"
              >
                <Mail className="w-3 h-3" />
                Contact Librarian Desk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;