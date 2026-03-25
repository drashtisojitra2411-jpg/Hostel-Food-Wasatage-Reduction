import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Button from '../components/common/Button'

export default function Vision() {
    const [phase, setPhase] = useState(0)

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 500),  // Initial Pulse
            setTimeout(() => setPhase(2), 1500), // Assembly
            setTimeout(() => setPhase(3), 3000), // Content Reveal
        ]
        return () => timers.forEach(t => clearTimeout(t))
    }, [])

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black overflow-hidden relative font-black perspective-1000">
            {/* Cinematic Background Polish */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(163,230,53,0.05)_0%,transparent_70%)] animate-pulse-slow"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [transform:rotateX(60deg)_translateY(-50%)] origin-top opacity-20"></div>
            </div>

            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">

                {/* 3D COMPONENT ASSEMBLY (Nike-Style Shoe Showcase Equivalent) */}
                <div className="relative w-full h-[60vh] flex items-center justify-center">
                    {/* The "Digital Plate" - Our Core Hardware */}
                    <div className={`relative transition-all duration-1000 transform-style-3d ${phase >= 2 ? 'scale-100 rotate-y-12' : 'scale-0 rotate-y-180'}`}>
                        {/* Outer Geometric Rings */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-creative-lime/20 rounded-full animate-[spin_10s_linear_infinite] [transform:rotateX(70deg)] shadow-[0_0_100px_rgba(163,230,53,0.1)]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-2 border-creative-purple/30 rounded-full animate-[spin_15s_linear_infinite_reverse] [transform:rotateX(-60deg)]"></div>

                        {/* Central Impact Orb */}
                        <div className={`w-64 h-64 rounded-full bg-gradient-to-br from-creative-lime via-white/20 to-creative-purple relative flex items-center justify-center transition-all duration-1000 ${phase >= 2 ? 'opacity-100 translate-z-20 shadow-[0_0_150px_rgba(163,230,53,0.4)]' : 'opacity-0 translate-z-[500px]'}`}>
                            <span className="text-8xl filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">🍽️</span>

                            {/* Satellite Data Nodes */}
                            {[0, 72, 144, 216, 288].map((deg, i) => (
                                <div
                                    key={i}
                                    style={{ transform: `rotate(${deg}deg) translateX(180px)` }}
                                    className={`absolute w-4 h-4 rounded-full bg-white shadow-glow-primary transition-all duration-1000 delay-${i * 100} ${phase >= 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                                >
                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] tracking-widest text-creative-lime whitespace-nowrap opacity-50">NODE_0{i + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dramatic Entry Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <h1 className={`text-[15vw] lg:text-[12vw] font-black tracking-[-0.1em] leading-[0.7] transition-all duration-1000 ${phase === 1 ? 'scale-110 opacity-100 blur-0' : 'scale-150 opacity-0 blur-xl'} absolute uppercase`}>
                            WELCOME
                        </h1>
                        <h1 className={`text-[15vw] lg:text-[12vw] font-black tracking-[-0.1em] leading-[0.7] transition-all duration-1000 ${phase >= 3 ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-32 opacity-0 blur-xl'} uppercase`}>
                            THE VISION<span className="text-creative-lime">.</span>
                        </h1>
                    </div>
                </div>

                {/* THE CORE IDEA (Information Matrix) */}
                <div className={`w-full max-w-7xl mt-24 transition-all duration-1000 delay-500 ${phase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Phase 1: The Problem */}
                        <div className="group p-12 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 hover:border-red-500/50 transition-all duration-500 hover:-translate-y-4">
                            <div className="text-[10px] tracking-[0.6em] text-red-500 mb-8 opacity-50 group-hover:opacity-100 transition-opacity uppercase italic">Global Challenge</div>
                            <h2 className="text-5xl font-black italic tracking-tighter leading-none mb-8">
                                FOOD<br />WASTE.
                            </h2>
                            <p className="text-xs tracking-widest leading-loose text-white/40 group-hover:text-white transition-colors uppercase">
                                1.3 billion tons of food perishes annually while 1 in 9 remain hungry. We are here to address this inefficiency.
                            </p>
                            <div className="mt-8 h-1 w-0 group-hover:w-full bg-red-500 transition-all duration-700"></div>
                        </div>

                        {/* Phase 2: The Solution */}
                        <div className="group p-16 bg-creative-lime rounded-[4rem] text-creative-dark shadow-glow-primary hover:scale-105 transition-all duration-700 relative overflow-hidden">
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/30 rounded-full blur-3xl animate-pulse"></div>
                            <div className="text-[10px] tracking-[0.6em] text-black/40 mb-8 uppercase italic font-black">Core Protocol</div>
                            <h2 className="text-6xl font-black italic tracking-tighter leading-none mb-8">
                                PRECISION<br />FEED.
                            </h2>
                            <p className="text-sm tracking-widest leading-loose font-bold uppercase transition-colors">
                                Through real-time booking algorithms and IoT-driven tracking, we synchronize the supply chain to eliminate the surplus before it's even cooked.
                            </p>
                        </div>

                        {/* Phase 3: The Result */}
                        <div className="group p-12 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 hover:border-creative-purple/50 transition-all duration-500 hover:-translate-y-4 text-right">
                            <div className="text-[10px] tracking-[0.6em] text-creative-purple mb-8 opacity-50 group-hover:opacity-100 transition-opacity uppercase italic">Impact Established</div>
                            <h2 className="text-5xl font-black italic tracking-tighter leading-none mb-8">
                                HUMANITY<br />SYNCED.
                            </h2>
                            <p className="text-xs tracking-widest leading-loose text-white/40 group-hover:text-white transition-colors uppercase">
                                Every plate saved is redirected. Absolute zero waste. Absolute community health. A planetary-scale recalibration of sustenance.
                            </p>
                            <div className="mt-8 h-1 w-0 group-hover:w-full bg-creative-purple transition-all duration-700 ml-auto"></div>
                        </div>
                    </div>
                </div>

                {/* Mission Exit */}
                <div className={`mt-32 transition-all duration-1000 delay-700 ${phase >= 3 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <Link to="/">
                        <Button
                            variant="primary"
                            className="px-32 py-10 text-xl font-black tracking-[0.8em] animate-bounce-slow hover:shadow-glow-primary transition-all"
                        >
                            RETURN TO HOME
                        </Button>
                    </Link>
                </div>
            </main>

            {/* Tactical Hud UI Layer */}
            <div className="fixed inset-0 pointer-events-none z-50">
                <div className="absolute top-12 left-12 w-1 h-24 bg-white/10"></div>
                <div className="absolute top-12 left-12 h-1 w-24 bg-white/10"></div>
                <div className="absolute bottom-12 right-12 w-1 h-24 bg-white/10 text-[8px] [writing-mode:vertical-rl] text-white/20 tracking-widest pl-2">ZEROBITE_SYSTEM_V.1.0</div>
                <div className="absolute bottom-12 right-12 h-1 w-24 bg-white/10"></div>
            </div>
        </div>
    )
}
