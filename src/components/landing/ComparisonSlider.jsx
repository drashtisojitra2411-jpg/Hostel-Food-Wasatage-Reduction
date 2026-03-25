import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function ComparisonSlider() {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleMove = useCallback((event) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;

        const x = clientX - rect.left;
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));

        setSliderPosition(position);
    }, [isDragging]);

    const startDragging = (e) => {
        e.preventDefault(); // Prevent text selection/drag behavior
        setIsDragging(true);
    };

    const stopDragging = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('mouseup', stopDragging);
            window.addEventListener('touchend', stopDragging);
        } else {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('touchend', stopDragging);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('touchend', stopDragging);
        };
    }, [isDragging, handleMove, stopDragging]);

    // Click to jump to position
    const handleContainerClick = (e) => {
        if (isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full max-w-4xl mx-auto h-[450px] rounded-3xl overflow-hidden shadow-2xl select-none group border border-gray-100 dark:border-gray-800 cursor-ew-resize"
            onMouseDown={handleContainerClick} // Start drag or jump on click
            onTouchStart={startDragging}
        >
            {/* After Image (Sustainability) - Always behind */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-950 flex items-center justify-center">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 2px, transparent 0)', backgroundSize: '40px 40px' }}
                />

                <div className="text-center p-8 z-0">
                    <div className="text-7xl mb-6 animate-bounce-slow">✨</div>
                    <h3 className="text-3xl font-bold text-white mb-3">Zero Waste</h3>
                    <div className="h-1.5 w-16 bg-emerald-500 mx-auto mb-4 rounded-full" />
                    <p className="text-emerald-100 text-lg max-w-xs mx-auto">Efficient, Sustainable, & Optimized Food Management</p>
                </div>

                <div className="absolute top-8 right-8 bg-emerald-600/80 backdrop-blur-md px-5 py-2.5 rounded-xl text-white font-bold tracking-wider z-10 border border-emerald-400/30 shadow-lg">AFTER</div>
            </div>

            {/* Before Image (Waste) - Clipped Overlay */}
            <div
                className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
                style={{
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-red-950 flex items-center justify-center" style={{ width: containerRef.current?.offsetWidth || '896px' }}>
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)' }}
                    />

                    <div className="text-center p-8">
                        <div className="text-7xl mb-6">🗑️</div>
                        <h3 className="text-3xl font-bold text-white mb-3">High Wastage</h3>
                        <div className="h-1.5 w-16 bg-red-600 mx-auto mb-4 rounded-full" />
                        <p className="text-red-100 text-lg max-w-xs mx-auto">Uncontrolled, Costly, & Harmful Environmental Impact</p>
                    </div>

                    <div className="absolute top-8 left-8 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-xl text-white font-bold tracking-wider border border-white/10 shadow-lg">BEFORE</div>
                </div>
            </div>

            {/* Slider Handle Line */}
            <div
                className="absolute top-0 bottom-0 z-30 w-1 bg-white/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
            >
                {/* Visual Handle Circle */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-primary-600 border-4 border-white/20 transition-transform active:scale-95 cursor-grab active:cursor-grabbing pointer-events-auto"
                    onMouseDown={startDragging}
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

