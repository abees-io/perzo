"use client";

import React from "react";
import "./assistant-orb.css";

interface AssistantOrbProps {
  size?: "tiny" | "small" | "large";
  state?: "idle" | "thinking" | "listening" | "speaking";
}

export const AssistantOrb: React.FC<AssistantOrbProps> = ({ 
  size = "small", 
  state = "idle" 
}) => {
  return (
    <div className={`assistant-orb-wrapper ${size} state-${state}`}>
      <div className="assistant-orb-glow" />
      <div className="assistant-orb-inner">
        <div className="orb-layers-container">
          <div className="orb-layer layer-1" />
          <div className="orb-layer layer-2" />
          <div className="orb-layer layer-3" />
        </div>
        <div className="orb-highlight" />
      </div>
      <svg className="orb-svg-filters" aria-hidden="true">
        <defs>
          <filter id="orb-marble">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="5"
              seed="1"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.015;0.03;0.015"
                dur="6s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale={
                state === "idle" 
                  ? (size === "large" ? "50" : "10") 
                  : (state === "thinking" ? (size === "large" ? "120" : "25") : (size === "large" ? "90" : "18"))
              } 
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
