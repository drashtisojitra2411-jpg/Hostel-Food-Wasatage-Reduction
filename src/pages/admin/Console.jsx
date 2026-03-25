import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import MetricCard from '../../components/admin/MetricCard';
import ChartPanel from '../../components/admin/ChartPanel';
import api from '../../lib/api';

export default function Console() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
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
    const monthlyWasteReduction = data?.monthly_waste_reduction || [];
    const servedVsWasted = data?.served_vs_wasted || [];
    const activities = data?.activities || [];
    const alerts = data?.alerts || [];

    return (
        <AdminLayout title="Global Overview Dashboard">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <MetricCard label="Total Hostels" value={loading ? '--' : (metrics.total_hostels || 0)} />
                <MetricCard label="Active Chefs" value={loading ? '--' : (metrics.active_chefs || 0)} accent="text-creative-lime" />
                <MetricCard label="Registered NGOs" value={loading ? '--' : (metrics.registered_ngos || 0)} />
                <MetricCard label="Meals Served Today" value={loading ? '--' : (metrics.meals_served_today || 0)} />
                <MetricCard label="Food Wasted Today" value={loading ? '--' : `${metrics.food_wasted_today || 0} kg`} accent="text-red-400" />
                <MetricCard label="Food Donated Today" value={loading ? '--' : `${metrics.food_donated_today || 0} kg`} accent="text-blue-400" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartPanel title="Monthly Waste Reduction Trend">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyWasteReduction} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Line type="monotone" dataKey="reduction" stroke="#22c55e" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Meals Served vs Meals Wasted">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={servedVsWasted} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="served" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="wasted" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Recent Activities</h3>
                    <div className="space-y-3">
                        {activities.length === 0 ? <div className="text-white/40 text-sm">No data available</div> : activities.map((a) => <div key={a} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm">{a}</div>)}
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">System Alerts</h3>
                    <div className="space-y-3">
                        {alerts.length === 0 ? <div className="text-white/40 text-sm">No data available</div> : alerts.map((a) => <div key={a} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">{a}</div>)}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
