// CommonAvatar.jsx (no side arm lines)
import * as React from "react";

export default function CommonAvatar({
  width = 220,
  height = 280,
  className = "",
  skin = "#f8e1c7",
  cloth = "#e6e6e6",
  line = "#2b2b2b",
  glasses = "#6d6d6d",
  showGlasses = false,
  mouth,
  headTilt, eyeX, eyeY, browY, leftArmRot, rightArmRot,
  ...props
}) {
  const customVars = {};
  if (mouth != null) customVars["--mouthScale"] = mouth;
  if (headTilt != null) customVars["--headTilt"] = typeof headTilt === "number" ? `${headTilt}deg` : headTilt;
  if (eyeX != null) customVars["--eyeX"] = typeof eyeX === "number" ? `${eyeX}px` : eyeX;
  if (eyeY != null) customVars["--eyeY"] = typeof eyeY === "number" ? `${eyeY}px` : eyeY;
  if (browY != null) customVars["--browY"] = typeof browY === "number" ? `${browY}px` : browY;
  if (leftArmRot != null) customVars["--leftArmRot"] = typeof leftArmRot === "number" ? `${leftArmRot}deg` : leftArmRot;
  if (rightArmRot != null) customVars["--rightArmRot"] = typeof rightArmRot === "number" ? `${rightArmRot}deg` : rightArmRot;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 280"
      width={width}
      height={height}
      className={className}
      style={customVars}
      role="img"
      aria-label="Talking avatar"
      {...props}
    >
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
        </filter>

        <radialGradient id="skinGrad" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor="#eecaa6" />
        </radialGradient>

        <linearGradient id="clothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8f8f8" />
          <stop offset="100%" stopColor={cloth} />
        </linearGradient>
      </defs>

      <style>{`
        :root { --mouthScale: 0.35; --headTilt: 0deg; --eyeX: 0px; --eyeY: 0px; --browY: 0px; --leftArmRot: 0deg; --rightArmRot: 0deg; }

        .o      { stroke:${line}; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .thin   { stroke-width:1.4; }
        .pupil  { fill:#111; transform-origin:center; }
        .ear    { fill:url(#skinGrad); stroke:${line}; stroke-width:1.6; }

        .mouth  { fill:#111; transform-origin:110px 150px; transform: scaleY(var(--mouthScale)); }

        .shawl  { fill:url(#clothGrad); stroke:#bdbdbd; }

        #head { transform-origin:110px 120px; transform: rotate(var(--headTilt)); }

        /* Happy brows */
        #brows { transform: translateY(var(--browY)); }

        #eyes { transform: translate(var(--eyeX), var(--eyeY)); }

        .blink .pupil { animation: blink 4s linear infinite; }
        @keyframes blink { 0%,96%,100% { transform: scaleY(1); } 97%,99% { transform: scaleY(0.05); } }

        #leftArm, #rightArm { transform-origin:center; } /* safe */
      `}</style>

      {/* Card */}
      <rect x="10" y="8" width="200" height="264" rx="16" fill="#fff" filter="url(#softShadow)" />

      {/* ===== HEAD ===== */}
      <g id="head">
        <ellipse className="ear" cx="36" cy="120" rx="12" ry="18" />
        <ellipse className="ear" cx="184" cy="120" rx="12" ry="18" />

        <circle cx="110" cy="120" r="84" fill="url(#skinGrad)" className="o" />

        {/* Happy Brows */}
        <g id="brows" stroke={line} fill="none" strokeWidth="2">
          <path d="M64 96 q12 -6 24 2" />
          <path d="M132 98 q12 -8 24 2" />
        </g>

        {/* Eyes */}
        <g id="eyes">
          <circle cx="78" cy="105" r="6" className="pupil" />
          <circle cx="142" cy="105" r="6" className="pupil" />
        </g>

        {/* Nose */}
        <path d="M110 112 q5 12 0 22" className="o thin" fill="none" />

        {/* Mouth */}
        <rect x="88" y="146" width="44" height="14" rx="7" className="mouth" />
      </g>

      {/* ===== BODY ===== */}
      <g id="body">
        <path d="M48 182 q62 36 124 0 q0 16 -10 26 q-45 14 -104 0 q-10 -10 -10 -26 z" className="shawl" />
        <circle cx="110" cy="200" r="12" fill="#ededed" stroke="#cfcfcf" />
      </g>

      {/* ===== ARMS (Removed curved lines; only small hands remain optional) ===== */}
      <g id="leftArm">
        {/* removed: <path d="M72 172 q-12 18 -10 36" /> */}
        <ellipse cx="60" cy="208" rx="6.2" ry="7.2" className="o" fill="url(#skinGrad)" />
      </g>

      <g id="rightArm">
        {/* removed: <path d="M148 172 q12 18 10 36" /> */}
        <ellipse cx="160" cy="208" rx="6.2" ry="7.2" className="o" fill="url(#skinGrad)" />
      </g>
    </svg>
  );
}
