import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import api from '../../lib/api';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const mealTypes = ['breakfast', 'lunch', 'dinner'];

function toIsoDateFromMonday(index) {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setDate(monday.getDate() + index);
    return monday.toISOString().split('T')[0];
}

export default function MenuManager() {
    const [activeDay, setActiveDay] = useState('MONDAY');
    const [menu, setMenu] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWeekMenu();
    }, []);

    const dayIndex = useMemo(() => Math.max(0, days.indexOf(activeDay)), [activeDay]);

    async function fetchWeekMenu() {
        setLoading(true);
        setError('');
        try {
            const startDate = toIsoDateFromMonday(0);
            const rows = await api.get(`/api/admin/week-menu?start_date=${startDate}`);
            const next = {};
            days.forEach((dayName, idx) => {
                next[dayName] = { breakfast: '', lunch: '', dinner: '' };
                const isoDate = toIsoDateFromMonday(idx);
                mealTypes.forEach((mealType) => {
                    const row = (Array.isArray(rows) ? rows : []).find((r) => r.date?.slice(0, 10) === isoDate && String(r.meal_type).toLowerCase() === mealType);
                    next[dayName][mealType] = row?.items || '';
                });
            });
            setMenu(next);
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data');
            setMenu({});
        } finally {
            setLoading(false);
        }
    }

    function updateLocal(mealType, value) {
        setMenu((prev) => ({ ...prev, [activeDay]: { ...(prev[activeDay] || {}), [mealType]: value } }));
    }

    async function saveMeal(mealType) {
        setError('');
        try {
            await api.put('/api/admin/week-menu', {
                date: toIsoDateFromMonday(dayIndex),
                meal_type: mealType,
                start_time: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '13:00' : '20:00',
                end_time: mealType === 'breakfast' ? '10:00' : mealType === 'lunch' ? '15:00' : '22:00',
                items: String(menu?.[activeDay]?.[mealType] || '').split(',').map((x) => x.trim()).filter(Boolean)
            });
        } catch (saveError) {
            setError(saveError.message || 'Operation failed');
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10 space-y-12">
                    <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">CULINARY<br /><span className="text-creative-lime">MANIFEST.</span></h1>
                    {error ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-300">{error}</div> : null}

                    <div className="grid lg:grid-cols-4 gap-12">
                        <div className="lg:col-span-1 flex flex-col gap-3">
                            {days.map((day) => (
                                <button key={day} onClick={() => setActiveDay(day)} className={`px-8 py-6 rounded-2xl text-xs font-black uppercase tracking-widest text-left border ${activeDay === day ? 'bg-creative-lime text-black border-creative-lime' : 'bg-white/5 text-white/40 border-white/5'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>

                        <div className="lg:col-span-3">
                            <Card variant="premium" className="h-full border-white/5">
                                <h2 className="text-4xl font-black tracking-tighter italic uppercase text-creative-lime mb-8">{activeDay} PROTOCOL</h2>
                                {loading ? <div className="text-white/40">Loading...</div> : (
                                    <div className="space-y-10">
                                        {mealTypes.map((mealType) => (
                                            <div key={mealType}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xl font-black tracking-widest italic uppercase text-white/80">{mealType.toUpperCase()}</h3>
                                                    <Button variant="outline" className="text-[10px]" onClick={() => saveMeal(mealType)}>SAVE</Button>
                                                </div>
                                                <textarea
                                                    className="w-full p-6 rounded-2xl bg-black/40 border-2 border-white/5 text-sm font-black tracking-widest uppercase min-h-[120px] resize-none"
                                                    value={menu?.[activeDay]?.[mealType] || ''}
                                                    onChange={(e) => updateLocal(mealType, e.target.value)}
                                                    placeholder={`Specify ${mealType} items comma separated`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
