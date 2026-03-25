import React, { useEffect, useState } from 'react';

const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
};

const colors = {
    success: 'border-l-primary-500 text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-300',
    error: 'border-l-red-500 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300',
    warning: 'border-l-highlight-500 text-highlight-700 bg-highlight-50 dark:bg-highlight-900/20 dark:text-highlight-300',
    info: 'border-l-secondary-500 text-secondary-700 bg-secondary-50 dark:bg-secondary-900/20 dark:text-secondary-300'
};

export default function Notification({
    message,
    type = 'info',
    isVisible,
    onClose,
    duration = 3000,
    position = 'top-right' // top-right, bottom-right, top-center, bottom-center
}) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !show) return null;

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'bottom-right': 'bottom-4 right-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };

    const animationClasses = show
        ? 'translate-y-0 opacity-100 scale-100'
        : '-translate-y-4 opacity-0 scale-95';

    return (
        <div className={`fixed z-50 ${positionClasses[position]} transition-all duration-300 ${animationClasses}`}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-l-4 backdrop-blur-md ${colors[type]}`}>
                <span className="text-xl animate-bounce-in">{icons[type]}</span>
                <p className="font-medium whitespace-nowrap">{message}</p>
                <button
                    onClick={() => setShow(false)}
                    className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
