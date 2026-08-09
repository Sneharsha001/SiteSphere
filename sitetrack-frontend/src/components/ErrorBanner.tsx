import React from 'react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300"
  >
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span className="flex-1 text-sm">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg transition-all cursor-pointer"
      >
        Retry
      </button>
    )}
  </div>
);
