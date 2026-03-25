import { useEffect, useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import api from '../../lib/api';

export default function AttendanceQR() {
    const [meals, setMeals] = useState([]);
    const [selectedMealId, setSelectedMealId] = useState('');
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMeals();
    }, []);

    async function fetchMeals() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const data = await api.get(`/api/meals?date=${today}`);
            setMeals(Array.isArray(data) ? data : []);
            if (Array.isArray(data) && data.length > 0) {
                setSelectedMealId(data[0].id);
            }
        } catch (err) {
            setError(err.message || 'Failed to load meals');
        }
    }

    async function generateQr() {
        if (!selectedMealId) return;
        setLoading(true);
        setError('');
        try {
            const data = await api.get(`/api/generate-qr/${selectedMealId}`);
            setQrData(data);
        } catch (err) {
            setError(err.message || 'Failed to generate QR');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-8 lg:p-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Card variant="premium" className="p-8">
                        <h1 className="text-4xl font-black italic tracking-tight uppercase mb-4">Attendance QR Generator</h1>
                        <p className="text-sm text-white/50 font-medium">Generate a time-limited QR for active meal attendance.</p>
                    </Card>

                    <Card variant="glass" className="p-8 space-y-6">
                        <select
                            value={selectedMealId}
                            onChange={(e) => setSelectedMealId(e.target.value)}
                            className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-sm font-bold"
                        >
                            {meals.map((meal) => (
                                <option key={meal.id} value={meal.id}>
                                    {String(meal.meal_type).toUpperCase()} | {meal.start_time?.slice(0, 5)}-{meal.end_time?.slice(0, 5)}
                                </option>
                            ))}
                        </select>
                        <Button onClick={generateQr} isLoading={loading} disabled={!selectedMealId}>
                            GENERATE QR
                        </Button>
                        {error && <p className="text-sm text-red-400 font-bold uppercase tracking-widest">{error}</p>}
                    </Card>

                    {qrData?.qr_image && (
                        <Card variant="glass" className="p-8 text-center">
                            <img src={qrData.qr_image} alt="Meal Attendance QR" className="mx-auto w-72 h-72 rounded-2xl border border-white/10 bg-white p-3" />
                            <p className="mt-4 text-sm text-white/60 font-bold uppercase tracking-wider">
                                Expires: {new Date(qrData.expires_at).toLocaleTimeString()}
                            </p>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
