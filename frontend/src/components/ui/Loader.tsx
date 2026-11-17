import type { ReactNode } from 'react';
import './Loader.css';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderVariant = 'inline' | 'block' | 'page' | 'overlay';

export interface LoaderProps {
  label?: ReactNode;
  size?: LoaderSize;
  variant?: LoaderVariant;
  className?: string;
}

export function Loader({
  label = 'Loading…',
  size = 'md',
  variant = 'block',
  className = '',
}: LoaderProps) {
  return (
    <div
      className={`ui-loader ui-loader--${variant} ui-loader--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ui-loader__stage" aria-hidden="true">
        <span className="ui-loader__orbit" />
        <span className="ui-loader__orbit-inner" />
        <div className="ui-loader__core">
          <div className="ui-loader__cube">
            <span className="ui-loader__face ui-loader__face--front" />
            <span className="ui-loader__face ui-loader__face--back" />
            <span className="ui-loader__face ui-loader__face--right" />
            <span className="ui-loader__face ui-loader__face--left" />
            <span className="ui-loader__face ui-loader__face--top" />
            <span className="ui-loader__face ui-loader__face--bottom" />
          </div>
        </div>
        <span className="ui-loader__glow" />
      </div>
      {label ? <p className="ui-loader__label">{label}</p> : null}
    </div>
  );
}

export function PageLoader({
  label = 'Loading…',
  size = 'lg',
  className = '',
}: Omit<LoaderProps, 'variant'>) {
  return <Loader label={label} size={size} variant="page" className={className} />;
}

export default Loader;
