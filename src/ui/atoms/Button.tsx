import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = 'ghost', className = '', children, type = 'button', ...props }: ButtonProps) {
  const classes = ['button', variant, className].filter(Boolean).join(' ');
  return <button {...props} type={type} className={classes}>{children}</button>;
}
