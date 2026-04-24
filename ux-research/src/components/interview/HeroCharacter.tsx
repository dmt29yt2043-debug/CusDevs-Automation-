"use client";

import { useEffect, useState } from "react";

export type HeroMood = "neutral" | "thinking" | "happy" | "excited";

export default function HeroCharacter({
  mood = "neutral",
  talking = false,
}: {
  mood?: HeroMood;
  talking?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const [talkPhase, setTalkPhase] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); schedule(); }, 130);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!talking) { setTalkPhase(0); return; }
    const iv = setInterval(() => setTalkPhase((p) => (p + 1) % 3), 220);
    return () => clearInterval(iv);
  }, [talking]);

  const eyeScaleY = blink ? 0.05 : 1;
  const beakOpen = talking ? [0, 4, 1][talkPhase] : 0;

  return (
    <div style={{ position: "relative", width: 140, height: 160 }}>
      <style>{`
        @keyframes owl-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes owl-shadow {
          0%,100% { transform: translateX(-50%) scaleX(1); opacity: 0.2; }
          50%      { transform: translateX(-50%) scaleX(0.7); opacity: 0.08; }
        }
        .owl-body   { animation: owl-float 3.4s ease-in-out infinite; }
        .owl-shadow { animation: owl-shadow 3.4s ease-in-out infinite; }
      `}</style>

      <div className="owl-shadow" style={{
        position: "absolute", bottom: 0, left: "50%",
        width: 64, height: 10, borderRadius: "50%",
        background: "#5b21b6", filter: "blur(7px)",
      }} />

      <svg className="owl-body" viewBox="0 0 120 150" width={140} height={150} style={{ display: "block" }}>
        <defs>
          {/* Main brown fur */}
          <radialGradient id="og-head" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#c8844a" />
            <stop offset="100%" stopColor="#7b3d10" />
          </radialGradient>
          {/* Small body */}
          <radialGradient id="og-torso" cx="40%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#b87035" />
            <stop offset="100%" stopColor="#6b3210" />
          </radialGradient>
          {/* Facial disc — creamy */}
          <radialGradient id="og-disc" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f5e0c0" />
            <stop offset="100%" stopColor="#d4a96a" />
          </radialGradient>
          {/* Iris blue */}
          <radialGradient id="og-iris" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#7ecbf0" />
            <stop offset="100%" stopColor="#1e6fa8" />
          </radialGradient>
          {/* Belly lighter */}
          <radialGradient id="og-belly" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#e8c080" />
            <stop offset="100%" stopColor="#c0843a" />
          </radialGradient>
        </defs>

        {/* ── WINGS ── drawn before body so body overlaps slightly */}
        {/* Left wing */}
        <ellipse cx="30" cy="115" rx="14" ry="20" fill="#7b3d10" transform="rotate(-15,30,115)" />
        <path d="M22 108 Q18 115 22 124" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M27 106 Q23 115 27 125" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M32 106 Q29 115 32 124" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        {/* Right wing */}
        <ellipse cx="90" cy="115" rx="14" ry="20" fill="#7b3d10" transform="rotate(15,90,115)" />
        <path d="M98 108 Q102 115 98 124" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M93 106 Q97 115 93 125" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <path d="M88 106 Q91 115 88 124" stroke="#5a2c0a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>

        {/* ── SMALL ROUND BODY ── */}
        <ellipse cx="60" cy="118" rx="22" ry="18" fill="url(#og-torso)" />
        {/* belly patch */}
        <ellipse cx="60" cy="118" rx="13" ry="12" fill="url(#og-belly)" />
        {/* feather rows on belly */}
        <path d="M53 112 Q60 115 67 112" stroke="rgba(150,90,20,0.3)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <path d="M51 118 Q60 121 69 118" stroke="rgba(150,90,20,0.3)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <path d="M53 124 Q60 127 67 124" stroke="rgba(150,90,20,0.3)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>

        {/* ── ORANGE FEET ── */}
        {/* left foot */}
        <rect x="47" y="133" width="4.5" height="9" rx="2.2" fill="#e07820" />
        <rect x="42.5" y="135" width="4" height="7" rx="2" fill="#e07820" transform="rotate(-18,42.5,135)"/>
        <rect x="51" y="135" width="4" height="7" rx="2" fill="#e07820" transform="rotate(18,51,135)"/>
        {/* right foot */}
        <rect x="68.5" y="133" width="4.5" height="9" rx="2.2" fill="#e07820" />
        <rect x="64" y="135" width="4" height="7" rx="2" fill="#e07820" transform="rotate(-18,64,135)"/>
        <rect x="72.5" y="135" width="4" height="7" rx="2" fill="#e07820" transform="rotate(18,72.5,135)"/>

        {/* ── LARGE ROUND HEAD ── dominates proportionally */}
        <circle cx="60" cy="58" r="48" fill="url(#og-head)" />

        {/* ── EAR TUFTS (small, top of head) ── */}
        <ellipse cx="38" cy="15" rx="7" ry="11" fill="#7b3d10" transform="rotate(-18,38,15)" />
        <ellipse cx="82" cy="15" rx="7" ry="11" fill="#7b3d10" transform="rotate(18,82,15)" />
        {/* tuft highlight */}
        <ellipse cx="37" cy="14" rx="3.5" ry="6" fill="#9e5520" transform="rotate(-18,37,14)" />
        <ellipse cx="83" cy="14" rx="3.5" ry="6" fill="#9e5520" transform="rotate(18,83,14)" />

        {/* ── FACIAL DISCS — two large overlapping creamy ovals ── */}
        <ellipse cx="43" cy="60" rx="20" ry="22" fill="url(#og-disc)" />
        <ellipse cx="77" cy="60" rx="20" ry="22" fill="url(#og-disc)" />
        {/* thin border */}
        <ellipse cx="43" cy="60" rx="20" ry="22" fill="none" stroke="rgba(140,80,20,0.25)" strokeWidth="1.5"/>
        <ellipse cx="77" cy="60" rx="20" ry="22" fill="none" stroke="rgba(140,80,20,0.25)" strokeWidth="1.5"/>

        {/* ── EYES ── */}
        {/* Left eye */}
        <g style={{ transformOrigin:"43px 58px", transform:`scaleY(${eyeScaleY})`, transition:"transform 0.07s linear" }}>
          <circle cx="43" cy="58" r="14" fill="url(#og-iris)" />
          <circle cx="43" cy="58" r="8"  fill="#161624" />
          {/* main highlight */}
          <circle cx="47"  cy="53" r="4"   fill="white" opacity="0.9" />
          {/* small second highlight */}
          <circle cx="40"  cy="63" r="1.8" fill="white" opacity="0.4" />
        </g>

        {/* Right eye */}
        <g style={{ transformOrigin:"77px 58px", transform:`scaleY(${eyeScaleY})`, transition:"transform 0.07s linear" }}>
          <circle cx="77" cy="58" r="14" fill="url(#og-iris)" />
          <circle cx="77" cy="58" r="8"  fill="#161624" />
          <circle cx="81"  cy="53" r="4"   fill="white" opacity="0.9" />
          <circle cx="74"  cy="63" r="1.8" fill="white" opacity="0.4" />
        </g>

        {/* ── BEAK (small orange triangle, centre) ── */}
        {beakOpen === 0 ? (
          <path d="M55 76 L60 83 L65 76 Z" fill="#e07820" />
        ) : (
          <>
            <path d={`M55 76 L60 ${76 + beakOpen * 0.5} L65 76 Z`} fill="#e07820" />
            <path d={`M56.5 ${76 + beakOpen * 0.5} Q60 ${76 + beakOpen * 1.3} 63.5 ${76 + beakOpen * 0.5}`} fill="#2a0800" />
          </>
        )}
        {/* beak highlight */}
        <path d="M56.5 77.5 L60 80 L63.5 77.5" stroke="rgba(255,190,80,0.55)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>

        {/* ── CHEST FEATHER TUFT (connects head to body) ── */}
        <path d="M46 100 Q60 110 74 100" stroke="#7b3d10" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M50 103 Q60 112 70 103" stroke="#9e5520" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
