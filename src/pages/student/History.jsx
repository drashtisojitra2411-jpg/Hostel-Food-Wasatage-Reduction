import React, { useState, useEffect } from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Notification from '../../components/common/Notification';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await api.get('/api/meal-bookings/history');

            const formattedHistory = (data || []).map(booking => {
                let statusConfig = {
                    label: 'BOOKED',
                    class: 'border-creative-lime/30 text-creative-lime bg-creative-lime/5'
                };

                if (booking.status === 'cancelled') {
                    statusConfig = {
                        label: 'CANCELLED',
                        class: 'border-white/10 text-white/40 bg-white/5'
                    };
                } else if (booking.status === 'attended') {
                    statusConfig = {
                        label: 'ATTENDED',
                        class: 'border-creative-purple/30 text-creative-purple bg-creative-purple/5'
                    };
                } else if (booking.status === 'skipped') {
                    statusConfig = {
                        label: 'SKIPPED',
                        class: 'border-red-500/30 text-red-500 bg-red-500/5'
                    };
                }

                let impactText = `₹${booking.discounted_price || booking.original_price || 100}`;
                if (booking.status === 'cancelled') impactText = 'NO DEVIATION';
                if (booking.status === 'skipped') impactText = 'PENALTY RISK';
                if (booking.reward_applied) impactText = `₹${booking.discounted_price || 90} REWARDED`;

                let dateStr = '00.00.0000';
                try {
                    dateStr = format(new Date(booking.booking_date), 'dd.MM.yyyy').toUpperCase();
                } catch (e) {
                    console.error('Date parsing error:', e);
                }

                return {
                    id: booking.id,
                    date: dateStr,
                    meal: booking.meal_type ? booking.meal_type.toUpperCase() : 'MEAL UNIT',
                    status: statusConfig.label,
                    statusClass: statusConfig.class,
                    impact: impactText
                };
            });

            setHistory(formattedHistory);

        } catch (error) {
            console.error('Error fetching history:', error);
            setNotification({
                show: true,
                message: error.message || 'Failed to load booking history',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-creative-lime/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10 space-y-16">
                    {/* Header - Tactical Archive */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
                        <div className="animate-fade-in">
                            <div className="inline-block px-4 py-1.5 border border-creative-lime/30 bg-creative-lime/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] mb-6 text-creative-lime animate-pulse">
                                OPERATIONAL LOGISTICS ARCHIVE
                            </div>
                            <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                                UNIT<br />
                                <span className="text-creative-lime">HISTORY.</span>
                            </h1>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col">
                                <span className="text-[8px] font-black text-white/30 tracking-widest uppercase mb-1">Total Cycles</span>
                                <span className="text-2xl font-black italic tracking-tighter">{history.length}</span>
                            </div>
                        </div>
                    </div>

                    <Card variant="premium" className="border-white/5 p-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-8 px-10 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Temporal Marker</th>
                                        <th className="py-8 px-10 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Resource Type</th>
                                        <th className="py-8 px-10 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Operational Status</th>
                                        <th className="py-8 px-10 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] text-right">Impact Scalar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="py-24 text-center">
                                                <div className="inline-block w-8 h-8 border-2 border-creative-lime border-t-transparent rounded-full animate-spin" />
                                            </td>
                                        </tr>
                                    ) : history.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-32 text-center space-y-6">
                                                <div className="text-5xl opacity-20 italic font-black tracking-tighter uppercase">No Archive Nodes Detected</div>
                                                <p className="text-[10px] font-black text-white/20 tracking-widest uppercase">Initiate booking cycle to populate the matrix.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((item, index) => (
                                            <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                                <td className="py-8 px-10">
                                                    <div className="text-sm font-black italic tracking-tighter text-white/80">{item.date}</div>
                                                </td>
                                                <td className="py-8 px-10">
                                                    <div className="text-[10px] font-black tracking-[0.2em] text-white/40">{item.meal}</div>
                                                </td>
                                                <td className="py-8 px-10">
                                                    <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border ${item.statusClass}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="py-8 px-10 text-right">
                                                    <div className="text-sm font-black italic tracking-tighter text-creative-lime">{item.impact}</div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>

            <Notification
                isVisible={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
}
