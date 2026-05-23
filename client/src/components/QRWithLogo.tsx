import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { resolveImageUrl } from '@/lib/utils';

interface QRWithLogoProps {
  value: string;
  size: number;
  logoUrl?: string;
  fgColor: string;
  bgColor: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  showLogo?: boolean;
  logoScale?: number; // 0.2 to 0.6, default 0.42
  logoBorderRadius?: number; // 0 to 16, default 8
  logoBorderWidth?: number; // 0 to 8, default 3
  logoBorderColor?: string; // default fgColor
  logoBackgroundColor?: string; // default bgColor
}

export const QRWithLogo: React.FC<QRWithLogoProps> = ({
  value,
  size,
  logoUrl,
  fgColor,
  bgColor,
  level = 'H',
  showLogo = true,
  logoScale = 0.42,
  logoBorderRadius = 8,
  logoBorderWidth = 3,
  logoBorderColor = fgColor,
  logoBackgroundColor = bgColor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug: log the logo URL
  React.useEffect(() => {
    console.log('[QRWithLogo] logoUrl:', logoUrl);
  }, [logoUrl]);

  const logoSrc = resolveImageUrl(logoUrl);

  // إذا لم يكن هناك شعار أو تم تعطيل عرض الشعار، عرض QR عادي
  if (!showLogo || !logoSrc) {
    return (
      <div
        className="inline-block p-6 rounded-2xl"
        style={{ backgroundColor: bgColor }}
      >
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={false}
          fgColor={fgColor}
          bgColor={bgColor}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="inline-block relative"
      style={{
        width: size + 48,
        height: size + 48,
        padding: 24,
        backgroundColor: bgColor,
        borderRadius: 16,
      }}
    >
      {/* QR Code */}
      <div className="absolute inset-6">
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={false}
          fgColor={fgColor}
          bgColor={bgColor}
        />
      </div>

      {/* Logo في المنتصف */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        style={{
          width: size * logoScale,
          height: size * logoScale,
          backgroundColor: logoBackgroundColor,
          borderRadius: logoBorderRadius,
          border: `${logoBorderWidth}px solid ${logoBorderColor}`,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: `0 0 0 ${logoBorderWidth}px ${logoBackgroundColor}`,
        }}
      >
        <img
          src={logoSrc}
          alt="Restaurant Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            console.error('Failed to load logo:', logoUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};
