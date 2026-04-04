import React, { useState, useEffect } from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import api from '../../lib/api';

export default function Impact() {
    const [animatedValues, setAnimatedValues] = useState({
        foodSaved: 0,
        money: 0,
        mealsRescued: 0,
        meals: 0
    });

    const [trees, setTrees] = useState(0);
    const [targets, setTargets] = useState({
        foodSaved: 0,
        money: 0,
        mealsRescued: 0,
        meals: 0,
        trees: 0
    });

    const growthData = [
        { month: 'MEALS', value: Math.min(100, Math.round(targets.meals)) || 0, icon: 'ðŸŒ±' },
        { month: 'RESCUED', value: Math.min(100, Math.round(targets.mealsRescued)) || 0, icon: 'ðŸŒ¿' },
        { month: 'MONEY', value: Math.min(100, Math.round(targets.money / 100)) || 0, icon: 'ðŸŒ³' },
        { month: 'FOOD', value: Math.min(100, Math.round(targets.foodSaved * 2)) || 0, icon: 'ðŸŒ²', active: true }
    ];

    useEffect(() => {
        async function loadImpact() {
            try {
                const res = await api.get('/impact');
                const foodSaved = Number(res?.food_saved || 0);
                const mealsRescued = Number(res?.meals_rescued || 0);
                const money = Math.round(foodSaved * 340);
                const treeCount = Math.max(0, Math.round(foodSaved / 2.5));

                setTargets({
                    foodSaved,
                    money,
                    mealsRescued,
                    meals: mealsRescued,
                    trees: treeCount
                });
            } catch {
                setTargets({
                    foodSaved: 0,
                    money: 0,
                    mealsRescued: 0,
                    meals: 0,
                    trees: 0
                });
            }
        }

        loadImpact();
    }, []);

    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;

        let step = 0;
        const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedValues({
                foodSaved: targets.foodSaved * easeOut,
                money: targets.money * easeOut,
                mealsRescued: targets.mealsRescued * easeOut,
                meals: targets.meals * easeOut
            });

            setTrees(Math.floor(targets.trees * easeOut));

            if (step >= steps) clearInterval(timer);
        }, interval);

        return () => clearInterval(timer);
    }, [targets]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-creative-lime/5 blur-[180px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10 space-y-16">
                    <div className="text-center space-y-8 animate-fade-in mb-24">
                        <div className="inline-block px-4 py-1.5 border border-creative-lime/30 bg-creative-lime/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] text-creative-lime animate-pulse">
                            GLOBAL CONTRIBUTION TELEMETRY
                        </div>
                        <h1 className="text-[120px] lg:text-[180px] font-black tracking-tighter leading-[0.7] italic uppercase">
                            ALTRUISTIC
                            <br />
                            <span className="text-creative-lime">VELOCITY.</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-[10px] font-black text-white/30 tracking-[0.3em] uppercase italic font-bold">
                            Your operational consistency has accelerated the humanitarian impact cycle.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card variant="glass" className="p-8 border-white/5 hover:border-creative-lime/30 transition-all duration-700 group">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    ðŸŒ
                                </div>
                                <span className="text-[10px] font-black text-creative-lime border border-creative-lime/20 px-3 py-1 rounded-full">+12.4%</span>
                            </div>
                            <h3 className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-2">FOOD SAVED</h3>
                            <div className="text-5xl font-black italic tracking-tighter">
                                {animatedValues.foodSaved.toFixed(1)} <span className="text-sm text-white/20 uppercase font-black tracking-widest">KG</span>
                            </div>
                            <div className="w-full bg-white/5 h-1 mt-8 rounded-full overflow-hidden">
                                <div className="h-full bg-creative-lime/40 group-hover:bg-creative-lime w-[70%] transition-all duration-1000" />
                            </div>
                        </Card>

                        <Card variant="glass" className="p-8 border-white/5 hover:border-creative-purple/30 transition-all duration-700 group">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    ðŸ’°
                                </div>
                            </div>
                            <h3 className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-2">CAPITAL EFFICIENCY</h3>
                            <div className="text-5xl font-black italic tracking-tighter">
                                â‚¹{Math.floor(animatedValues.money).toLocaleString()}
                            </div>
                            <div className="w-full bg-white/5 h-1 mt-8 rounded-full overflow-hidden">
                                <div className="h-full bg-creative-purple/40 group-hover:bg-creative-purple w-[85%] transition-all duration-1000" />
                            </div>
                        </Card>

                        <Card variant="glass" className="p-8 border-white/5 hover:border-orange-500/30 transition-all duration-700 group">
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    ðŸ²
                                </div>
                            </div>
                            <h3 className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-2">MEALS RESCUED</h3>
                            <div className="text-5xl font-black italic tracking-tighter">
                                {Math.floor(animatedValues.mealsRescued)}
                            </div>
                            <div className="w-full bg-white/5 h-1 mt-8 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500/40 group-hover:bg-orange-500 w-[45%] transition-all duration-1000" />
                            </div>
                        </Card>

                        <Card variant="premium" className="p-8 border-none bg-creative-lime group hover:scale-[1.02] transition-all duration-700 overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 text-[200px] text-black/5 select-none transition-transform group-hover:-translate-x-4">ðŸŒ²</div>
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center text-2xl">
                                    ðŸŒ²
                                </div>
                            </div>
                            <h3 className="text-[10px] font-black text-black/40 tracking-widest uppercase mb-2 relative z-10">ECOLOGICAL EQUIVALENT</h3>
                            <div className="text-5xl font-black italic tracking-tighter text-black relative z-10 leading-tight">
                                {trees} <span className="text-sm uppercase font-black tracking-widest block opacity-60">PLANTED NODES</span>
                            </div>
                            <div className="w-full bg-black/10 h-1 mt-8 rounded-full overflow-hidden relative z-10">
                                <div className="h-full bg-black/40 w-[60%]" />
                            </div>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        <Card variant="glass" className="min-h-[500px] border-white/5 flex flex-col p-12 overflow-hidden group">
                            <h3 className="text-2xl font-black tracking-tighter italic uppercase text-white/80 mb-20">Wastage Reduction Growth</h3>

                            <div className="flex-1 flex items-end justify-center gap-12 relative">
                                <div className="absolute inset-0 bg-white/[0.02] rounded-3xl -m-6 border border-white/5 pointer-events-none" />
                                {growthData.map((point, index) => (
                                    <div key={index} className="text-center flex flex-col items-center">
                                        <div className="text-[10px] font-black text-white/20 mb-4 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{point.month}</div>
                                        <div
                                            className={`w-8 rounded-t-2xl transition-all duration-1000 ease-out group-hover:delay-[${index * 100}ms] ${point.active ? 'bg-creative-lime' : 'bg-white/10'}`}
                                            style={{ height: `${Math.max(8, point.value)}%` }}
                                        />
                                        <div className="mt-6 text-3xl animate-bounce-in">{point.icon}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card variant="premium" className="border-white/5 p-12">
                            <h3 className="text-2xl font-black tracking-tighter italic uppercase text-white/80 mb-12">Merit Clearances</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { icon: 'ðŸŒŸ', title: 'INITIATE', locked: false },
                                    { icon: 'ðŸ”¥', title: 'STREAK 7', locked: false },
                                    { icon: 'ðŸ’§', title: 'AQUA SAVER', locked: false },
                                    { icon: 'ðŸ‘‘', title: 'REDUCTION MASTER', locked: true },
                                    { icon: 'ðŸ¤', title: 'DONO CORE', locked: true },
                                    { icon: 'ðŸŒ', title: 'PLANET LEGEND', locked: true }
                                ].map((badge) => (
                                    <div
                                        key={badge.title}
                                        className={`group p-8 rounded-3xl border transition-all duration-500 flex items-center gap-6 ${
                                            badge.locked
                                                ? 'border-white/5 bg-white/[0.02] grayscale opacity-40 hover:opacity-60'
                                                : 'border-white/10 bg-white/5 hover:border-creative-lime/50 active:scale-95 cursor-pointer'
                                        }`}
                                    >
                                        <div className={`text-3xl ${!badge.locked && 'animate-pulse-slow'}`}>
                                            {badge.icon}
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-black tracking-widest uppercase mb-1 ${badge.locked ? 'text-white/20' : 'text-white'}`}>{badge.title}</h4>
                                            {badge.locked && <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">ENCRYPTED</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="relative group animate-slide-up">
                        <div className="absolute inset-0 bg-creative-lime/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <Card variant="premium" className="border-white/10 p-16 bg-black group-hover:ring-1 ring-creative-lime/30 transition-all duration-700">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 relative z-10">
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none">COMMUNITY REDUCTION TARGET</h3>
                                    <p className="text-[10px] font-black text-white/30 tracking-[0.3em] uppercase italic">Sector: Global Campus Matrix // Period: Q1</p>
                                </div>
                                <div className="text-left xl:text-right">
                                    <div className="text-7xl font-black italic text-creative-lime leading-tight">
                                        {Math.min(100, Math.round(animatedValues.meals > 0 ? (animatedValues.meals / (targets.meals || 1)) * 100 : 0))}%
                                    </div>
                                    <p className="text-[10px] font-black text-white/20 tracking-[0.5em] uppercase italic">CYCLE COMPLETION</p>
                                </div>
                            </div>

                            <div className="mt-16 h-4 bg-white/5 rounded-full overflow-hidden p-1 ring-1 ring-white/10">
                                <div
                                    className="h-full bg-gradient-to-r from-creative-lime via-creative-lime to-white relative animate-shimmer rounded-full"
                                    style={{ width: `${Math.min(100, Math.round(animatedValues.meals > 0 ? (animatedValues.meals / (targets.meals || 1)) * 100 : 0))}%` }}
                                >
                                    <div className="absolute top-0 bottom-0 right-0 w-1 bg-white animate-pulse" />
                                </div>
                            </div>

                            <div className="flex justify-between mt-8 text-[10px] font-black tracking-widest text-white/20 uppercase font-mono">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-creative-lime animate-ping" />
                                    <span>BASE: 0.00 KG</span>
                                </div>
                                <span>TERMINAL TARGET: {(targets.foodSaved || 0).toFixed(2)} KG</span>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
