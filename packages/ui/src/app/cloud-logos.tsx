import { memo } from "react";

/** Laptop icon for local machine provider cards. */
export const LocalMachineLogo = memo(function LocalMachineLogoComp({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#1a1408" />
        <rect x="9" y="11" width="22" height="14" rx="2" stroke="rgb(var(--highlight))" strokeWidth="1.8" />
        <path d="M6 28h28" stroke="rgb(var(--text-highlight))" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20" cy="18" r="2" fill="rgb(var(--text-highlight))" opacity="0.85" />
      </svg>
    </span>
  );
});
