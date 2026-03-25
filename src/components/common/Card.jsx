import React from 'react';

export default function Card({
    children,
    variant = 'glass', // default is now glass
    className = '',
    hover = true,
    padding = 'p-8',
    ...props
}) {
    const baseClasses = `rounded-[2.5rem] transition-all duration-500 ${padding} relative overflow-hidden`;

    const variants = {
        default: 'bg-white dark:bg-gray-800 dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700',
        glass: 'bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-creative-lime/30 group/card',
        premium: 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
    };

    const hoverClasses = hover ? 'hover:-translate-y-2 hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]' : '';

    return (
        <div
            className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
            {...props}
        >
            {variant === 'glass' && (
                <div className="absolute inset-0 bg-gradient-to-br from-creative-lime/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
