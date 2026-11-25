import React from 'react';

/**
 * Bespoke Royal Knowledge Emblem (Crown + Geometric Compass Octagram)
 * Used across the Pre-Entry Loading Screen and Full-App Cover Screen.
 */
export const RoyalArenaEmblem: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg
    viewBox="0 0 180 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="emblemGlow" cx="50%" cy="45%" r="52%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.34" />
        <stop offset="60%" stopColor="#0EA5E9" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#080C16" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="goldMetallic" x1="25" y1="20" x2="155" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="shieldBg" x1="90" y1="16" x2="90" y2="164" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#16213A" />
        <stop offset="100%" stopColor="#090F1E" />
      </linearGradient>
      <linearGradient id="cyanAccent" x1="40" y1="40" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>

    {/* Soft aura */}
    <circle cx="90" cy="90" r="84" fill="url(#emblemGlow)" />

    {/* Outer Islamic geometric octagram rings */}
    <rect
      x="34"
      y="34"
      width="112"
      height="112"
      rx="18"
      fill="url(#shieldBg)"
      stroke="url(#goldMetallic)"
      strokeWidth="2.5"
    />
    <rect
      x="34"
      y="34"
      width="112"
      height="112"
      rx="18"
      transform="rotate(45 90 90)"
      fill="url(#shieldBg)"
      fillOpacity="0.88"
      stroke="url(#goldMetallic)"
      strokeWidth="2"
    />

    {/* Inner sapphire medallion */}
    <circle
      cx="90"
      cy="90"
      r="49"
      fill="#0B1325"
      stroke="url(#cyanAccent)"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <circle
      cx="90"
      cy="90"
      r="43"
      stroke="url(#goldMetallic)"
      strokeOpacity="0.45"
      strokeWidth="1"
      strokeDasharray="3 4"
    />

    {/* Sculpted Mountain Peak silhouette inside medallion */}
    <path
      d="M54 116L82 70L95 92L106 76L126 116H54Z"
      fill="url(#cyanAccent)"
      fillOpacity="0.22"
      stroke="#38BDF8"
      strokeOpacity="0.65"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* Royal Brushed-Gold Crown */}
    <path
      d="M62 86L68 58L82 72L90 50L98 72L112 58L118 86H62Z"
      fill="url(#goldMetallic)"
      stroke="#FEF9C3"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <rect x="62" y="88" width="56" height="7" rx="3.5" fill="url(#goldMetallic)" />

    {/* Crown jewels */}
    <circle cx="90" cy="48" r="3.2" fill="#FEF08A" />
    <circle cx="67" cy="56" r="2.5" fill="#38BDF8" />
    <circle cx="113" cy="56" r="2.5" fill="#38BDF8" />

    {/* Subtle golden summit star */}
    <path
      d="M90 100L92.4 106.6L99 109L92.4 111.4L90 118L87.6 111.4L81 109L87.6 106.6L90 100Z"
      fill="#FDE047"
    />
  </svg>
);

/**
 * Full-Screen Nocturnal Summit & Golden Astrolabe Backdrop
 * Displayed during the initial Pre-Entry "جاري التحميل..." screen.
 */
export const PreEntryLoadingArtwork: React.FC = () => (
  <svg
    viewBox="0 0 1200 1600"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full object-cover"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="nightSky" x1="600" y1="0" x2="600" y2="1600" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#040814" />
        <stop offset="42%" stopColor="#0B1630" />
        <stop offset="76%" stopColor="#0D1B38" />
        <stop offset="100%" stopColor="#060A14" />
      </linearGradient>
      <radialGradient id="summitBeacon" cx="50%" cy="38%" r="42%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.42" />
        <stop offset="40%" stopColor="#0EA5E9" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#040814" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="peakFront" x1="600" y1="680" x2="600" y2="1600" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1B2A4A" />
        <stop offset="45%" stopColor="#0E172B" />
        <stop offset="100%" stopColor="#060A14" />
      </linearGradient>
      <linearGradient id="peakBack" x1="600" y1="760" x2="600" y2="1450" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#13203B" />
        <stop offset="100%" stopColor="#080D1B" />
      </linearGradient>
      <linearGradient id="goldBeam" x1="600" y1="160" x2="600" y2="860" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0" />
        <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#FDE047" stopOpacity="0.05" />
      </linearGradient>
    </defs>

    {/* Deep nocturnal sky */}
    <rect width="1200" height="1600" fill="url(#nightSky)" />

    {/* Warm golden + sapphire radial glow behind summit */}
    <rect width="1200" height="1600" fill="url(#summitBeacon)" />

    {/* Vertical golden light shaft descending to the peak */}
    <polygon points="480,0 720,0 645,880 555,880" fill="url(#goldBeam)" />

    {/* Subtle starry constellations */}
    <g fill="#E2E8F0">
      <circle cx="150" cy="180" r="2.2" fillOpacity="0.7" />
      <circle cx="265" cy="110" r="1.5" fillOpacity="0.55" />
      <circle cx="380" cy="240" r="2" fillOpacity="0.6" />
      <circle cx="835" cy="155" r="2.4" fillOpacity="0.75" />
      <circle cx="960" cy="240" r="1.7" fillOpacity="0.5" />
      <circle cx="1055" cy="135" r="2.1" fillOpacity="0.65" />
      <circle cx="200" cy="410" r="1.8" fillOpacity="0.5" />
      <circle cx="995" cy="430" r="2" fillOpacity="0.55" />
      <circle cx="315" cy="520" r="1.5" fillOpacity="0.45" />
      <circle cx="890" cy="545" r="1.6" fillOpacity="0.45" />
      <circle cx="110" cy="610" r="2" fillOpacity="0.5" />
      <circle cx="1095" cy="635" r="1.8" fillOpacity="0.5" />
    </g>

    {/* Golden celestial astrolabe rings */}
    <g stroke="#F59E0B" strokeOpacity="0.24" fill="none">
      <circle cx="600" cy="600" r="390" strokeWidth="1.5" />
      <circle cx="600" cy="600" r="330" strokeWidth="1" strokeDasharray="8 12" />
      <circle cx="600" cy="600" r="250" strokeWidth="1.2" strokeOpacity="0.35" />
      <path d="M600 180V1020M180 600H1020" strokeWidth="0.9" strokeOpacity="0.16" />
      <polygon
        points="600,270 833,367 930,600 833,833 600,930 367,833 270,600 367,367"
        strokeWidth="1.1"
        strokeOpacity="0.2"
      />
    </g>

    {/* Distant mountain silhouettes */}
    <path
      d="M-40 1200L220 840L440 1040L600 780L820 1010L1010 830L1240 1160V1600H-40V1200Z"
      fill="url(#peakBack)"
    />

    {/* Hero Mountain Peak ("قمة التحدي") */}
    <path
      d="M-20 1440L260 1020L425 1135L600 720L785 1125L955 990L1220 1420V1600H-20V1440Z"
      fill="url(#peakFront)"
    />
    {/* Crisp golden rim highlight along the mountain ridge */}
    <path
      d="M260 1020L425 1135L600 720L785 1125L955 990"
      stroke="#F59E0B"
      strokeOpacity="0.55"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Subtle cyan snow/moonlight facet */}
    <path
      d="M600 720L665 920L600 865L545 940L600 720Z"
      fill="#38BDF8"
      fillOpacity="0.16"
    />

    {/* Soft valley mist */}
    <ellipse cx="600" cy="1360" rx="680" ry="180" fill="#080C16" fillOpacity="0.82" />
  </svg>
);

/**
 * Full-App Cover Artwork ("صورة للتطبيق كله قبل ما يدخل بالكامل")
 * Grand Architectural Knowledge Championship Dome & Golden Arena Podium
 */
export const FullAppCoverArtwork: React.FC = () => (
  <svg
    viewBox="0 0 1600 900"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full object-cover"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="coverSky" x1="800" y1="0" x2="800" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#050915" />
        <stop offset="48%" stopColor="#0C1732" />
        <stop offset="100%" stopColor="#070B15" />
      </linearGradient>
      <radialGradient id="domeGlow" cx="50%" cy="32%" r="52%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.34" />
        <stop offset="45%" stopColor="#0EA5E9" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#050915" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="archStroke" x1="800" y1="80" x2="800" y2="760" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" stopOpacity="0.65" />
        <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id="arenaFloor" x1="800" y1="620" x2="800" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#132242" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#070B15" stopOpacity="0.98" />
      </linearGradient>
    </defs>

    {/* Base backdrop */}
    <rect width="1600" height="900" fill="url(#coverSky)" />
    <rect width="1600" height="900" fill="url(#domeGlow)" />

    {/* Subtle architectural dome latticework */}
    <g stroke="url(#archStroke)" fill="none">
      {/* Main grand pointed Islamic/modern championship arch */}
      <path d="M260 900V450C260 215 510 85 800 55C1090 85 1340 215 1340 450V900" strokeWidth="2.5" />
      <path d="M350 900V470C350 265 555 150 800 120C1045 150 1250 265 1250 470V900" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M460 900V500C460 330 615 235 800 210C985 235 1140 330 1140 500V900" strokeWidth="1.2" strokeOpacity="0.45" />

      {/* Side colonnade arches */}
      <path d="M70 900V500C70 390 130 330 200 315V900" strokeWidth="1.4" strokeOpacity="0.35" />
      <path d="M1530 900V500C1530 390 1470 330 1400 315V900" strokeWidth="1.4" strokeOpacity="0.35" />

      {/* Geometric crown halo behind center */}
      <circle cx="800" cy="360" r="220" strokeWidth="1.2" strokeDasharray="6 10" strokeOpacity="0.4" />
      <circle cx="800" cy="360" r="155" strokeWidth="1" strokeOpacity="0.3" />
    </g>

    {/* Architectural light rays */}
    <g opacity="0.16">
      <polygon points="800,60 540,760 660,760" fill="#F59E0B" />
      <polygon points="800,60 940,760 1060,760" fill="#F59E0B" />
      <polygon points="800,60 720,760 880,760" fill="#FEF08A" />
    </g>

    {/* Subtle floating knowledge stars */}
    <g fill="#FDE68A" fillOpacity="0.65">
      <circle cx="210" cy="180" r="2" />
      <circle cx="340" cy="120" r="1.8" />
      <circle cx="1260" cy="145" r="2.2" />
      <circle cx="1410" cy="215" r="1.6" />
      <circle cx="620" cy="140" r="1.5" />
      <circle cx="990" cy="155" r="1.5" />
    </g>

    {/* Perspective Championship Arena Floor & Central Podium */}
    <path d="M0 700L800 610L1600 700V900H0V700Z" fill="url(#arenaFloor)" />
    <ellipse cx="800" cy="700" rx="440" ry="62" stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="1.5" />
    <ellipse cx="800" cy="700" rx="280" ry="38" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="2" />
    <ellipse cx="800" cy="700" rx="145" ry="20" fill="#F59E0B" fillOpacity="0.14" stroke="#FDE047" strokeOpacity="0.55" strokeWidth="1.5" />
  </svg>
);
