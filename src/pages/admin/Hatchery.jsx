import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import MetricCard from '../../components/admin/MetricCard';
import ChartPanel from '../../components/admin/ChartPanel';
import api from '../../lib/api';

export default function Hatchery() {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPredictionData();
    }, []);

    async function fetchPredictionData() {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/api/chef/prediction');
            setPredictions(Array.isArray(response?.ai_prediction) ? response.ai_prediction : []);
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data');
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    }

    const aiForecastTrend = useMemo(
        () => predictions.map((p) => ({ day: p.meal_type, forecast: p.recommended_prepare_kg || 0, actual: p.predicted_demand_kg || 0 })),
        [predictions]
    );
    const avgAccuracy = useMemo(() => {
        if (aiForecastTrend.length === 0) return 0;
        const values = aiForecastTrend.map((x) => {
            if (!x.actual) return 100;
            const err = Math.abs((x.actual - x.forecast) / x.actual) * 100;
            return Math.max(0, 100 - err);
        });
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    }, [aiForecastTrend]);

    return (
        <AdminLayout title="Hatchery (AI System)">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="AI Prediction Accuracy" value={loading ? '--' : `${avgAccuracy}%`} accent="text-creative-lime" />
                <MetricCard label="Model Last Trained" value={loading ? '--' : new Date().toLocaleString()} />
                <MetricCard label="Data Samples Used" value={loading ? '--' : String(aiForecastTrend.length)} />
                <MetricCard label="Active Predictions" value={loading ? '--' : String(aiForecastTrend.length)} accent="text-blue-400" />
            </div>
            <div className="flex justify-end"><button onClick={fetchPredictionData} className="px-4 py-2 bg-creative-lime text-black rounded-xl text-xs font-black uppercase tracking-widest">Refresh Model Data</button></div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartPanel title="AI Demand Forecast Trend">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={aiForecastTrend}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="day" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Line type="monotone" dataKey="forecast" stroke="#22c55e" strokeWidth={3} /></LineChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Predicted vs Actual Consumption">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={aiForecastTrend}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="day" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Bar dataKey="forecast" fill="#22c55e" /><Bar dataKey="actual" fill="#3b82f6" /></BarChart></ResponsiveContainer>
                </ChartPanel>
            </div>
        </AdminLayout>
    );
}
