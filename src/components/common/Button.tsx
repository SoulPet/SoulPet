import { FC, ReactNode } from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

export const Button: FC<ButtonProps> = ({
  type = 'button',
  onClick,
  disabled,
  loading,
  children,
  className = '',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}; 