import { useEffect, useMemo, useState } from 'react';
import WastageBarChart from '../../components/analytics/WastageBarChart';
import WastagePieChart from '../../components/analytics/WastagePieChart';
import WastageTrendChart from '../../components/analytics/WastageTrendChart';
import Navigation from '../../components/layout/Navigation';
import api, { API_URL } from '../../lib/api';

const TARGET_STOCK_ITEMS = ['Rice', 'Vegetables', 'Milk', 'Flour'];
const CHEF_SECTION_LINKS = [
    { key: 'kitchen', icon: 'CK', label: 'KITCHEN' },
    { key: 'production', icon: 'PR', label: 'PRODUCTION' },
    { key: 'ai', icon: 'AI', label: 'PREDICTIONS' },
    { key: 'waste', icon: 'WS', label: 'WASTE' },
    { key: 'inventory', icon: 'ST', label: 'INVENTORY' },
    { key: 'feedback', icon: 'FB', label: 'FEEDBACK' }
];
const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner'];

const toNumber = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const round1 = (v) => Number(toNumber(v).toFixed(1));
const formatTime = (v) => (typeof v === 'string' ? v.substring(0, 5) : '--:--');
const formatDate = (v) => {
    if (!v) return '--';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '--' : d.toLocaleDateString();
};
const toTitleCase = (value = '') => String(value).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const EmptyPanel = ({ message }) => <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-white/45 uppercase tracking-widest text-xs">{message}</div>;
const RatingStars = ({ value = 0 }) => {
    const safe = Math.max(0, Math.min(5, Math.round(toNumber(value))));
    return <span className="text-yellow-400 tracking-wider">{'*'.repeat(safe)}<span className="text-white/20">{'*'.repeat(5 - safe)}</span></span>;
};

function normalizeEfficiency(e = {}) {
    const prepared = toNumber(e.total_prepared_kg, 0);
    const consumed = toNumber(e.total_consumed_kg, 0);
    const wasted = toNumber(e.total_wasted_kg, 0);
    return {
        total_prepared_kg: round1(prepared),
        total_consumed_kg: round1(consumed),
        total_wasted_kg: round1(wasted),
        utilization_rate: prepared > 0 ? round1((consumed / prepared) * 100) : 0,
        waste_rate: prepared > 0 ? round1((wasted / prepared) * 100) : 0
    };
}

const normalizeWeeklyWaste = (rows) => {
    const normalized = (Array.isArray(rows) ? rows : []).map((row, i) => ({ day: row.day || row.date || row.name || `Day ${i + 1}`, amount: toNumber(row.amount ?? row.waste ?? row.value, 0) }));
    return normalized;
};
const normalizeWasteTrend = (rows) => {
    const normalized = (Array.isArray(rows) ? rows : []).map((row, i) => ({ name: row.name || row.month || row.week || row.day || `W${i + 1}`, value: toNumber(row.value ?? row.trend ?? row.amount, 0) }));
    return normalized;
};
const normalizeWasteByCategory = (rows) => {
    const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({ name: row.name || row.category || row.meal_type || 'Other', value: toNumber(row.value ?? row.amount, 0) })).filter((row) => row.value >= 0);
    return normalized;
};

function normalizePredictions(rows) {
    const byMeal = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const meal = toTitleCase(row.meal_type);
        if (!meal) return;
        byMeal.set(meal, {
            meal_type: meal,
            booked_students: toNumber(row.booked_students ?? row.booked_count, 0),
            predicted_demand_kg: round1(toNumber(row.predicted_demand_kg, 0)),
            recommended_prepare_kg: round1(toNumber(row.recommended_prepare_kg, 0)),
            waste_risk_indicator: row.waste_risk_indicator || 'LOW'
        });
    });
    return MEAL_ORDER.map((meal) => {
        const existing = byMeal.get(meal);
        return existing || { meal_type: meal, booked_students: 0, predicted_demand_kg: 0, recommended_prepare_kg: 0, waste_risk_indicator: 'LOW' };
    });
}

function findInventoryMatch(inventory = [], target) {
    const aliases = { rice: ['rice', 'basmati'], vegetables: ['vegetables', 'vegetable', 'veg'], milk: ['milk'], flour: ['flour', 'atta'] };
    const keys = aliases[target.toLowerCase()] || [target.toLowerCase()];
    return inventory.find((item) => keys.some((k) => String(item.item_name || '').toLowerCase().includes(k)));
}

function normalizeInventory(items) {
    const source = Array.isArray(items) ? items : [];
    return TARGET_STOCK_ITEMS.map((target) => {
        const item = findInventoryMatch(source, target);
        const quantity = round1(toNumber(item?.quantity, 0));
        const reorderLevel = round1(toNumber(item?.reorder_level, 0));
        const usagePerDay = Math.max(reorderLevel / 5, 1);
        return {
            id: item?.id || target.toLowerCase(),
            item_name: target,
            quantity,
            unit: item?.unit || 'kg',
            reorder_level: reorderLevel,
            days_remaining: Math.max(0, Math.floor(quantity / usagePerDay)),
            is_low_stock: quantity <= reorderLevel
        };
    });
}

function mealStatus(meal) {
    if (!meal?.start_time || !meal?.end_time) return 'Scheduled';
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = meal.start_time.split(':').map((x) => parseInt(x, 10));
    const [eh, em] = meal.end_time.split(':').map((x) => parseInt(x, 10));
    const start = (sh * 60) + sm;
    const end = (eh * 60) + em;
    if (minutesNow < start) return 'Scheduled';
    if (minutesNow <= end) return 'In Progress';
    return 'Completed';
}

function buildFeedbackInsights(feedback = []) {
    const since = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const last7 = feedback.filter((item) => {
        const t = new Date(item.created_at).getTime();
        return Number.isFinite(t) && t >= since;
    });
    return { last_7_days_count: last7.length };
}

export default function ChefDashboard() {
    const [activeSection, setActiveSection] = useState('kitchen');
    const [menu, setMenu] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [feedbackSummary, setFeedbackSummary] = useState({ avg_rating: 0, total_feedback: 0 });
    const [insights, setInsights] = useState({ last_7_days_count: 0 });
    const [analytics, setAnalytics] = useState({ weekly_waste: [], waste_by_meal: [], waste_trend: [], efficiency: normalizeEfficiency({}) });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const predictedTotalPrep = useMemo(() => round1(predictions.reduce((sum, item) => sum + toNumber(item.recommended_prepare_kg), 0)), [predictions]);
    const scheduledMeals = menu.length;
    const sectionLabel = CHEF_SECTION_LINKS.find((s) => s.key === activeSection)?.label || 'KITCHEN';

    useEffect(() => { fetchDashboardData(); }, []);

    async function fetchDashboardData() {
        setLoading(true);
        setError('');
        const endpoints = [
            { key: 'menu', label: 'menu', path: '/api/chef/menu' },
            { key: 'inventory', label: 'kitchen inventory', path: '/api/chef/inventory' },
            { key: 'prediction', label: 'production predictions', path: '/api/chef/prediction' },
            { key: 'analytics', label: 'production analytics', path: '/api/chef/analytics' },
            { key: 'feedback', label: 'feedback', path: '/api/chef/feedback?limit=8' }
        ];

        const results = await Promise.allSettled(
            endpoints.map(({ path }) => {
                console.log('Calling:', `${API_URL}${path.replace('/api', '')}`);
                return api.get(path);
            })
        );

        const [menuRes, invRes, predRes, analyticsRes, feedbackRes] = results;
        const errorMessages = [];

        if (menuRes.status === 'fulfilled') setMenu(Array.isArray(menuRes.value) ? menuRes.value : []);
        else {
            setMenu([]);
            errorMessages.push(`Menu: ${menuRes.reason?.message || 'request failed'}`);
        }

        if (invRes.status === 'fulfilled') setInventory(normalizeInventory(invRes.value));
        else {
            setInventory(normalizeInventory([]));
            errorMessages.push(`Kitchen inventory: ${invRes.reason?.message || 'request failed'}`);
        }

        if (predRes.status === 'fulfilled') setPredictions(normalizePredictions(predRes.value?.ai_prediction));
        else {
            setPredictions(normalizePredictions([]));
            errorMessages.push(`Production predictions: ${predRes.reason?.message || 'request failed'}`);
        }

        if (analyticsRes.status === 'fulfilled') {
            setAnalytics({
                weekly_waste: normalizeWeeklyWaste(analyticsRes.value?.weekly_waste),
                waste_by_meal: normalizeWasteByCategory(analyticsRes.value?.waste_by_meal),
                waste_trend: normalizeWasteTrend(analyticsRes.value?.waste_trend),
                efficiency: normalizeEfficiency(analyticsRes.value?.efficiency)
            });
        } else {
            setAnalytics({ weekly_waste: [], waste_by_meal: [], waste_trend: [], efficiency: normalizeEfficiency({}) });
            errorMessages.push(`Production analytics: ${analyticsRes.reason?.message || 'request failed'}`);
        }

        if (feedbackRes.status === 'fulfilled') {
            const rows = Array.isArray(feedbackRes.value?.feedback) ? feedbackRes.value.feedback : [];
            const avg = toNumber(feedbackRes.value?.summary?.avg_rating, 0);
            const total = toNumber(feedbackRes.value?.summary?.total_feedback, 0);
            const calcAvg = rows.length > 0 ? round1(rows.reduce((s, x) => s + toNumber(x.rating), 0) / rows.length) : 0;
            setFeedback(rows);
            setFeedbackSummary({ avg_rating: avg > 0 ? avg : calcAvg, total_feedback: total > 0 ? total : rows.length });
            setInsights(buildFeedbackInsights(rows));
        } else {
            setFeedback([]);
            setFeedbackSummary({ avg_rating: 0, total_feedback: 0 });
            setInsights({ last_7_days_count: 0 });
            errorMessages.push(`Feedback: ${feedbackRes.reason?.message || 'request failed'}`);
        }
        setError(errorMessages.join(' | '));
        setLoading(false);
    }

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-16 h-16 border-4 border-creative-lime border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-black text-white p-6 lg:ml-72 transition-all duration-500 font-sans">
            <Navigation customLinks={CHEF_SECTION_LINKS} activeItem={activeSection} onItemSelect={setActiveSection} />
            <div className="max-w-7xl mx-auto space-y-8 mt-20 lg:mt-0">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Chef <span className="text-creative-lime line-through">Command</span></h1>
                    <p className="text-white/50 font-medium tracking-widest uppercase text-sm mt-2">Active Module: {sectionLabel}</p>
                </div>

                {error && <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-2xl px-5 py-4 text-sm text-yellow-300 flex items-center justify-between gap-4"><span>{error}</span><button type="button" onClick={fetchDashboardData} className="px-4 py-2 rounded-xl bg-yellow-400/20 text-yellow-200 text-xs font-black uppercase tracking-widest hover:bg-yellow-400/30 transition-all">Retry</button></div>}

                {activeSection === 'kitchen' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-creative-lime">Today's Finalized Menu</h2>
                            <p className="text-white/40 text-xs tracking-widest uppercase mt-1">Meals Scheduled Today: {scheduledMeals}</p>
                            {menu.length === 0 ? <div className="mt-4"><EmptyPanel message="No meals scheduled for today." /></div> : (
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {menu.map((meal) => (
                                        <div key={meal.id} className="bg-black/40 border border-white/10 rounded-2xl p-5">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-black uppercase">{meal.meal_type}</h3>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${mealStatus(meal) === 'Completed' ? 'bg-green-500/20 text-green-400' : mealStatus(meal) === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{mealStatus(meal)}</span>
                                            </div>
                                            <p className="text-white/50 text-xs mt-2">{formatTime(meal.start_time)} - {formatTime(meal.end_time)}</p>
                                            <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">Booked: {toNumber(meal.booked_count, 0)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {predictions.map((p) => (
                                <div key={p.meal_type} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <p className="text-xs text-white/50 uppercase tracking-widest">Quantity Prepared</p>
                                    <h3 className="text-xl font-black mt-1">{p.meal_type}</h3>
                                    <p className="text-3xl font-black text-creative-lime mt-2">{p.recommended_prepare_kg} kg</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'production' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">PR Production Metrics</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Prepared</p><p className="text-2xl font-black">{analytics.efficiency.total_prepared_kg}kg</p></div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Consumed</p><p className="text-2xl font-black text-green-400">{analytics.efficiency.total_consumed_kg}kg</p></div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Wasted</p><p className="text-2xl font-black text-red-400">{analytics.efficiency.total_wasted_kg}kg</p></div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Utilization</p><p className="text-2xl font-black text-creative-lime">{analytics.efficiency.utilization_rate}%</p></div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4"><p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Waste Rate</p><p className="text-2xl font-black text-yellow-400">{analytics.efficiency.waste_rate}%</p></div>
                        </div>
                    </div>
                )}

                {activeSection === 'ai' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-creative-lime/30 rounded-3xl p-6">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-creative-lime">AI Demand Predictor</h2>
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mt-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40">Recommended Meal Preparation Quantity</div>
                                <div className="text-3xl font-black text-creative-lime mt-1">{predictedTotalPrep} kg</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                {predictions.map((pred) => (
                                    <div key={pred.meal_type} className="bg-black/40 border border-white/10 rounded-2xl p-5">
                                        <h3 className="text-xl font-black uppercase">{pred.meal_type}</h3>
                                        <p className="text-white/50 text-xs uppercase tracking-widest mt-3">Predicted Demand</p>
                                        <p className="text-2xl font-black text-white">{pred.predicted_demand_kg} kg</p>
                                        <p className="text-white/50 text-xs uppercase tracking-widest mt-3">Recommended Prep</p>
                                        <p className="text-2xl font-black text-creative-lime">{pred.recommended_prepare_kg} kg</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'waste' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Waste Analytics</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <WastageTrendChart data={analytics.waste_trend} />
                            <WastageBarChart data={analytics.weekly_waste} />
                        </div>
                        <WastagePieChart data={analytics.waste_by_meal} />
                    </div>
                )}

                {activeSection === 'inventory' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Inventory / Stock</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inventory.map((item) => (
                                <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black">{item.item_name}</h3>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${item.is_low_stock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{item.is_low_stock ? 'LOW STOCK' : 'OK'}</span>
                                    </div>
                                    <p className="text-3xl font-black mt-3">{item.quantity} <span className="text-sm text-white/50">{item.unit}</span></p>
                                    <p className="text-xs text-white/50 uppercase tracking-widest mt-3">Estimated days remaining: <span className="text-creative-lime font-black">{item.days_remaining}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'feedback' && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap justify-between gap-4 items-center">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Student Feedback</h2>
                            <div className="text-sm font-bold text-white/60 uppercase tracking-widest">Last 7 days: {insights.last_7_days_count} reviews | Avg: {feedbackSummary.avg_rating}/5</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            {feedback.length === 0 ? <p className="text-white/40 text-center py-8 uppercase tracking-widest text-sm">No feedback available yet.</p> : (
                                <div className="space-y-4">
                                    {feedback.map((item) => (
                                        <div key={item.id} className="bg-black/40 rounded-2xl p-4 border border-white/10">
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                                <div className="font-black uppercase tracking-wider text-white">{item.student_name}</div>
                                                <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/50">
                                                    <span>{item.meal_type}</span>
                                                    <span>{formatDate(item.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="mb-2"><RatingStars value={item.rating} /></div>
                                            <p className="text-white/80 text-sm">{item.comment || 'No comment provided.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
