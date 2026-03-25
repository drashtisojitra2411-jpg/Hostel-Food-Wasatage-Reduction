import React, { useState, useEffect } from 'react';

export default function MetricCard({ title, value, subtext, icon, color = 'primary', trend = null }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        // Simple count up animation
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        if (isNaN(num)) {
            setDisplayValue(value);
            return;
        }

        let start = 0;
        const duration = 1000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = num / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= num) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(start) + (value.toString().includes('.') ? (start % 1).toFixed(1).substring(1) : ''));
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [value]);

    const colorClasses = {
        primary: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20',
        secondary: 'text-secondary-600 bg-secondary-50 dark:bg-secondary-900/20',
        accent: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20',
        highlight: 'text-highlight-600 bg-highlight-50 dark:bg-highlight-900/20',
        danger: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    };

    return (
        <div className="card hover:scale-105 transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {displayValue}{value.toString().replace(/[0-9.]/g, '')}
                        </span>
                        {trend && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
            </div>
            {subtext && <p className="text-sm text-gray-600 dark:text-gray-400">{subtext}</p>}
        </div>
    );
}
