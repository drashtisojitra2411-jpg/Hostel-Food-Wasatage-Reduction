import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../lib/api';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

export default function WeekMenu() {
    const [menu, setMenu] = useState({});
    const [day, setDay] = useState('Monday');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const dayIndex = useMemo(() => Math.max(0, days.indexOf(day)), [day]);

    useEffect(() => {
        fetchWeekMenu();
    }, []);

    async function fetchWeekMenu() {
        setLoading(true);
        setError('');
        try {
            const rows = await api.get(`/api/admin/week-menu?start_date=${toIsoDateFromMonday(0)}`);
            const next = {};
            days.forEach((name, idx) => {
                next[name] = { breakfast: '', lunch: '', dinner: '' };
                const isoDate = toIsoDateFromMonday(idx);
                mealTypes.forEach((mealType) => {
                    const row = (Array.isArray(rows) ? rows : []).find((r) => r.date?.slice(0, 10) === isoDate && String(r.meal_type).toLowerCase() === mealType);
                    next[name][mealType] = row?.items || '';
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

    function updateMeal(type, value) {
        setMenu((prev) => ({ ...prev, [day]: { ...prev[day], [type]: value } }));
    }

    async function saveMeal(type) {
        setError('');
        try {
            await api.put('/api/admin/week-menu', {
                date: toIsoDateFromMonday(dayIndex),
                meal_type: type,
                start_time: type === 'breakfast' ? '08:00' : type === 'lunch' ? '13:00' : '20:00',
                end_time: type === 'breakfast' ? '10:00' : type === 'lunch' ? '15:00' : '22:00',
                items: String(menu?.[day]?.[type] || '').split(',').map((x) => x.trim()).filter(Boolean)
            });
        } catch (saveError) {
            setError(saveError.message || 'Operation failed');
        }
    }

    return (
        <AdminLayout title="Week Menu Management">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            {loading ? <div className="text-white/50 text-sm">Loading menu...</div> : null}

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm">
                        {days.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <button onClick={fetchWeekMenu} className="px-4 py-2 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest">Refresh Menu</button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div><p className="text-xs uppercase tracking-widest text-white/40 mb-2">Breakfast</p><input value={menu?.[day]?.breakfast || ''} onChange={(e) => updateMeal('breakfast', e.target.value)} onBlur={() => saveMeal('breakfast')} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-white/40 mb-2">Lunch</p><input value={menu?.[day]?.lunch || ''} onChange={(e) => updateMeal('lunch', e.target.value)} onBlur={() => saveMeal('lunch')} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" /></div>
                    <div><p className="text-xs uppercase tracking-widest text-white/40 mb-2">Dinner</p><input value={menu?.[day]?.dinner || ''} onChange={(e) => updateMeal('dinner', e.target.value)} onBlur={() => saveMeal('dinner')} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" /></div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-x-auto">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Preview Weekly Menu</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-white/50 uppercase tracking-widest text-[10px]"><th className="p-3">Day</th><th className="p-3">Breakfast</th><th className="p-3">Lunch</th><th className="p-3">Dinner</th></tr>
                    </thead>
                    <tbody>
                        {days.map((d) => (
                            <tr key={d} className="border-t border-white/10"><td className="p-3 font-bold">{d}</td><td className="p-3">{menu?.[d]?.breakfast || '-'}</td><td className="p-3">{menu?.[d]?.lunch || '-'}</td><td className="p-3">{menu?.[d]?.dinner || '-'}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
