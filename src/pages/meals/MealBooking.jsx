import React, { useMemo, useState, useEffect } from 'react';
import Navigation from '../../components/layout/Navigation';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Notification from '../../components/common/Notification';
import api from '../../lib/api';

const MEAL_METADATA = {
    breakfast: { icon: '🍳', calories: 320, protein: '8g' },
    lunch: { icon: '🍛', calories: 650, protein: '12g' },
    dinner: { icon: '🌙', calories: 580, protein: '14g' }
};

export default function MealBooking() {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookings, setBookings] = useState({});
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    // Fetch bookings and merge with voting results
    useEffect(() => {
        async function fetchData() {
                setLoading(true);
                try {
                    const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
                    const dateStr = localDate.toISOString().split('T')[0];
                    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

                    const [mealsData, bookingsData, finalMenuResponse] = await Promise.all([
                        api.get(`/api/meals?date=${dateStr}`),
                        api.get(`/api/meal-bookings?date=${dateStr}`),
                        api.get('/api/final-menu')
                    ]);

                    const finalMenuMap = finalMenuResponse?.menu || {};

                const bookedMealIds = new Set(bookingsData?.map(b => b.meal_id));
                const currentBookings = {};

                const processedMeals = mealsData?.map(meal => {
                    if (bookedMealIds.has(meal.id)) currentBookings[meal.id] = true;

                    const votedMenu = finalMenuMap?.[dayName]?.[meal.meal_type] || 'Chef Special';
                    const metadata = MEAL_METADATA[meal.meal_type] || {};

                    return {
                        ...meal,
                        name: meal.meal_type.toUpperCase(),
                        menu: votedMenu,
                        ...metadata
                    };
                }) || [];

                const order = { breakfast: 1, lunch: 2, dinner: 3 };
                processedMeals.sort((a, b) => order[a.meal_type] - order[b.meal_type]);
                setMeals(processedMeals);
                setBookings(currentBookings);
            } catch (error) {
                console.error('Fetch error:', error);
                setNotification({ show: true, message: 'TELEMETRY FAILURE', type: 'error' });
            } finally {
                setLoading(false);
            }
        }
        if (user) fetchData();
    }, [selectedDate, user]);

    const toggleBooking = async (meal) => {
        const isBooked = bookings[meal.id];
        const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
        const dateStr = localDate.toISOString().split('T')[0];
        try {
            if (isBooked) {
                await api.delete('/api/meal-bookings', { meal_id: meal.id });
                setBookings(prev => ({ ...prev, [meal.id]: false }));
                setNotification({ show: true, message: 'AUTH WITHDRAWN', type: 'info' });
            } else {
                await api.post('/api/book', { meal_type: meal.meal_type, date: dateStr });
                setBookings(prev => ({ ...prev, [meal.id]: true }));
                setNotification({ show: true, message: 'PROVISION SECURED', type: 'success' });
            }
        } catch (error) {
            setNotification({ show: true, message: 'BOOKING REJECTED', type: 'error' });
        }
    };

    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });
    const occupancy = useMemo(() => {
        const total = meals.reduce((sum, meal) => sum + (Number(meal.max_capacity) || 0), 0);
        const booked = Object.values(bookings).filter(Boolean).length;
        return { total, booked };
    }, [meals, bookings]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />
            <Notification isVisible={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-creative-lime/5 blur-[200px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                    {/* Header - Industrial Matrix */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                        <div className="animate-fade-in">
                            <div className="inline-block px-4 py-1 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-creative-lime">
                                Provisioning Protocol: Active
                            </div>
                            <h1 className="text-6xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                                PORTAL<br />
                                <span className="text-creative-lime">BOOKING.</span>
                            </h1>
                        </div>

                        {/* Occupancy HUD */}
                        <Card variant="premium" className="w-full lg:w-96 border-white/5 animate-slide-left p-10">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 text-creative-lime">CAPACITY OVERLAY</span>
                                <div className="w-2 h-2 rounded-full bg-creative-lime animate-ping"></div>
                            </div>
                            <div className="flex items-baseline gap-4 mb-6">
                                <span className="text-6xl font-black italic tracking-tighter">{occupancy.booked}</span>
                                <span className="text-xl font-black text-white/20 italic">/ {occupancy.total}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-creative-lime shadow-[0_0_20px_rgba(163,230,53,0.8)] transition-all duration-1000" style={{ width: `${occupancy.total > 0 ? (occupancy.booked / occupancy.total) * 100 : 0}%` }} />
                            </div>
                        </Card>
                    </div>

                    {/* Temporal Selector */}
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-2">
                        {dates.map((date, i) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex-shrink-0 w-32 h-44 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 transition-all duration-500 border-2 ${isSelected
                                        ? 'bg-creative-lime text-black border-creative-lime shadow-[0_0_50px_rgba(163,230,53,0.2)] scale-110'
                                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-black' : 'text-white/20'}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    <span className="text-5xl font-black italic tracking-tighter leading-none">{date.getDate()}</span>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black mt-2 animate-pulse" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Matrix */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                            <div className="w-20 h-20 border-4 border-creative-lime/20 border-t-creative-lime rounded-full animate-spin mb-8" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-creative-lime">Syncing Matrix...</span>
                        </div>
                    ) : meals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {meals.map((meal) => (
                                <Card
                                    key={meal.id}
                                    variant="glass"
                                    className={`h-full group/card transition-all duration-700 hover:border-creative-lime/50 ${bookings[meal.id] ? 'border-creative-lime/30 bg-creative-lime/[0.02]' : 'border-white/5'}`}
                                >
                                    <div className="flex flex-col h-full justify-between gap-12">
                                        <div className="flex justify-between items-start">
                                            <div className="text-4xl transition-transform group-hover/card:scale-125 duration-700">{meal.icon}</div>
                                            {bookings[meal.id] && (
                                                <div className="px-4 py-1 bg-creative-lime text-black text-[10px] font-black rounded-full shadow-[0_0_20px_rgba(163,230,53,0.4)] animate-bounce-in">
                                                    AUTHORIZED
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-3xl font-black tracking-tighter italic uppercase mb-2 group-hover/card:text-creative-lime transition-colors">
                                                {meal.name}
                                            </h3>
                                            <div className="flex items-center gap-4 text-[10px] font-black text-white/30 tracking-widest uppercase mb-8">
                                                <span>{meal.start_time?.slice(0, 5)} - {meal.end_time?.slice(0, 5)}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span>GMT +5:30</span>
                                            </div>

                                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 mb-8">
                                                <p className="text-sm font-medium text-white/60 leading-relaxed uppercase tracking-tight">
                                                    {meal.menu || 'TBD'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-center">
                                                    <span className="text-xs font-black italic">{meal.calories}kCal</span>
                                                </div>
                                                <div className="flex-1 px-4 py-2 bg-black/40 rounded-xl border border-white/5 text-center">
                                                    <span className="text-xs font-black italic text-creative-purple">{meal.protein}P</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 rounded-2xl border border-creative-lime/20 bg-creative-lime/5 px-4 py-3">
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Fixed Meal Price</p>
                                                <p className="mt-2 text-2xl font-black text-creative-lime">₹100</p>
                                                <p className="text-xs text-white/45 mt-1">Booked and attended meals are billed at ₹90 after the 10% reward.</p>
                                            </div>
                                        </div>

                                        <Button
                                            variant={bookings[meal.id] ? "outline" : "primary"}
                                            onClick={() => toggleBooking(meal)}
                                            size="lg"
                                            className="w-full"
                                        >
                                            {bookings[meal.id] ? 'WITHDRAW AUTH' : 'SECURE TOKEN'}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card variant="glass" className="py-32 flex flex-col items-center text-center">
                            <div className="w-12 h-12 border-4 border-creative-lime border-t-transparent rounded-full animate-spin mb-8"></div>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-creative-lime">Calibrating Network</h3>
                            <p className="text-white/40 max-w-md font-medium px-8">Synchronizing telemetry data with the primary command matrix. Please wait.</p>
                        </Card>
                    )}

                    {/* Impact HUD */}
                    {Object.values(bookings).some(Boolean) && (
                        <Card variant="premium" className="bg-gradient-to-r from-creative-lime/20 via-black to-creative-purple/20 border-white/5 p-12 overflow-hidden group">
                            <div className="absolute top-0 right-0 w-[30vw] h-[30vw] bg-creative-lime/10 blur-[100px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
                            <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                                <div className="flex items-center gap-10">
                                    <div className="w-24 h-24 rounded-3xl bg-creative-lime text-black flex items-center justify-center text-5xl shadow-[0_20px_60px_-15px_rgba(163,230,53,0.5)]">
                                        🌱
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter italic uppercase underline decoration-creative-lime underline-offset-8 mb-4">Vanguard Streak</h2>
                                        <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Homeostasis maintained. Carbon footprint mitigated.</p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <span className="text-6xl font-black italic tracking-tighter text-creative-lime">+50 PTS</span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-2">SOCIAL CAPITAL ADJUSTMENT</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
