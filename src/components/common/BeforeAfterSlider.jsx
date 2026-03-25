import React, { useState, useRef, useEffect, useCallback } from 'react';

const BeforeAfterSlider = () => {
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
        e.preventDefault();
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
        <div className="w-full max-w-4xl mx-auto my-12 animate-fade-in relative z-10">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
                    See the <span className="text-green-500">Difference</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Drag the slider to visualize how our system transforms food management operations.
                </p>
            </div>

            <div
                ref={containerRef}
                className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl select-none group border border-gray-200 dark:border-gray-800 cursor-ew-resize"
                onMouseDown={handleContainerClick}
                onTouchStart={startDragging}
            >
                {/* AFTER Content (Background Side) */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-950 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 20px, transparent 20px, transparent 40px)' }}
                    />

                    <div className="text-center p-8 z-0">
                        <div className="w-24 h-24 bg-emerald-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-6xl mb-6 mx-auto shadow-glow-primary animate-pulse-slow border border-emerald-400/30">
                            💎
                        </div>
                        <h3 className="text-4xl font-bold text-white mb-2">Zero Waste</h3>
                        <div className="h-1.5 w-16 bg-emerald-500 mx-auto mb-4 rounded-full" />
                        <p className="text-emerald-100 text-lg max-w-xs mx-auto leading-relaxed">
                            Optimized consumption, significant cost savings, and positive environmental impact.
                        </p>
                    </div>

                    <span className="absolute top-8 right-8 bg-emerald-600/80 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-bold text-sm tracking-wider shadow-lg border border-emerald-400/30 z-10">
                        AFTER
                    </span>
                </div>

                {/* BEFORE Content (Clipped Overlay) */}
                <div
                    className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
                    style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                        WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-orange-950 flex items-center justify-center" style={{ width: containerRef.current?.offsetWidth || '896px' }}>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000 0, #000 20px, transparent 20px, transparent 40px)' }}
                        />

                        <div className="text-center p-8">
                            <div className="w-24 h-24 bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-6xl mb-6 mx-auto border border-red-500/30">
                                🗑️
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-2">High Wastage</h3>
                            <div className="h-1.5 w-16 bg-red-600 mx-auto mb-4 rounded-full" />
                            <p className="text-red-100 text-lg max-w-xs mx-auto leading-relaxed">
                                Uncontrolled dumping, high disposal costs, and harmful greenhouse emissions.
                            </p>
                        </div>

                        <span className="absolute top-8 left-8 bg-black/60 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-bold text-sm tracking-wider shadow-lg border border-white/10">
                            BEFORE
                        </span>
                    </div>
                </div>

                {/* Slider Handle Line */}
                <div
                    className="absolute top-0 bottom-0 z-30 w-1 bg-white/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                >
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl text-emerald-600 transition-transform active:scale-95 border-4 border-white/20 cursor-grab active:cursor-grabbing pointer-events-auto"
                        onMouseDown={startDragging}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BeforeAfterSlider;

