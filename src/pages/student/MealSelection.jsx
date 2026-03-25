import React, { useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Notification from '../../components/common/Notification';
import { useMeals } from '../../context/MealContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const DAY_LABELS = {
    monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
    thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN'
};

export default function MealSelection() {
    const {
        finalizedMenu,
        loading: contextLoading,
        error: contextError,
        retryLoad,
        weekKey
    } = useMeals();
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />
            <Notification isVisible={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <main className="lg:ml-72 min-h-screen pt-20 pb-24 lg:py-8 px-4 md:px-8 lg:px-16 relative overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 md:gap-8 animate-fade-in">
                        <div>
                            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] italic uppercase">
                                MEAL<br />
                                <span className="text-creative-purple">SELECT.</span>
                            </h1>
                            <p className="mt-4 text-sm text-white/50 font-medium max-w-xl">
                                Weekly menu is fetched from the database and displayed in read-only mode.
                            </p>
                        </div>

                        <Card variant="premium" className="w-full lg:w-96 border-white/5 p-5 md:p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Status</span>
                                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">DB LINKED</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Week</span>
                                    <span className="text-sm font-black tracking-widest text-creative-purple">{weekKey}</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {contextLoading && (
                        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                            <div className="w-20 h-20 border-4 border-creative-purple/20 border-t-creative-purple rounded-full animate-spin mb-8" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-creative-purple">Loading Menu...</span>
                        </div>
                    )}

                    {contextError && !contextLoading && (
                        <Card variant="glass" className="py-20 flex flex-col items-center text-center">
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Data Feed Interrupted</h3>
                            <p className="text-white/40 max-w-md font-medium mb-8">{contextError}</p>
                            <Button onClick={retryLoad}>RETRY CONNECTION</Button>
                        </Card>
                    )}

                    {!contextLoading && !contextError && (
                        <Card variant="premium" className="border-white/5 overflow-visible">
                            <div className="flex justify-between items-center mb-10 px-4">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter italic uppercase text-creative-purple mb-2">FINALIZED MENU</h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="py-6 px-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Day</th>
                                            {MEAL_TYPES.map(m => (
                                                <th key={m} className="py-6 px-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                                                    {m}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {DAYS.map(day => (
                                            <tr key={day} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-6 px-6 font-black italic tracking-tight text-white/80 uppercase">
                                                    {DAY_LABELS[day]}
                                                </td>
                                                {MEAL_TYPES.map(m => {
                                                    const slotKey = `${day}_${m}`;
                                                    return (
                                                        <td key={m} className="py-6 px-6">
                                                            <p className="text-xs font-black tracking-tight uppercase text-white/60 leading-relaxed">
                                                                {finalizedMenu?.[slotKey]?.name || 'NOT SCHEDULED'}
                                                            </p>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
