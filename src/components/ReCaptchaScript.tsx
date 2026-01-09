import { useEffect } from 'react';

export const ReCaptchaScript = () => {
  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (!siteKey || siteKey === 'YOUR_RECAPTCHA_V3_SITE_KEY_HERE') {
      console.warn('reCAPTCHA site key not configured');
      return;
    }

    // Check if script is already loaded
    if (document.querySelector('script[src*="recaptcha"]')) {
      return;
    }

    // Create and load reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup function - remove script if component unmounts
      const existingScript = document.querySelector('script[src*="recaptcha"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};