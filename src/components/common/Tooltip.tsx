"use client";

import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "right" | "left" | "top" | "bottom";
}

export function Tooltip({ content, children, side = "right" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    // Calculate position based on side
    let top = rect.top + rect.height / 2;
    let left = rect.right + 8; // 8px gap from the element

    if (side === "left") {
      left = rect.left - 8;
    } else if (side === "top") {
      top = rect.top - 8;
      left = rect.left + rect.width / 2;
    } else if (side === "bottom") {
      top = rect.bottom + 8;
      left = rect.left + rect.width / 2;
    }

    setPosition({ top, left });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getTransformClass = () => {
    switch (side) {
      case "right":
      case "left":
        return "-translate-y-1/2";
      case "top":
      case "bottom":
        return "-translate-x-1/2";
      default:
        return "";
    }
  };

  return (
    <>
      <div
        className="relative block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed z-[9999] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg pointer-events-none ${getTransformClass()}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
