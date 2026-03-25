import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import MetricCard from '../../components/analytics/MetricCard';
import Button from '../../components/common/Button';
import api from '../../lib/api';

export default function Reports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    async function fetchReports() {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/analytics/overview');
            setData(res);
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data');
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    const metrics = data?.metrics || {};
    const monthly = data?.monthly_waste_reduction || [];
    const servedVsWasted = data?.served_vs_wasted || [];

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10 space-y-16">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
                        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">INTEL<br /><span className="text-creative-lime">REPORTS.</span></h1>
                        <Button variant="primary" className="py-6 px-12 text-[10px]" onClick={fetchReports}>REFRESH</Button>
                    </div>

                    {error ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-300">{error}</div> : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <MetricCard title="TOTAL WASTAGE" value={loading ? '--' : `${metrics.food_wasted_today || 0} KG`} icon="🗑️" />
                        <MetricCard title="AVG BOOKING" value={loading ? '--' : `${metrics.meals_served_today || 0}`} icon="👥" />
                        <MetricCard title="TOTAL USERS" value={loading ? '--' : `${metrics.total_users || 0}`} icon="💾" />
                        <MetricCard title="TOTAL HOSTELS" value={loading ? '--' : `${metrics.total_hostels || 0}`} icon="🏠" />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card variant="glass" className="p-10 border-white/5">
                            <h3 className="text-2xl font-black tracking-tighter italic uppercase text-white/80 mb-8">Wastage Analysis</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthly}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="month" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="reduction" stroke="#a3e635" strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card variant="glass" className="p-10 border-white/5">
                            <h3 className="text-2xl font-black tracking-tighter italic uppercase text-white/80 mb-8">Served vs Wasted</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={servedVsWasted}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="month" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip />
                                        <Bar dataKey="served" fill="#22c55e" />
                                        <Bar dataKey="wasted" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    <Card variant="premium" className="border-white/5 p-0 overflow-hidden">
                        <div className="p-10 border-b border-white/5">
                            <h3 className="text-3xl font-black tracking-tighter italic uppercase text-white/80">Raw Telemetry Data</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                    <tr>
                                        <th className="py-6 px-8">Month</th>
                                        <th className="py-6 px-8">Served</th>
                                        <th className="py-6 px-8">Wasted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {servedVsWasted.length === 0 ? (
                                        <tr><td className="py-8 px-8 text-sm text-white/40" colSpan={3}>{loading ? 'Loading...' : 'No data available'}</td></tr>
                                    ) : servedVsWasted.map((row) => (
                                        <tr key={row.month}>
                                            <td className="py-6 px-8 text-sm font-black">{row.month}</td>
                                            <td className="py-6 px-8 text-sm">{row.served}</td>
                                            <td className="py-6 px-8 text-sm text-red-400">{row.wasted}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
