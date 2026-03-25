import React, { useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function WastageLog() {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        mealType: 'LUNCH',
        category: 'RICE',
        quantity: '',
        reason: 'OVERPRODUCTION'
    });

    const categories = ['RICE', 'VEGETABLES', 'CURRY', 'BREAD', 'DAIRY', 'MEAT', 'OTHERS'];
    const reasons = ['OVERPRODUCTION', 'SPOILAGE', 'PLATE WASTE', 'PREP ERROR'];

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('TELEMETRY LOGGED:', formData);
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="max-w-4xl w-full relative z-10">
                    <div className="mb-16 animate-fade-in text-center">
                        <div className="inline-block px-4 py-1.5 border border-red-500/30 bg-red-500/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] mb-6 text-red-500 animate-pulse">
                            DEVIATION REPORT: ATOMIZED
                        </div>
                        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                            WASTAGE<br />
                            <span className="text-red-500">LOGGER.</span>
                        </h1>
                    </div>

                    <Card variant="premium" className="border-white/5 backdrop-blur-3xl p-12">
                        <form onSubmit={handleSubmit} className="space-y-12">
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Temporal Coordinate</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-xs font-black uppercase tracking-widest focus:border-red-500 transition-all outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Operational Cycle</label>
                                    <select
                                        value={formData.mealType}
                                        onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-xs font-black uppercase tracking-widest focus:border-red-500 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        <option>BREAKFAST</option>
                                        <option>LUNCH</option>
                                        <option>DINNER</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4 text-center block">Resource Category</label>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat })}
                                            className={`px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${formData.category === cat
                                                ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10 items-end">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Mass Deviation (KG)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.00"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-2xl py-6 px-10 text-4xl font-black italic tracking-tighter focus:border-red-500 transition-all outline-none text-red-500"
                                            required
                                        />
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-white/20 uppercase tracking-widest">KILOGRAMS</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Entropy Cause</label>
                                    <select
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-xs font-black uppercase tracking-widest focus:border-red-500 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-8">
                                <Button type="submit" className="w-full py-8 text-sm group" variant="primary">
                                    <span className="group-hover:animate-pulse">TRANSMIT DEVIATION DATA</span>
                                </Button>
                            </div>
                        </form>
                    </Card>

                    <div className="mt-12 text-center opacity-30 px-12">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                            Accurate logging is critical for the stability of the resource matrix. By reporting deviations, you assist in the optimization of the global supply chain.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
