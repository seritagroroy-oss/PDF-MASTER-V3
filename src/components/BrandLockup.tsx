import React from 'react';
import { cn } from '../utils/cn';
import { Logo } from './Logo';

interface BrandLockupProps {
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  compact = false,
  dark = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-2xl p-2.5 shadow-lg',
          dark ? 'bg-cyan-400 text-slate-950 shadow-cyan-500/20' : 'bg-slate-900 text-cyan-300 shadow-slate-900/10',
        )}
      >
        <Logo size={compact ? 22 : 26} />
      </div>
      <div className="leading-none">
        <p
          className={cn(
            'font-display font-bold tracking-tight',
            compact ? 'text-lg' : 'text-xl',
            dark ? 'text-white' : 'text-slate-950',
          )}
        >
          PDF<span className={dark ? 'text-cyan-300' : 'text-cyan-500'}>Master</span>
        </p>
        <p
          className={cn(
            'mt-1 text-[11px] uppercase tracking-[0.28em]',
            dark ? 'text-slate-500' : 'text-slate-400',
          )}
        >
          Roy Industrie
        </p>
      </div>
    </div>
  );
};
