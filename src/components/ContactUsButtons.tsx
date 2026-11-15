import React from "react";
import "./ContactUsButtons.css";

export function GmailIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 256 193"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z"/>
      <path fill="#34A853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837l-27.026 25.798z"/>
      <path fill="#EA4335" d="m58.182 93.14l-4.174-38.647l4.174-36.989L128 69.868l69.818-52.364l4.669 34.992l-4.669 40.644L128 145.504z"/>
      <path fill="#FBBC05" d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z"/>
      <path fill="#C5221F" d="m0 49.504l26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z"/>
    </svg>
  );
}

export function LinkedInIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function GitHubIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="github-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        fill="url(#github-gradient)"
      />
    </svg>
  );
}

export interface ContactUsButtonsProps {
  showTitle?: boolean;
  title?: string;
  size?: number;
  iconOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ContactUsButtons({
  showTitle = true,
  title = "Contact Us",
  size = 20,
  iconOnly = false,
  className = "",
  style,
}: ContactUsButtonsProps) {
  return (
    <div className={`contact-buttons-container ${iconOnly ? 'contact-buttons-icon-only' : ''} ${className}`} style={style}>
      {showTitle && <div className="contact-buttons-title">{title}</div>}
      <div className={`contact-buttons-row ${iconOnly ? 'contact-buttons-row-icons' : ''}`}>
        {/* Email */}
        <a
          href="mailto:deadlyvision666@gmail.com"
          className={`contact-btn contact-btn-email ${iconOnly ? 'contact-btn-icon-only' : ''}`}
          aria-label="Send email to deadlyvision666@gmail.com"
          title="Email: deadlyvision666@gmail.com"
        >
          <GmailIcon size={size} />
          {!iconOnly && <span>Email</span>}
        </a>

        {/* LinkedIn */}
        <a
          href="https://www.linkedin.com/in/yashas-gowda-v-18383a332"
          target="_blank"
          rel="noopener noreferrer"
          className={`contact-btn contact-btn-linkedin ${iconOnly ? 'contact-btn-icon-only' : ''}`}
          aria-label="Open LinkedIn Profile"
          title="LinkedIn: Yashas Gowda V"
        >
          <LinkedInIcon size={size} />
          {!iconOnly && <span>LinkedIn</span>}
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/Steve666dev"
          target="_blank"
          rel="noopener noreferrer"
          className={`contact-btn contact-btn-github ${iconOnly ? 'contact-btn-icon-only' : ''}`}
          aria-label="Open GitHub Profile"
          title="GitHub: Steve666dev"
        >
          <GitHubIcon size={size} />
          {!iconOnly && <span>GitHub</span>}
        </a>
      </div>
    </div>
  );
}

export default ContactUsButtons;
