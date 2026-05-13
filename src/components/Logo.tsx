import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 8L79 19V45C79 64 67.8 81.1 50 90C32.2 81.1 21 64 21 45V19L50 8Z"
        fill="currentColor"
      />

      <path
        d="M50 16L72 24.6V45C72 59.5 63.7 72.3 50 79.8C36.3 72.3 28 59.5 28 45V24.6L50 16Z"
        fill="white"
        fillOpacity="0.14"
      />

      <path
        d="M37 27.5H55.5L64 36V63.5C64 66 62 68 59.5 68H37C34.5 68 32.5 66 32.5 63.5V32C32.5 29.5 34.5 27.5 37 27.5Z"
        fill="white"
      />

      <path
        d="M55.5 27.5V33C55.5 35.2 57.3 37 59.5 37H64L55.5 27.5Z"
        fill="currentColor"
        fillOpacity="0.22"
      />

      <path
        d="M39 43H57"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M39 49.5H57"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M39 56H51"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <g transform="translate(66 62)">
        <circle cx="0" cy="0" r="10" fill="#22D3EE" />
        <path
          d="M-1.5 -6L-5 1H-0.8L-3 7L5 -2H0.8L3 -6H-1.5Z"
          fill="#082F49"
        />
      </g>

      <path
        d="M50 8L79 19V45C79 64 67.8 81.1 50 90C32.2 81.1 21 64 21 45V19L50 8Z"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
    </svg>
  );
};
