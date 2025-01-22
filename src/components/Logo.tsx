import { FC } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: FC<LogoProps> = ({ className = '', size = 400 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="softGradient" x1="20%" y1="20%" x2="80%" y2="80%">
          <stop offset="0%" style={{ stopColor: '#A78BFA' }} />
          <stop offset="50%" style={{ stopColor: '#8B5CF6' }} />
          <stop offset="100%" style={{ stopColor: '#F472B6' }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g opacity="0.3">
        <circle
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke="url(#softGradient)"
          strokeWidth="1"
          opacity="0.2"
        >
          <animate
            attributeName="r"
            values="170;175;170"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="200"
          cy="200"
          r="155"
          fill="none"
          stroke="url(#softGradient)"
          strokeWidth="1.5"
          opacity="0.25"
        >
          <animate
            attributeName="r"
            values="155;160;155"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="200"
          cy="200"
          r="140"
          fill="none"
          stroke="url(#softGradient)"
          strokeWidth="2"
          opacity="0.3"
        >
          <animate
            attributeName="r"
            values="140;145;140"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <circle
        cx="200"
        cy="200"
        r="130"
        fill="url(#softGradient)"
        opacity="0.9"
        filter="url(#glow)"
      />
      <g opacity="0.85">
        <g transform="translate(160, 180)">
          <circle cx="0" cy="0" r="20" fill="white" />
          <circle cx="2" cy="-2" r="12" fill="#8B5CF6" />
          <circle cx="5" cy="-5" r="5" fill="white" />
        </g>
        <g transform="translate(240, 180)">
          <circle cx="0" cy="0" r="20" fill="white" />
          <circle cx="-2" cy="-2" r="12" fill="#8B5CF6" />
          <circle cx="-5" cy="-5" r="5" fill="white" />
        </g>
      </g>
    </svg>
  );
};

export default Logo; 