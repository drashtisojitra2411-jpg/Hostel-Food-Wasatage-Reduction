import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import MetricCard from '../../components/admin/MetricCard';
import ChartPanel from '../../components/admin/ChartPanel';
import api from '../../lib/api';

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444'];

export default function Metrics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMetrics();
    }, []);

    async function fetchMetrics() {
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
    const wasteByHostel = data?.waste_by_hostel || [];
    const ngoPickupFrequency = data?.ngo_pickup_frequency || [];

    return (
        <AdminLayout title="System Metrics">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Waste Today (kg)" value={loading ? '--' : `${metrics.food_wasted_today || 0}`} accent="text-creative-lime" />
                <MetricCard label="Total Meals Served Today" value={loading ? '--' : `${metrics.meals_served_today || 0}`} accent="text-blue-400" />
                <MetricCard label="Food Donated Today (kg)" value={loading ? '--' : `${metrics.food_donated_today || 0}`} />
                <MetricCard label="Total Users" value={loading ? '--' : `${metrics.total_users || 0}`} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartPanel title="Waste Reduction Over Time">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyWasteReduction}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="month" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Line type="monotone" dataKey="reduction" stroke="#22c55e" strokeWidth={3} /></LineChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Meals Served vs Meals Donated">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={servedVsWasted}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="month" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Bar dataKey="served" fill="#22c55e" /><Bar dataKey="wasted" fill="#3b82f6" /></BarChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Waste by Hostel">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={wasteByHostel}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="hostel" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Bar dataKey="waste" fill="#ef4444" /></BarChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="NGO Pickup Frequency">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ngoPickupFrequency} dataKey="pickups" nameKey="ngo" outerRadius={90}>{ngoPickupFrequency.map((e, i) => <Cell key={e.ngo} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                </ChartPanel>
            </div>
        </AdminLayout>
    );
}
