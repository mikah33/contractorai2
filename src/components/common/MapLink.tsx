import { MapPin, ExternalLink } from 'lucide-react';

interface MapLinkProps {
  address: string;
  className?: string;
  showIcon?: boolean;
  openInNewTab?: boolean;
}

/**
 * MapLink Component
 *
 * Displays an address as a clickable link that opens in Google Maps (web/Android)
 * or Apple Maps (iOS/macOS).
 *
 * Features:
 * - Auto-detects platform (iOS/macOS vs others)
 * - Properly encodes addresses for URLs
 * - Shows map pin icon
 * - Opens in new tab by default
 */
const MapLink = ({
  address,
  className = '',
  showIcon = true,
  openInNewTab = true
}: MapLinkProps) => {

  if (!address || address.trim() === '') {
    return <span className="text-gray-400 text-sm">No location specified</span>;
  }

  /**
   * Generate the appropriate map URL based on the platform
   */
  const getMapUrl = (location: string): string => {
    const encodedAddress = encodeURIComponent(location);

    // Detect if user is on iOS or macOS
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

    if (isAppleDevice) {
      // Apple Maps URL scheme
      return `maps://maps.apple.com/?q=${encodedAddress}`;
    } else {
      // Google Maps URL (works on Android and web)
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const mapUrl = getMapUrl(address);

    if (openInNewTab) {
      window.open(mapUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = mapUrl;
    }
  };

  return (
    <a
      href={getMapUrl(address)}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline transition-colors ${className}`}
      target={openInNewTab ? '_blank' : '_self'}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      title={`Open ${address} in maps`}
    >
      {showIcon && <MapPin className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{address}</span>
      {showIcon && <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />}
    </a>
  );
};

export default MapLink;
