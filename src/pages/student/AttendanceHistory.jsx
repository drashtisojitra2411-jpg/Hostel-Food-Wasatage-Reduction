import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Toast from '../../components/common/Toast';
import api from '../../lib/api';

export default function AttendanceHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('info');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await api.get('/api/attendance/history');
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching attendance history:', error);
            showToast(error.message || 'Failed to load attendance history', 'error');
        } finally {
            setLoading(false);
        }
    };

    function showToast(message, type = 'info') {
        setToastMessage(message);
        setToastType(type);
    }

    const filteredHistory = useMemo(() => {
        if (filter === 'all') return history;
        return history.filter(item => item.meal.toLowerCase() === filter);
    }, [history, filter]);

    const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-4 md:p-8 lg:p-12">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <Card variant="premium" className="rounded-2xl p-6 sm:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance History</h1>
                                <p className="text-sm text-white/50 mt-1">View your scanned meal attendances</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[120px]">
                                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Total Scans</p>
                                    <p className="text-2xl font-bold text-creative-lime">{history.length}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Filter */}
                    <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                        {['all', 'breakfast', 'lunch', 'dinner'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors whitespace-nowrap ${
                                    filter === f
                                        ? 'bg-creative-lime text-black'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Table / List */}
                    <Card variant="glass" className="rounded-2xl overflow-hidden p-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="py-4 px-6 text-xs font-bold text-white/40 uppercase tracking-wider">Date</th>
                                        <th className="py-4 px-6 text-xs font-bold text-white/40 uppercase tracking-wider">Meal</th>
                                        <th className="py-4 px-6 text-xs font-bold text-white/40 uppercase tracking-wider">Time (IST)</th>
                                        <th className="py-4 px-6 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center">
                                                <div className="inline-block w-8 h-8 border-3 border-creative-lime/30 border-t-creative-lime rounded-full animate-spin" />
                                            </td>
                                        </tr>
                                    ) : filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center">
                                                <p className="text-lg font-bold text-white/20 uppercase tracking-widest">No attendance yet</p>
                                                <p className="text-xs text-white/40 mt-2">Scan a meal QR code to see records here.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map((item) => {
                                            const isToday = item.date === todayDateStr;
                                            return (
                                                <tr key={item.id} className={`hover:bg-white/[0.02] transition-colors ${isToday ? 'bg-creative-lime/[0.03]' : ''}`}>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-semibold ${isToday ? 'text-creative-lime' : 'text-white/80'}`}>
                                                                {item.date}
                                                            </span>
                                                            {isToday && (
                                                                <span className="text-[10px] bg-creative-lime/20 text-creative-lime px-2 py-0.5 rounded-full font-bold uppercase">Today</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="text-sm font-bold uppercase tracking-wider text-white/70">{item.meal}</span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="text-sm text-white/60">{item.time}</span>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>

            <Toast
                message={toastMessage}
                type={toastType}
                duration={4000}
                onClose={() => setToastMessage('')}
            />
        </div>
    );
}
