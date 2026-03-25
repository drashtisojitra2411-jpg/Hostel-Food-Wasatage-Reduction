import React, { useState, useEffect, useRef } from 'react';

export default function StatsCounter({ value, label, icon, duration = 2000 }) {
    const [count, setCount] = useState(0);
    const countRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    // Parse the value (e.g., "50K+" -> 50000)
    const parseValue = (val) => {
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        const suffix = val.includes('K') ? 1000 : val.includes('L') ? 100000 : val.includes('M') ? 1000000 : 1;
        return { number: num * suffix, originalDisplay: val };
    };

    const { number, originalDisplay } = parseValue(value);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (countRef.current) {
            observer.observe(countRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let startTime = null;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - percentage, 4);

            setCount(Math.floor(number * ease));

            if (percentage < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(number); // Ensure exact final value logic handled by display
            }
        };

        requestAnimationFrame(animate);
    }, [isVisible, number, duration]);

    // Format display to match original style (simplified)
    const displayCount = (() => {
        if (!isVisible) return '0';
        if (originalDisplay.includes('K')) return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K+`;
        if (originalDisplay.includes('L')) return `₹${(count / 100000).toFixed(count % 100000 === 0 ? 0 : 1)}L+`;
        if (originalDisplay.includes('%')) return `${count}%`;
        return `${count}+`;
    })();

    return (
        <div ref={countRef} className="relative p-10 rounded-[2.5rem] bg-creative-gray border border-white/5 overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-creative-lime/5 rounded-full blur-3xl group-hover:bg-creative-lime/10 transition-colors duration-700"></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 transition-transform duration-500">
                    {icon}
                </div>
                <div className="text-6xl font-display font-black text-creative-lime mb-2 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(190,242,100,0.3)]">
                    {displayCount}
                </div>
                <div className="text-[10px] text-gray-500 font-black tracking-[.4em] uppercase">
                    {label}
                </div>
            </div>

            {/* Magnetic Border Shine */}
            <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 rounded-[2.5rem] transition-colors pointer-events-none"></div>
        </div>
    );
}
