"use client";

import type { ReactNode } from "react";

/**
 * Centered modal with a backdrop (click-to-close), a title/subtitle header with
 * a close button, and a body. The body typically holds a `<form>` so the
 * footer's submit button lives inside the children.
 */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidthClassName} rounded-2xl border border-[#E8DDE4] bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-[#E8DDE4] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1C1424]">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[#5B4F62]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#5B4F62]/60 transition-colors hover:bg-[#faf4f0] hover:text-[#1C1424]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
