import React from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function Settings() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-creative-purple/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto relative z-10 space-y-16">
                    {/* Header - System Core */}
                    <div className="animate-fade-in">
                        <div className="inline-block px-4 py-1.5 border border-creative-lime/30 bg-creative-lime/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] mb-6 text-creative-lime animate-pulse">
                            PREFERENCE MATRIX CORE
                        </div>
                        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                            SYSTEM<br />
                            <span className="text-creative-lime">CONFIG.</span>
                        </h1>
                        <p className="mt-8 text-[10px] font-black text-white/30 tracking-[0.3em] uppercase italic">
                            Operational parameters and user identification encryption.
                        </p>
                    </div>

                    <div className="grid gap-12">
                        {/* Profile Identity */}
                        <Card variant="premium" className="border-white/5 p-12 overflow-visible">
                            <div className="flex items-center gap-6 mb-12">
                                <div className="w-2 h-12 bg-creative-lime rounded-full" />
                                <h2 className="text-3xl font-black tracking-tighter italic uppercase text-white/80">User Identity</h2>
                            </div>

                            <form className="space-y-10">
                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Dimensions</label>
                                        <input
                                            className="w-full bg-black border border-white/10 rounded-2xl py-6 px-8 text-xs font-black uppercase tracking-widest focus:border-creative-lime outline-none"
                                            defaultValue="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-4 opacity-50">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Reg Node ID</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-6 px-8 text-xs font-black uppercase tracking-widest cursor-not-allowed"
                                            defaultValue="12345678"
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4 opacity-50">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Encrypted Email</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-6 px-8 text-xs font-black uppercase tracking-widest cursor-not-allowed"
                                        defaultValue="john@example.com"
                                        disabled
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Comms Channel</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-6 px-8 text-xs font-black uppercase tracking-widest focus:border-creative-lime outline-none"
                                        defaultValue="+91 9876543210"
                                    />
                                </div>
                                <div className='pt-6'>
                                    <Button variant="primary" className="w-full py-8 text-[10px]">SAVE MANIFEST CHANGES</Button>
                                </div>
                            </form>
                        </Card>

                        {/* Secondary Config */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card variant="glass" className="p-10 border-white/5">
                                <h3 className="text-xl font-black italic tracking-tighter uppercase text-white/80 mb-8">Culinary Mode</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Dietary Filter</span>
                                        <select className="bg-transparent text-xs font-black uppercase focus:outline-none cursor-pointer">
                                            <option className="bg-black">VEG</option>
                                            <option className="bg-black">NON-VEG</option>
                                            <option className="bg-black">EGGETARIAN</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>

                            <Card variant="glass" className="p-10 border-white/5">
                                <h3 className="text-xl font-black italic tracking-tighter uppercase text-white/80 mb-8">Comms Protocol</h3>
                                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black tracking-widest uppercase text-white">Meal Intercepts</div>
                                        <p className="text-[8px] font-black text-white/20 uppercase">Reminders Active</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-creative-lime" />
                                    </label>
                                </div>
                            </Card>
                        </div>

                        {/* Advanced Destruction */}
                        <div className="pt-12 border-t border-white/5 flex justify-between items-center text-[9px] font-black tracking-[0.3em] text-white/20 uppercase italic">
                            <span>Last Auth Sync: 12.04.2024 // 14:00</span>
                            <button className="text-red-500/40 hover:text-red-500 transition-colors">DEACTIVATE ENTITY</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
