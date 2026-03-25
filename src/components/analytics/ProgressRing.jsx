import React from 'react';

export default function ProgressRing({ progress, size = 120, stroke = 8, color = '#10b981', label }) {
    const normalizedRadius = size / 2 - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <svg
                    height={size}
                    width={size}
                    className="transform -rotate-90 origin-center"
                >
                    <circle
                        stroke="#e5e7eb"
                        strokeWidth={stroke}
                        fill="transparent"
                        r={normalizedRadius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    <circle
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white animate-pulse">
                        {progress}%
                    </span>
                </div>
            </div>
            {label && <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>}
        </div>
    );
}
