import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { fetchFeedback } from '../../utils/feedback';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

export default function FeedbackArchive() {
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [count, setCount] = useState(0);
    const [filters, setFilters] = useState({ day: '', meal_type: '', rating: '' });
    const limit = 50;

    useEffect(() => {
        const loadFeedback = async () => {
            setLoading(true);
            const result = await fetchFeedback({
                ...filters,
                limit,
                offset: page * limit
            });
            if (result.success) {
                setFeedback(result.data);
                setCount(result.count);
            }
            setLoading(false);
        };
        loadFeedback();
    }, [filters, page]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0); // Reset to first page on filter change
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black overflow-x-hidden">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-creative-lime/5 blur-[150px] rounded-full pointer-events-none" />

                <header className="mb-16 animate-fade-in relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                        <div>
                            <div className="inline-block px-4 py-1 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-creative-lime">
                                Intelligence Database
                            </div>
                            <h1 className="text-6xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                                FEEDBACK<br />
                                <span className="text-creative-lime">ARCHIVE.</span>
                            </h1>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/admin')}
                            className="border-white/10 text-white/60 hover:text-white"
                        >
                            RETURN TO COMMAND →
                        </Button>
                    </div>
                </header>

                {/* Filters */}
                <Card variant="glass" className="mb-12 border-white/5 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 block">Filter by Day</label>
                            <select
                                value={filters.day}
                                onChange={(e) => handleFilterChange('day', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 focus:border-creative-lime/50 focus:outline-none transition-all"
                            >
                                <option value="">All Days</option>
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 block">Meal Protocol</label>
                            <select
                                value={filters.meal_type}
                                onChange={(e) => handleFilterChange('meal_type', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 focus:border-creative-lime/50 focus:outline-none transition-all"
                            >
                                <option value="">All Meals</option>
                                {MEAL_TYPES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 block">Satisfaction Level</label>
                            <select
                                value={filters.rating}
                                onChange={(e) => handleFilterChange('rating', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 focus:border-creative-lime/50 focus:outline-none transition-all"
                            >
                                <option value="">All Ratings</option>
                                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Orbs</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full border border-white/5 opacity-50 hover:opacity-100"
                                onClick={() => {
                                    setFilters({ day: '', meal_type: '', rating: '' });
                                    setPage(0);
                                }}
                            >
                                RESET FILTERS
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Table */}
                <Card variant="premium" className="p-0 overflow-hidden relative z-10 border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-6 px-8 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Temporal Slot</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Operator</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] text-center">Satisfaction</th>
                                    <th className="py-6 px-8 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Observations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                                <div className="w-12 h-12 border-2 border-creative-lime/20 border-t-creative-lime rounded-full animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Declassifying Data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : feedback.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-32 text-center">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No feedback records identified</p>
                                        </td>
                                    </tr>
                                ) : (
                                    feedback.map((fb) => (
                                        <tr key={fb.id} className="group hover:bg-white/[0.02] transition-all">
                                            <td className="py-8 px-8">
                                                <p className="font-black text-xs italic text-creative-lime">{fb.day.toUpperCase()}</p>
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{fb.meal_type}</p>
                                            </td>
                                            <td className="py-8 px-8">
                                                <p className="font-black text-sm tracking-tight text-white/80">{fb.user_profiles?.full_name || 'ANonymous_unit'}</p>
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1">{fb.user_profiles?.hostel_name || 'SECTOR_UNKNOWN'}</p>
                                            </td>
                                            <td className="py-8 px-8 text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(163,230,53,0.3)] transition-all ${i < fb.rating ? 'bg-creative-lime scale-110' : 'bg-white/5'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-8 px-8 max-w-md">
                                                <p className="text-xs text-white/60 leading-relaxed italic">
                                                    {fb.comment ? `"${fb.comment}"` : <span className="opacity-20">NO OBSERVATIONS RECORDED</span>}
                                                </p>
                                                <p className="text-[8px] font-black text-white/10 uppercase tracking-widest mt-3">Log ID: {fb.id.slice(0, 8)}</p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {count > limit && (
                        <div className="p-8 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                                Records {page * limit + 1} - {Math.min((page + 1) * limit, count)} of {count}
                            </span>
                            <div className="flex gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="border border-white/5"
                                >
                                    ← PREV
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={(page + 1) * limit >= count}
                                    onClick={() => setPage(p => p + 1)}
                                    className="border border-white/5"
                                >
                                    NEXT →
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
}
