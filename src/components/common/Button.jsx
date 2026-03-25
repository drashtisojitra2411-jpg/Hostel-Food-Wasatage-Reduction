import React from 'react';
import { Link } from 'react-router-dom';

export default function Button({
    children,
    variant = 'primary', // primary, secondary, glow, outline, ghost
    size = 'md', // sm, md, lg, xl
    className = '',
    isLoading = false,
    disabled = false,
    to = null,
    type = 'button',
    onClick,
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest transition-all duration-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden select-none';

    const variants = {
        primary: 'bg-creative-lime text-creative-dark hover:scale-105 active:scale-95 button-shine shadow-[0_10px_30px_-10px_rgba(163,230,53,0.5)]',
        secondary: 'bg-creative-purple text-white hover:scale-105 active:scale-95 button-shine shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)]',
        glow: 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95',
        outline: 'border-2 border-creative-lime/30 text-creative-lime hover:bg-creative-lime hover:text-creative-dark focus:ring-creative-lime',
        ghost: 'text-white/60 hover:text-white hover:bg-white/5'
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-8 py-4 text-sm',
        lg: 'px-10 py-5 text-base',
        xl: 'px-12 py-6 text-xl rounded-[2rem]'
    };

    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

    const [ripples, setRipples] = React.useState([]);

    const createRipple = (event) => {
        const button = event.currentTarget;
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        const rect = button.getBoundingClientRect();

        const x = event.clientX - rect.left - radius;
        const y = event.clientY - rect.top - radius;

        const ripple = {
            id: Date.now(),
            style: {
                width: `${diameter}px`,
                height: `${diameter}px`,
                left: `${x}px`,
                top: `${y}px`,
            }
        };

        setRipples(prev => [...prev, ripple]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== ripple.id));
        }, 600);

        if (onClick) onClick(event);
    };

    const content = (
        <>
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            <span className="relative z-10 flex items-center gap-3">
                {children}
            </span>
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="ripple-effect absolute rounded-full bg-white/20 animate-ripple"
                    style={ripple.style}
                />
            ))}
        </>
    );

    if (to) {
        return (
            <Link to={to} className={classes} {...props} onClick={createRipple}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type={type}
            className={classes}
            onClick={createRipple}
            disabled={disabled || isLoading}
            {...props}
        >
            {content}
        </button>
    );
}
