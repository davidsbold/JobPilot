import React from 'react';

interface SpinnerProps {
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ className = "w-12 h-12" }) => {
  const defaultClasses = "border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin";
  
  // A bit of logic to decide size if not provided via className
  const sizeClass = className.includes('w-') || className.includes('h-') ? '' : 'w-5 h-5';
  
  return (
    <div className={`${defaultClasses} ${sizeClass} ${className}`}></div>
  );
};