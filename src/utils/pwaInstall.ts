// Utility functions for PWA installation detection

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function shouldShowInstallPrompt(): boolean {
  // Don't show if already installed
  if (isInStandaloneMode()) {
    return false;
  }

  // Check if user has dismissed the prompt recently (within 7 days)
  const dismissedAt = localStorage.getItem('pwa-install-dismissed');
  if (dismissedAt) {
    const dismissedDate = new Date(dismissedAt);
    const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
      return false;
    }
  }

  // Show for iOS users not in standalone mode
  return isIOS();
}

export function dismissInstallPrompt(): void {
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
}

export function hasSeenInstallPrompt(): boolean {
  return localStorage.getItem('pwa-install-dismissed') !== null;
}
