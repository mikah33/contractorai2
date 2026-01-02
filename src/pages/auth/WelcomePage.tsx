import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays on mobile
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, that's okay
      });
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover grayscale"
      >
        <source src="/videos/login-background.mov" type="video/quicktime" />
        <source src="/videos/login-background.mov" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Top Section - Logo and Branding */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/logo.png"
              alt="ContractorAI"
              className="w-24 h-24 object-contain rounded-2xl"
            />
          </div>

          {/* App Name */}
          <h1 className="text-4xl font-bold text-white mb-3 text-center">
            ContractorAI
          </h1>

          {/* Tagline */}
          <p className="text-lg text-white/80 text-center max-w-xs">
            The AI-powered app for contractors
          </p>
        </div>

        {/* Bottom Section - Buttons */}
        <div className="px-6 pb-8 space-y-3">
          {/* Login Button */}
          <Link
            to="/auth/login"
            className="block w-full py-4 px-6 bg-white text-black text-center font-semibold rounded-xl text-lg transition-all active:scale-[0.98]"
          >
            Log In
          </Link>

          {/* Create Account Button */}
          <Link
            to="/auth/signup"
            className="block w-full py-4 px-6 bg-transparent border-2 border-white text-white text-center font-semibold rounded-xl text-lg transition-all active:scale-[0.98]"
          >
            Create Account
          </Link>

          {/* Terms and Privacy */}
          <div className="flex items-center justify-center gap-4 text-xs text-white/50 pt-4">
            <Link to="/legal/terms" className="hover:text-white/70 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/legal/privacy" className="hover:text-white/70 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
