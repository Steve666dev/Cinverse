import React from 'react';

interface BookmarkIconProps extends React.SVGProps<SVGSVGElement> {
  saved?: boolean;
  size?: number;
  ribbonColor?: string;
  checkColor?: string;
}

/**
 * Modern Bookmark Icon (Exact 2-Logo from media_1794241307669_82b8a169.png):
 * - When saved: Solid bookmark ribbon with rounded corners, inverted V cutout, and bold rounded checkmark.
 * - When unsaved: Smooth bookmark ribbon outline with plus icon.
 */
export const BookmarkIcon: React.FC<BookmarkIconProps> = ({
  saved = false,
  size = 20,
  className = '',
  style,
  ribbonColor,
  checkColor,
  ...props
}) => {
  if (saved) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        style={{ display: 'block', ...style }}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {/* Solid Rounded Bookmark Ribbon (matching media_1794241307669_82b8a169.png) */}
        <path
          d="M6.2 2C4.43 2 3 3.43 3 5.2V19.8C3 20.9 4.19 21.6 5.1 21.03L12 16.7L18.9 21.03C19.81 21.6 21 20.9 21 19.8V5.2C21 3.43 19.57 2 17.8 2H6.2Z"
          fill={ribbonColor || 'currentColor'}
        />
        {/* Bold Rounded Checkmark */}
        <path
          d="M8.2 11.8L10.7 14.3L15.8 9.2"
          stroke={checkColor || '#0a0a0a'}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: 'block', ...style }}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Crisp Bookmark Outline */}
      <path
        d="M6.2 2.5C4.7 2.5 3.5 3.7 3.5 5.2V19.8C3.5 20.65 4.42 21.19 5.12 20.75L12 16.45L18.88 20.75C19.58 21.19 20.5 20.65 20.5 19.8V5.2C20.5 3.7 19.3 2.5 17.8 2.5H6.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Plus inside ribbon */}
      <line x1="12" y1="8" x2="12" y2="13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9.2" y1="10.75" x2="14.8" y2="10.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

export default BookmarkIcon;
