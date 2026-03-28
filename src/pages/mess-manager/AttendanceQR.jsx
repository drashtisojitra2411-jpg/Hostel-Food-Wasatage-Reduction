import { useEffect, useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';
import api from '../../lib/api';
import { formatTime12h, getMealTimingForType } from '../../../shared/mealTimings';
import { ATTENDANCE_QR_EXPECTED_FORMAT } from '../../../shared/attendanceQr';

export default function AttendanceQR() {
    const [meals, setMeals] = useState([]);
    const [selectedMealId, setSelectedMealId] = useState('');
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [mealWindow, setMealWindow] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('info');

    useEffect(() => {
        fetchMeals();
        fetchMealTimings();
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
            showToast(err.message || 'Failed to load meals', 'error');
        }
    }

    async function fetchMealTimings() {
        try {
            const data = await api.get('/api/meal-timings/current');
            setMealWindow(data);
        } catch {
            // non-blocking
        }
    }

    async function generateQr() {
        if (!selectedMealId) return;
        setLoading(true);
        setQrData(null);
        try {
            const data = await api.get(`/api/generate-qr/${selectedMealId}`);
            setQrData(data);
            showToast(`QR generated for ${(data.meal_type || 'meal').toUpperCase()}`, 'success');
        } catch (err) {
            showToast(err.message || 'Failed to generate QR', 'error');
        } finally {
            setLoading(false);
        }
    }

    function showToast(message, type = 'info') {
        setToastMessage(message);
        setToastType(type);
    }

    function getMealDisplayWindow(meal) {
        const timing = getMealTimingForType(meal?.meal_type);
        const start = timing?.start || String(meal?.start_time || '').slice(0, 5);
        const end = timing?.end || String(meal?.end_time || '').slice(0, 5);
        return `${formatTime12h(start)} - ${formatTime12h(end)}`;
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-6 lg:p-12">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Card variant="premium" className="p-6 sm:p-8">
                        <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase mb-2">Attendance QR Generator</h1>
                        <p className="text-sm text-white/50 font-medium">Generate attendance QR for the active meal window.</p>
                    </Card>

                    {mealWindow?.active_meal && (
                        <div className="rounded-xl border border-creative-lime/30 bg-creative-lime/10 px-4 py-3 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-creative-lime opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-creative-lime"></span>
                            </span>
                            <p className="text-sm font-semibold text-creative-lime">
                                {mealWindow.active_meal.meal_name.charAt(0).toUpperCase() + mealWindow.active_meal.meal_name.slice(1)} window active
                                <span className="font-normal text-white/50 ml-2">
                                    {mealWindow.active_meal.start_time_display} - {mealWindow.active_meal.end_time_display}
                                </span>
                            </p>
                        </div>
                    )}

                    <Card variant="glass" className="p-6 sm:p-8 space-y-5">
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Select Meal</label>
                            <div className="relative">
                                <select
                                    value={selectedMealId}
                                    onChange={(e) => { setSelectedMealId(e.target.value); setQrData(null); }}
                                    className="w-full appearance-none rounded-xl border border-white/15 bg-black/60 px-4 py-3 pr-12 text-sm font-semibold text-white transition-all duration-200 hover:border-white/30 focus:border-creative-lime/60 focus:outline-none focus:ring-2 focus:ring-creative-lime/20"
                                >
                                    {meals.map((meal) => (
                                        <option key={meal.id} value={meal.id} className="bg-black text-white">
                                            {String(meal.meal_type).toUpperCase()} | {getMealDisplayWindow(meal)}
                                        </option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/60">
                                    v
                                </span>
                            </div>
                        </div>
                        <Button onClick={generateQr} isLoading={loading} disabled={!selectedMealId} className="w-full !min-h-[52px] !font-bold">
                            GENERATE QR CODE
                        </Button>
                    </Card>

                    {qrData?.qr_image && (
                        <Card variant="glass" className="p-6 sm:p-8 text-center">
                            <img
                                src={qrData.qr_image}
                                alt="Meal Attendance QR"
                                className="mx-auto w-72 h-72 sm:w-80 sm:h-80 rounded-2xl border border-white/10 bg-white p-3"
                            />
                            <div className="mt-4 space-y-1">
                                <p className="text-lg font-bold text-creative-lime">
                                    {(qrData.meal_type || 'meal').toUpperCase()}
                                </p>
                                {qrData.timing && (
                                    <p className="text-sm text-white/50">
                                        Window: {qrData.timing.start_display} - {qrData.timing.end_display}
                                    </p>
                                )}
                                <p className="text-sm font-bold uppercase tracking-wider text-white/60">
                                    Valid until this meal window ends
                                </p>
                                <p className="text-xs text-white/35">
                                    QR format: {ATTENDANCE_QR_EXPECTED_FORMAT}
                                </p>
                            </div>
                        </Card>
                    )}

                    {mealWindow?.all_timings && (
                        <Card variant="glass" className="p-5">
                            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Meal Schedule (IST)</h2>
                            <div className="grid grid-cols-3 gap-2">
                                {mealWindow.all_timings.map((t) => (
                                    <div
                                        key={t.meal_name}
                                        className={`text-center rounded-xl px-3 py-3 ${
                                            t.is_active
                                                ? 'bg-creative-lime/15 border border-creative-lime/30 text-creative-lime'
                                                : 'bg-white/5 text-white/40'
                                        }`}
                                    >
                                        <p className="text-xs font-bold uppercase">{t.meal_name}</p>
                                        <p className="text-sm mt-1">{t.start_time_display} - {t.end_time_display}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </main>

            <Toast
                message={toastMessage}
                type={toastType}
                duration={5000}
                onClose={() => setToastMessage('')}
            />
        </div>
    );
}
