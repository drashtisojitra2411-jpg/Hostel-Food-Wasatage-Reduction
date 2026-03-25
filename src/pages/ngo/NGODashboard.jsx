import { useEffect, useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line
} from 'recharts';
import api from '../../lib/api';
import Navigation from '../../components/layout/Navigation';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4'];
const NGO_SECTION_LINKS = [
    { key: 'rescue', icon: 'NG', label: 'RESCUE HUB' },
    { key: 'donations', icon: 'DN', label: 'DONATIONS' },
    { key: 'pickup', icon: 'PK', label: 'PICKUP REQUESTS' },
    { key: 'analytics', icon: 'AN', label: 'ANALYTICS' },
    { key: 'history', icon: 'HS', label: 'HISTORY' },
    { key: 'impact', icon: 'IM', label: 'IMPACT' }
];

function parseFoodItems(foodItems) {
    if (Array.isArray(foodItems)) return foodItems;
    if (typeof foodItems === 'string') {
        try {
            const parsed = JSON.parse(foodItems);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function formatDateTime(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString();
}

function mapLinkQuery(text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text || 'Hostel')}`;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function hashPoint(seed, max, min = 10) {
    const text = String(seed || '0');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
    const normalized = Math.abs(hash) % (max - min);
    return min + normalized;
}

function pickupStatusLabel(status) {
    if (status === 'scheduled') return 'Pending';
    if (status === 'picked_up') return 'In Transit';
    if (status === 'completed') return 'Completed';
    return 'Pending';
}

function statusClass(status) {
    if (status === 'Completed') return 'bg-green-500/20 text-green-400';
    if (status === 'In Transit') return 'bg-blue-500/20 text-blue-400';
    return 'bg-yellow-500/20 text-yellow-400';
}

function buildWeeklyRedistributionData(historyRows) {
    if (!Array.isArray(historyRows) || historyRows.length === 0) return [];
    const grouped = {};
    historyRows.forEach((row) => {
        const date = new Date(row.date || row.updated_at || row.created_at);
        if (Number.isNaN(date.getTime())) return;
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
        const key = `W${weekNum}`;
        grouped[key] = (grouped[key] || 0) + Math.round(toNumber(row.quantity || row.total_quantity_kg, 0) * 2.1);
    });
    const transformed = Object.entries(grouped).slice(-6).map(([week, meals]) => ({ week, meals }));
    return transformed;
}

export default function NGODashboard() {
    const [activeSection, setActiveSection] = useState('rescue');
    const [donations, setDonations] = useState([]);
    const [impact, setImpact] = useState({ meals_rescued: 0, food_saved_kg: 0, people_fed: 0, co_prevented_kg: 0 });
    const [history, setHistory] = useState([]);
    const [analytics, setAnalytics] = useState({ monthly_collection: [] });
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        const [donationsRes, impactRes, historyRes, analyticsRes, notificationsRes] = await Promise.allSettled([
            api.get('/api/ngo/donations'),
            api.get('/api/ngo/impact'),
            api.get('/api/ngo/history'),
            api.get('/api/ngo/analytics'),
            api.get('/api/ngo/notifications')
        ]);

        const donationRows = donationsRes.status === 'fulfilled' && Array.isArray(donationsRes.value) ? donationsRes.value : [];
        setDonations(donationRows.map((row) => ({ ...row, food_items: parseFoodItems(row.food_items) })));

        const impactRaw = impactRes.status === 'fulfilled' ? impactRes.value : null;
        const mealsSaved = toNumber(impactRaw?.meals_saved, 0);
        const foodSaved = toNumber(impactRaw?.food_collected_kg, 0);
        const peopleFed = toNumber(impactRaw?.people_fed, 0);
        const coPrevented = toNumber(impactRaw?.waste_prevented_kg, 0) > 0 ? Math.round(toNumber(impactRaw?.waste_prevented_kg, 0) * 0.35) : 0;
        setImpact({ meals_rescued: mealsSaved, food_saved_kg: foodSaved, people_fed: peopleFed, co_prevented_kg: coPrevented });

        const historyRows = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)
            ? historyRes.value.map((row) => ({
                id: row.id,
                date: row.updated_at || row.picked_up_at || row.pickup_scheduled_at || row.created_at,
                source: row.hostel_name || 'Hostel',
                quantity: toNumber(row.total_quantity_kg, 0),
                beneficiary: row.notes || 'Community Kitchen',
                status: pickupStatusLabel(row.status)
            }))
            : [];
        setHistory(historyRows);

        const monthlyCollection = analyticsRes.status === 'fulfilled' && Array.isArray(analyticsRes.value?.monthly_collection)
            ? analyticsRes.value.monthly_collection
            : [];
        setAnalytics({ monthly_collection: monthlyCollection });

        const notificationsRows = notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value) ? notificationsRes.value : [];
        setNotifications(notificationsRows);

        const failed = [donationsRes, impactRes, historyRes, analyticsRes, notificationsRes].some((x) => x.status !== 'fulfilled');
        if (failed) setError('Failed to fetch data');
        setLoading(false);
    };

    const handleClaim = async (donationId) => {
        try {
            await api.post('/api/ngo/claim', { donation_id: donationId });
            await fetchData();
        } catch (claimError) {
            setError(claimError.message || 'Operation failed');
        }
    };

    const handleUpdateStatus = async (donationId, status) => {
        try {
            await api.put('/api/ngo/update-status', { donation_id: donationId, status });
            await fetchData();
        } catch (updateError) {
            setError(updateError.message || 'Operation failed');
        }
    };

    const rescueOpportunities = useMemo(() => {
        const available = donations.filter((donation) => donation.status === 'available');
        return available.map((donation, i) => {
            const preparedAt = donation.created_at ? new Date(donation.created_at) : new Date();
            const spoilAt = new Date(preparedAt.getTime() + (4 * 60 * 60 * 1000));
            const minsLeft = Math.max(0, Math.round((spoilAt.getTime() - Date.now()) / 60000));
            const distanceKm = ((i + 2) * 1.4) + (hashPoint(donation.hostel_name, 20, 1) / 10);
            return { ...donation, time_remaining: minsLeft, distance_km: Number(distanceKm.toFixed(1)) };
        });
    }, [donations]);

    const pickupRequests = useMemo(() => {
        return donations
            .filter((d) => ['scheduled', 'picked_up', 'completed'].includes(d.status))
            .map((d) => ({
                id: d.id,
                pickup_location: d.pickup_location || d.hostel_address || d.hostel_name || 'Hostel',
                pickup_time: d.pickup_scheduled_at || d.created_at,
                quantity: toNumber(d.total_quantity_kg, 0),
                status: pickupStatusLabel(d.status)
            }));
    }, [donations]);

    const donationBreakdown = useMemo(() => {
        const grouped = {};
        donations.forEach((d) => {
            const source =
                d.source_type ||
                (String(d.hostel_name || '').toLowerCase().includes('event') ? 'Campus Events' : 'Hostel Mess');
            grouped[source] = (grouped[source] || 0) + toNumber(d.total_quantity_kg, 0);
        });
        const result = Object.entries(grouped)
            .map(([name, value]) => ({ name, value: toNumber(value, 0) }))
            .filter((x) => x.value > 0);

        return result;
    }, [donations]);

    const weeklyRedistributed = useMemo(() => buildWeeklyRedistributionData(history), [history]);
    const monthlyData = useMemo(() => (Array.isArray(analytics.monthly_collection) ? analytics.monthly_collection : []), [analytics.monthly_collection]);
    const sourceData = useMemo(() => (Array.isArray(donationBreakdown) ? donationBreakdown : []), [donationBreakdown]);
    const weeklyData = useMemo(() => (Array.isArray(weeklyRedistributed) ? weeklyRedistributed : []), [weeklyRedistributed]);

    const mapPoints = useMemo(() => {
        const donationPoints = donations.map((d) => ({
            id: `donation-${d.id}`,
            label: d.hostel_name || 'Hostel',
            type: 'donation',
            x: hashPoint(d.hostel_name, 86, 8),
            y: hashPoint(`${d.id}-y`, 78, 10),
            quantity: toNumber(d.total_quantity_kg, 0)
        }));
        const pickupPoints = pickupRequests.map((p) => ({
            id: `pickup-${p.id}`,
            label: p.pickup_location,
            type: 'pickup',
            x: hashPoint(`${p.id}-x`, 86, 8),
            y: hashPoint(`${p.id}-pickup-y`, 78, 10),
            quantity: p.quantity
        }));
        return [...donationPoints, ...pickupPoints].slice(0, 16);
    }, [donations, pickupRequests]);

    const activeLabel = NGO_SECTION_LINKS.find((s) => s.key === activeSection)?.label || 'RESCUE HUB';

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-creative-lime border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 lg:ml-72 transition-all duration-500 font-sans">
            <Navigation customLinks={NGO_SECTION_LINKS} activeItem={activeSection} onItemSelect={setActiveSection} />
            <div className="max-w-7xl mx-auto space-y-8 mt-20 lg:mt-0">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                        NGO <span className="text-creative-lime line-through">Network</span>
                    </h1>
                    <p className="text-white/50 font-medium tracking-widest uppercase text-sm mt-2">
                        Active Module: {activeLabel}
                    </p>
                </div>

                {error && (
                    <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-2xl px-5 py-4 text-sm text-yellow-300 flex items-center justify-between gap-4">
                        <span>{error}</span>
                        <button type="button" onClick={fetchData} className="px-4 py-2 rounded-xl bg-yellow-400/20 text-yellow-200 text-xs font-black uppercase tracking-widest hover:bg-yellow-400/30 transition-all">
                            Retry
                        </button>
                    </div>
                )}

                {activeSection === 'rescue' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-creative-lime">Rescue Hub</h2>
                        {rescueOpportunities.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-white/45">No live rescue opportunities.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {rescueOpportunities.map((opportunity) => (
                                    <div key={opportunity.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                        <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Available Now</p>
                                        <h3 className="text-xl font-black uppercase">{opportunity.hostel_name || 'Hostel'}</h3>
                                        <p className="text-sm text-white/70 mt-1">{opportunity.pickup_location || opportunity.hostel_address || 'Pickup Location'}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-5">
                                            <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Food Qty</p>
                                                <p className="text-2xl font-black text-creative-lime">{opportunity.total_quantity_kg}kg</p>
                                            </div>
                                            <div className="bg-black/40 border border-white/10 rounded-2xl p-3">
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Distance</p>
                                                <p className="text-2xl font-black">{opportunity.distance_km}km</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-yellow-300 mt-4 uppercase tracking-widest">Time Remaining Before Spoilage: {opportunity.time_remaining} min</p>
                                        <button onClick={() => handleClaim(opportunity.id)} className="w-full mt-5 bg-creative-lime hover:bg-white text-black font-black uppercase tracking-widest py-3 rounded-xl transition-all">
                                            Accept Pickup
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'donations' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Live Donations</h2>
                        {donations.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-white/45">No available donations right now.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {donations.map((donation) => (
                                    <div key={donation.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 ${donation.status === 'available' ? 'bg-green-500/20 text-green-400' : donation.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : donation.status === 'picked_up' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white'}`}>{donation.status}</span>
                                                <h3 className="text-xl font-black uppercase">{donation.hostel_name || 'Hostel'}</h3>
                                                <p className="text-xs text-white/50 uppercase tracking-widest mt-1">{donation.meal_type || 'Meal'}</p>
                                            </div>
                                            <p className="text-3xl font-black text-creative-lime">{donation.total_quantity_kg}<span className="text-lg text-creative-lime/60">kg</span></p>
                                        </div>
                                        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Prepared Time</p>
                                            <p className="text-sm text-white/80">{formatDateTime(donation.created_at)}</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-4 mb-2">Pickup Deadline</p>
                                            <p className="text-sm text-yellow-300">{formatDateTime(donation.pickup_scheduled_at || new Date(new Date(donation.created_at || Date.now()).getTime() + 2 * 60 * 60 * 1000))}</p>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {donation.food_items.map((item, i) => (
                                                <span key={`${donation.id}-${i}`} className="bg-white/5 border border-white/10 px-2 py-1 rounded-md text-xs">
                                                    {item.name} ({item.quantity}{item.unit})
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-6">
                                            {donation.status === 'available' && (
                                                <button onClick={() => handleClaim(donation.id)} className="w-full bg-creative-lime hover:bg-white text-black font-black uppercase tracking-widest py-3 rounded-xl transition-all">
                                                    Claim Donation
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'pickup' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pickup Requests</h2>
                        {pickupRequests.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-white/45">No accepted rescue missions.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pickupRequests.map((request) => (
                                    <div key={request.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Mission #{request.id}</h3>
                                        <p className="text-sm text-white/70 mt-1">{request.pickup_location}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                <p className="text-[10px] uppercase tracking-widest text-white/40">Pickup Time</p>
                                                <p className="text-sm font-semibold mt-1">{formatDateTime(request.pickup_time)}</p>
                                            </div>
                                            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                                                <p className="text-[10px] uppercase tracking-widest text-white/40">Quantity</p>
                                                <p className="text-2xl font-black text-creative-lime mt-1">{request.quantity}kg</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${statusClass(request.status)}`}>{request.status}</span>
                                            <div className="flex gap-2">
                                                {request.status === 'Pending' && (
                                                    <button onClick={() => handleUpdateStatus(request.id, 'picked_up')} className="text-xs bg-blue-500 hover:bg-blue-400 text-black font-black uppercase tracking-widest px-3 py-2 rounded-lg">
                                                        In Transit
                                                    </button>
                                                )}
                                                {request.status === 'In Transit' && (
                                                    <button onClick={() => handleUpdateStatus(request.id, 'completed')} className="text-xs bg-creative-lime hover:bg-white text-black font-black uppercase tracking-widest px-3 py-2 rounded-lg">
                                                        Completed
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'analytics' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Donation Analytics</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Monthly Food Rescued (kg)</h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="month" stroke="#9ca3af" />
                                            <YAxis domain={[0, 'dataMax + 100']} stroke="#9ca3af" />
                                            <Tooltip />
                                            <Bar dataKey="quantity_kg" fill="#22c55e" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Donation Source Breakdown</h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                            <Pie
                                                data={sourceData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={52}
                                                outerRadius={88}
                                                paddingAngle={3}
                                                label
                                            >
                                                {sourceData.map((entry, index) => (
                                                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Meals Redistributed Per Week</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={weeklyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="week" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="meals" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="text-lg font-black uppercase tracking-widest text-white/80 mb-4">Smart Donation Map</h3>
                            <div className="relative h-[330px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-creative-lime/5 overflow-hidden">
                                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,#22c55e22,transparent_40%),radial-gradient(circle_at_70%_65%,#3b82f622,transparent_35%)]"></div>
                                {mapPoints.map((point) => (
                                    <div key={point.id} className="absolute group" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px] ${point.type === 'donation' ? 'bg-creative-lime shadow-green-500/80' : 'bg-blue-400 shadow-blue-500/80'}`}></div>
                                        <div className="hidden group-hover:block absolute z-20 mt-2 -left-8 bg-black border border-white/10 rounded-lg px-2 py-1 whitespace-nowrap text-xs">
                                            {point.label} ({point.quantity}kg)
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-6 mt-4 text-xs uppercase tracking-widest text-white/60">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-creative-lime"></span>Hostel donation points</span>
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"></span>NGO pickup points</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'history' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Distribution History</h2>
                        {history.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-white/45">No rescue mission history available.</div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-white/50 uppercase tracking-widest text-[10px]">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Food Source</th>
                                            <th className="p-3">Quantity</th>
                                            <th className="p-3">Beneficiary Organization</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((item) => (
                                            <tr key={item.id} className="border-t border-white/10">
                                                <td className="p-3 text-white/80">{formatDateTime(item.date)}</td>
                                                <td className="p-3 font-semibold">{item.source}</td>
                                                <td className="p-3">{item.quantity}kg</td>
                                                <td className="p-3">{item.beneficiary}</td>
                                                <td className="p-3">
                                                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${statusClass(item.status)}`}>{item.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'impact' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-creative-lime">Impact Metrics</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-creative-lime/20 to-transparent border border-creative-lime/30 rounded-3xl p-6">
                                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Meals Rescued</p>
                                <p className="text-4xl font-black italic tracking-tighter text-white">{impact.meals_rescued}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 rounded-3xl p-6">
                                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Food Saved</p>
                                <p className="text-4xl font-black italic tracking-tighter text-white">{impact.food_saved_kg}<span className="text-xl text-white/50">kg</span></p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-3xl p-6">
                                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">People Fed</p>
                                <p className="text-4xl font-black italic tracking-tighter text-white">{impact.people_fed}</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/30 rounded-3xl p-6">
                                <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">CO Prevented</p>
                                <p className="text-4xl font-black italic tracking-tighter text-white">{impact.co_prevented_kg}<span className="text-xl text-white/50">kg</span></p>
                            </div>
                        </div>

                        {notifications.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xl font-black uppercase tracking-widest text-creative-lime">Live Pickup Alerts</h3>
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`rounded-2xl p-4 border ${
                                            notification.priority === 'critical'
                                                ? 'bg-red-500/15 border-red-500/40'
                                                : notification.priority === 'warning'
                                                    ? 'bg-yellow-500/15 border-yellow-500/40'
                                                    : 'bg-blue-500/15 border-blue-500/40'
                                        }`}
                                    >
                                        <p className="text-sm font-bold uppercase tracking-wider">
                                            {notification.hostel_name || 'Hostel'} | {notification.meal_type || 'Meal'}
                                        </p>
                                        <p className="text-xs text-white/80 mt-1">
                                            Pickup at {formatDateTime(notification.pickup_scheduled_at)} | {notification.total_quantity_kg}kg
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    <a href={mapLinkQuery('Hostel donation points near me')} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300">
                        Open Nearby Donation Points in Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
}
