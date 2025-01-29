import { FC } from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Loading: FC<LoadingProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin`}
      />
    </div>
  );
}; 