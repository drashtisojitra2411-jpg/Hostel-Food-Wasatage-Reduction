import React, { useEffect, useRef } from 'react';

export default function HeroParticles() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const particleCount = 20;
        const particles = [];

        // Food and Growth icons
        const icons = ['🍎', '🥦', '🥕', '🌾', '🌱', '🌿', '🍃', '🌳'];

        for (let i = 0; i < particleCount; i++) {
            const el = document.createElement('div');
            el.innerHTML = icons[Math.floor(Math.random() * icons.length)];
            el.className = 'absolute text-2xl select-none pointer-events-none opacity-20';

            // Random start position
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;

            // Random animation params
            const duration = 15 + Math.random() * 20;
            const delay = Math.random() * -20;

            el.style.left = `${startX}%`;
            el.style.top = `${startY}%`;
            el.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;

            container.appendChild(el);
            particles.push(el);
        }

        return () => {
            particles.forEach(p => p.remove());
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>
        </div>
    );
}
