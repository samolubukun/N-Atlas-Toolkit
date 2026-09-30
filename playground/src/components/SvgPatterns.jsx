/**
 * SvgPatterns — African wax textile SVG pattern system
 *
 * Architecture note:
 *   CSS `background-image: url("#id")` does NOT work when referencing
 *   SVG patterns from HTML context cross-browser. Instead, each pattern
 *   is rendered as a self-contained <svg> overlay component where the
 *   <pattern> defs and the <rect fill="url(#id)"> live in the SAME SVG.
 *
 * Exports:
 *   <AdireDots />       — double-dot grid, body background watermark
 *   <KenteStripe />     — diagonal crosshatch bands, hero overlay
 *   <AnkaraHex />       — stroke honeycomb, card watermark
 *   <AsoOkeWeave />     — basketweave, sidebar/footer texture
 *   <NsibidiScatter />  — diamond scatter, corner decoration
 *
 *   <PatternLayer pattern="kente-stripe" className="..." />  — convenience wrapper
 */

import React from 'react';

/* ─── 1. ADIRE-DOTS ──────────────────────────────────────────────────────────
   Double-dot grid on 48×48 tile. Large green anchor + micro ochre offsets.
   Classic Adire indigo cloth layout — used as body overlay watermark.
────────────────────────────────────────────────────────────────────────────── */
export function AdireDots({ className = '', style = {} }) {
  const id = 'adire-dots-' + React.useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          {/* Large anchor dot — Nigerian green */}
          <circle cx="24" cy="24" r="1.8" fill="rgba(0,135,81,0.12)" />
          {/* Micro offset dots — ochre gold */}
          <circle cx="12" cy="12" r="1.1" fill="rgba(229,169,60,0.09)" />
          <circle cx="36" cy="12" r="1.1" fill="rgba(229,169,60,0.09)" />
          <circle cx="12" cy="36" r="1.1" fill="rgba(229,169,60,0.09)" />
          <circle cx="36" cy="36" r="1.1" fill="rgba(229,169,60,0.09)" />
          {/* Tiny accent centre dot */}
          <circle cx="24" cy="24" r="0.6" fill="rgba(229,169,60,0.07)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── 2. KENTE-STRIPE ────────────────────────────────────────────────────────
   Diagonal crosshatch in trio groups on 32×32 tile at 45°.
   Inspired by Kente cloth warp/weft band structure.
   Used as a full-bleed overlay behind the hero headline.
────────────────────────────────────────────────────────────────────────────── */
export function KenteStripe({ className = '', style = {} }) {
  const id = 'kente-stripe-' + React.useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          {/* Green stripe trio */}
          <line x1="2"  y1="0" x2="2"  y2="32" stroke="rgba(0,135,81,0.12)"   strokeWidth="1.5" />
          <line x1="5"  y1="0" x2="5"  y2="32" stroke="rgba(0,135,81,0.10)"   strokeWidth="1.5" />
          <line x1="8"  y1="0" x2="8"  y2="32" stroke="rgba(0,135,81,0.08)"   strokeWidth="1"   />
          {/* Ochre stripe trio, offset */}
          <line x1="18" y1="0" x2="18" y2="32" stroke="rgba(229,169,60,0.10)" strokeWidth="1.5" />
          <line x1="21" y1="0" x2="21" y2="32" stroke="rgba(229,169,60,0.08)" strokeWidth="1.5" />
          <line x1="24" y1="0" x2="24" y2="32" stroke="rgba(229,169,60,0.06)" strokeWidth="1"   />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── 3. ANKARA-HEX ──────────────────────────────────────────────────────────
   Stroke-only honeycomb on natural hex packing (52×46 tile).
   Inspired by geometric Ankara print — isometric cube / honeycomb motifs.
   Used as a low-opacity watermark on model card backgrounds.
────────────────────────────────────────────────────────────────────────────── */
export function AnkaraHex({ className = '', style = {} }) {
  const id = 'ankara-hex-' + React.useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="52" height="46" patternUnits="userSpaceOnUse">
          {/* Primary hex — flat-top orientation */}
          <polygon
            points="13,1 39,1 51,23 39,45 13,45 1,23"
            fill="none"
            stroke="rgba(0,135,81,0.09)"
            strokeWidth="1"
          />
          {/* Offset row — upper-right partial */}
          <polygon
            points="39,1 65,1 77,23 65,45 39,45 27,23"
            fill="none"
            stroke="rgba(0,135,81,0.09)"
            strokeWidth="1"
          />
          {/* Offset row — lower-left partial */}
          <polygon
            points="-13,23 13,23 25,45 13,67 -13,67 -25,45"
            fill="none"
            stroke="rgba(0,135,81,0.09)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── 4. ASO-OKE-WEAVE ───────────────────────────────────────────────────────
   Tight basketweave on 16×16 tile.
   Alternating horizontal ochre + vertical green 2px rects.
   Inspired by Aso-Oke interlocked thread weave.
   Used on sidebar panels and footer strip.
────────────────────────────────────────────────────────────────────────────── */
export function AsoOkeWeave({ className = '', style = {} }) {
  const id = 'aso-oke-weave-' + React.useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          {/* Horizontal weft — ochre */}
          <rect x="0"  y="0"  width="7"  height="2" fill="rgba(229,169,60,0.12)" />
          <rect x="9"  y="0"  width="7"  height="2" fill="rgba(229,169,60,0.12)" />
          <rect x="0"  y="8"  width="7"  height="2" fill="rgba(229,169,60,0.12)" />
          <rect x="9"  y="8"  width="7"  height="2" fill="rgba(229,169,60,0.12)" />
          {/* Vertical warp — green */}
          <rect x="0"  y="2"  width="2"  height="6" fill="rgba(0,135,81,0.09)" />
          <rect x="0"  y="10" width="2"  height="6" fill="rgba(0,135,81,0.09)" />
          <rect x="8"  y="2"  width="2"  height="6" fill="rgba(0,135,81,0.09)" />
          <rect x="8"  y="10" width="2"  height="6" fill="rgba(0,135,81,0.09)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── 5. NSIBIDI-SCATTER ─────────────────────────────────────────────────────
   Rotated diamond marks on 64×64 sparse grid.
   Inspired by Nsibidi ideographic script forms + wax print scatter motifs.
   Used as absolute corner decoration in hero sections.
────────────────────────────────────────────────────────────────────────────── */
export function NsibidiScatter({ className = '', style = {} }) {
  const id = 'nsibidi-scatter-' + React.useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
          {/* Diamond 1 — upper-left, cobalt outline */}
          <rect x="8"  y="8"  width="9" height="9" transform="rotate(45 12 12)"
            fill="none" stroke="rgba(27,79,138,0.13)" strokeWidth="1.2" />
          {/* Diamond 2 — upper-right, cobalt filled */}
          <rect x="44" y="4"  width="7" height="7" transform="rotate(45 47 7)"
            fill="rgba(27,79,138,0.05)" stroke="rgba(27,79,138,0.11)" strokeWidth="1" />
          {/* Diamond 3 — centre, ochre */}
          <rect x="28" y="28" width="6" height="6" transform="rotate(45 31 31)"
            fill="none" stroke="rgba(229,169,60,0.11)" strokeWidth="1" />
          {/* Diamond 4 — lower-left, cobalt */}
          <rect x="5"  y="46" width="8" height="8" transform="rotate(45 9 50)"
            fill="none" stroke="rgba(27,79,138,0.10)" strokeWidth="1" />
          {/* Cross accent — lower-right, green */}
          <line x1="48" y1="44" x2="48" y2="52" stroke="rgba(0,135,81,0.10)" strokeWidth="1.2" />
          <line x1="44" y1="48" x2="52" y2="48" stroke="rgba(0,135,81,0.10)" strokeWidth="1.2" />
          {/* Micro dot accent */}
          <circle cx="32" cy="8"  r="1.2" fill="rgba(27,79,138,0.09)" />
          <circle cx="8"  cy="32" r="1.2" fill="rgba(229,169,60,0.09)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── CONVENIENCE WRAPPER ────────────────────────────────────────────────────
   <PatternLayer pattern="kente-stripe" className="..." style={...} />
────────────────────────────────────────────────────────────────────────────── */
const patternMap = {
  'adire-dots':    AdireDots,
  'kente-stripe':  KenteStripe,
  'ankara-hex':    AnkaraHex,
  'aso-oke-weave': AsoOkeWeave,
  'nsibidi-scatter': NsibidiScatter,
};

export function PatternLayer({ pattern, className = '', style = {} }) {
  const Component = patternMap[pattern];
  if (!Component) return null;
  return <Component className={className} style={style} />;
}

export default PatternLayer;
