import React from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';

export default function AdminPage({ title }) {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-creative-lime/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10 space-y-16">
                    {/* Header - Admin Matrix */}
                    <div className="animate-fade-in">
                        <div className="inline-block px-4 py-1.5 border border-creative-lime/30 bg-creative-lime/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] mb-6 text-creative-lime animate-pulse">
                            GLOBAL ADMINISTRATIVE OVERRIDE
                        </div>
                        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                            {title}<br />
                            <span className="text-creative-lime">MATRIX.</span>
                        </h1>
                    </div>

                    <Card variant="premium" className="border-white/5 py-40">
                        <div className="text-center space-y-8">
                            <div className="text-8xl animate-pulse">🚧</div>
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white/80">Module Initializing</h2>
                            <p className="max-w-md mx-auto text-[10px] font-black text-white/30 tracking-[0.3em] uppercase italic leading-loose">
                                The administrative control terminal for {title} is currently under synchronization. High-level clearance required.
                            </p>
                            <div className="flex justify-center gap-2">
                                <div className="w-1 h-1 bg-creative-lime animate-ping" />
                                <div className="w-1 h-1 bg-creative-lime animate-ping delay-100" />
                                <div className="w-1 h-1 bg-creative-lime animate-ping delay-200" />
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
