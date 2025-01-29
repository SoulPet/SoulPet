import { FC } from 'react';

interface LogoProps {
  size?: number;
}

export const Logo: FC<LogoProps> = ({ size = 32 }) => {
  return (
    <div 
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span className="text-2xl font-bold text-purple-600">SP</span>
    </div>
  );
}; 