"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Luxury splash / preloader screen.
 * Deep Forest Green backdrop with Champagne Gold logo animation.
 * Fades out gracefully once the app has hydrated.
 */
export default function SplashScreen() {
  const pathname = usePathname();
  const isOperationalRoute = Boolean(
    pathname?.startsWith("/staff") || pathname?.startsWith("/admin")
  );
  const [phase, setPhase] = useState<"visible" | "exit" | "gone">(
    isOperationalRoute ? "gone" : "visible"
  );

  useEffect(() => {
    const win = window as Window & { __tuleSplashDone?: boolean };
    if (isOperationalRoute) {
      win.__tuleSplashDone = true;
      window.dispatchEvent(new CustomEvent("tule-splash-exit"));
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitDelay = reduceMotion ? 200 : 1800;
    const removeDelay = reduceMotion ? 350 : 2600;

    const exitTimer = setTimeout(() => {
      setPhase("exit");
      win.__tuleSplashDone = true;
      window.dispatchEvent(new CustomEvent("tule-splash-exit"));
    }, exitDelay);
    const removeTimer = setTimeout(() => setPhase("gone"), removeDelay);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [isOperationalRoute]);

  if (isOperationalRoute || phase === "gone") return null;

  return (
    <div
      id="tule-splash-screen"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#163D32",
        opacity: phase === "exit" ? 0 : 1,
        transition: "opacity 0.8s cubic-bezier(.4,0,.2,1)",
        pointerEvents: phase === "exit" ? "none" : "auto",
      }}
    >
      {/* Warm radial glow */}
      <div
        style={{
          position: "absolute",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(197,164,109,0.14) 0%, rgba(138,155,131,0.08) 40%, transparent 70%)",
          filter: "blur(40px)",
          animation: "splash-glow 2.4s ease-in-out infinite alternate",
        }}
      />

      {/* Logo container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          animation: "splash-logo-enter 1s cubic-bezier(.16,1,.3,1) both",
        }}
      >
        {/* Logo with champagne gold ring */}
        <div
          style={{
            position: "relative",
            width: "120px",
            height: "120px",
            animation: "splash-logo-pulse 2.2s ease-in-out infinite",
          }}
        >
          {/* Rotating champagne gold ring */}
          <div
            style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "50%",
              border: "1.5px solid transparent",
              borderTopColor: "#C5A46D",
              borderRightColor: "rgba(197,164,109,0.3)",
              animation: "splash-ring-spin 2s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "-14px",
              borderRadius: "50%",
              border: "1px solid transparent",
              borderBottomColor: "rgba(197,164,109,0.45)",
              borderLeftColor: "rgba(197,164,109,0.12)",
              animation: "splash-ring-spin 3s linear infinite reverse",
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tule-resort-logo.png"
            alt=""
            width={120}
            height={120}
            style={{
              width: "120px",
              height: "120px",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 32px rgba(197,164,109,0.25))",
            }}
          />
        </div>

        {/* Brand text */}
        <div
          style={{
            textAlign: "center",
            animation: "splash-text-enter 0.8s cubic-bezier(.16,1,.3,1) 0.3s both",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "30px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#F5F0E6",
            }}
          >
            Tule Resort
          </div>
          <div
            style={{
              marginTop: "6px",
              fontFamily: "var(--font-bricolage), system-ui, sans-serif",
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "#C5A46D",
            }}
          >
            Hawassa · Ethiopia
          </div>
        </div>

        {/* Champagne gold progress bar */}
        <div
          style={{
            width: "140px",
            height: "2px",
            borderRadius: "2px",
            background: "rgba(197,164,109,0.15)",
            overflow: "hidden",
            marginTop: "8px",
            animation: "splash-text-enter 0.6s cubic-bezier(.16,1,.3,1) 0.5s both",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              background: "linear-gradient(90deg, #C5A46D, #D4B87D, #C5A46D)",
              animation: "splash-progress 1.6s cubic-bezier(.4,0,.2,1) 0.2s both",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splash-logo-enter {
          from { opacity: 0; transform: scale(0.7) translateY(20px); filter: blur(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes splash-text-enter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-logo-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes splash-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splash-glow {
          from { transform: scale(0.92); opacity: 0.6; }
          to   { transform: scale(1.08); opacity: 1; }
        }
        @keyframes splash-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          #tule-splash-screen * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

