import React, { useState } from 'react';
import Card from './Card';
import { useAuth } from '../../context/AuthContext';
import FeedbackModal from './FeedbackModal';
import { useMeals } from '../../context/MealContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🍳', lunch: '🍛', dinner: '🌙' };
const DAY_LABELS = {
    monday: 'M', tuesday: 'T', wednesday: 'W',
    thursday: 'T', friday: 'F', saturday: 'S', sunday: 'S'
};
const DAY_FULL = {
    monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
    thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN'
};

export default function WeeklyMenu({ compact = false }) {
    const {
        finalizedMenu: menu,
        loading,
        voterCount,
        votingStatus,
        weekKey
    } = useMeals();
    const [activeDay, setActiveDay] = useState('monday');
    const { user, profile } = useAuth();
    const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, day: null, mealType: null, mealName: null });

    if (loading) {
        return (
            <Card variant="glass" className="p-8">
                <div className="flex items-center justify-center gap-4 py-8">
                    <div className="w-6 h-6 border-2 border-creative-purple/20 border-t-creative-purple rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                        Loading Menu...
                    </span>
                </div>
            </Card>
        );
    }

    if (!menu) {
        return (
            <Card variant="glass" className="p-8">
                <div className="text-center py-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                        No menu data available
                    </span>
                </div>
            </Card>
        );
    }

    // Compact mode: show only active day's meals
    if (compact) {
        return (
            <Card variant="glass" className="p-0 overflow-hidden">
                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-creative-purple rounded-full" />
                            <div>
                                <h3 className="text-lg font-black tracking-tighter italic uppercase">Weekly Menu</h3>
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                                    {weekKey} • {voterCount} votes
                                </span>
                            </div>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-1 rounded-full border ${votingStatus === 'OPEN'
                            ? 'border-creative-lime/30 text-creative-lime bg-creative-lime/10'
                            : 'border-white/10 text-white/30 bg-white/5'
                            }`}>
                            {votingStatus === 'OPEN' ? 'VOTING' : 'FINALIZED'}
                        </span>
                    </div>

                    {/* Day Pills */}
                    <div className="flex gap-1.5">
                        {DAYS.map(day => (
                            <button
                                key={day}
                                onClick={() => setActiveDay(day)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${activeDay === day
                                    ? 'bg-creative-purple text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                                    }`}
                            >
                                {DAY_LABELS[day]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Day Meals */}
                <div className="px-8 pb-8 pt-4 space-y-3">
                    {MEAL_TYPES.map(meal => {
                        const slotKey = `${activeDay}_${meal}`;
                        return (
                            <div key={meal} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-xl">{MEAL_ICONS[meal]}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">{meal}</span>
                                    <p className="text-xs font-black tracking-tight uppercase text-white/70 truncate">
                                        {menu[slotKey]?.name || 'TBD'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFeedbackModal({
                                        isOpen: true,
                                        day: activeDay,
                                        mealType: meal,
                                        mealName: menu[slotKey]?.name,
                                        mealId: menu[slotKey]?.id
                                    })}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-creative-lime hover:border-creative-lime/30 hover:bg-creative-lime/10 transition-all"
                                >
                                    💬 FEEDBACK
                                </button>
                            </div>
                        );
                    })}
                </div>

                <FeedbackModal
                    isOpen={feedbackModal.isOpen}
                    onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                    user={user}
                    profile={profile}
                    day={feedbackModal.day}
                    mealType={feedbackModal.mealType}
                    mealName={feedbackModal.mealName}
                    mealId={feedbackModal.mealId}
                />
            </Card>
        );
    }

    // Full mode: table view
    return (
        <Card variant="glass" className="p-0 overflow-hidden">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-creative-purple rounded-full" />
                    <div>
                        <h3 className="text-xl font-black tracking-tighter italic uppercase">Weekly Menu Overview</h3>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                            Week {weekKey} • {voterCount} voter{voterCount !== 1 ? 's' : ''} • {votingStatus === 'OPEN' ? 'Voting in progress' : 'Finalized'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto px-4 pb-6">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="py-4 px-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Day</th>
                            {MEAL_TYPES.map(m => (
                                <th key={m} className="py-4 px-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                                    {MEAL_ICONS[m]} {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {DAYS.map(day => (
                            <tr key={day} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4 font-black italic text-xs tracking-tight text-white/60 uppercase">
                                    {DAY_FULL[day]}
                                </td>
                                {MEAL_TYPES.map(m => (
                                    <td key={m} className="py-4 px-4">
                                        <p className="text-[10px] font-bold tracking-tight uppercase text-white/50 leading-relaxed">
                                            {menu[`${day}_${m}`]?.name || 'TBD'}
                                        </p>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
