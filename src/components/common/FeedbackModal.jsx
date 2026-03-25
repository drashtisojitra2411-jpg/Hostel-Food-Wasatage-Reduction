import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import Notification from './Notification';
import { saveFeedback } from '../../utils/feedback';

export default function FeedbackModal({ isOpen, onClose, user, profile, day, mealType, mealName, mealId }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            setNotification({ show: true, message: 'PLEASE SELECT A RATING', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        const result = await saveFeedback({
            user_id: user.id,
            user_role: profile?.roles?.name || 'student',
            day,
            meal_type: mealType,
            rating,
            comment,
            finalized_meal_id: mealId
        });

        if (result.success) {
            setNotification({ show: true, message: 'FEEDBACK SUBMITTED SUCCESSFULLY', type: 'success' });
            setTimeout(() => {
                onClose();
                // Reset state after closing
                setRating(0);
                setComment('');
            }, 1000);
        } else {
            setNotification({ show: true, message: `ERROR: ${result.error}`, type: 'error' });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <Notification
                isVisible={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(prev => ({ ...prev, show: false }))}
            />

            <Card variant="glass" className="w-full max-w-lg border-white/10 p-10 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
                >
                    ✕
                </button>

                <div className="mb-8">
                    <div className="inline-block px-3 py-1 border border-creative-lime/30 rounded-full text-[8px] font-black uppercase tracking-widest text-creative-lime mb-4">
                        Quality Control Protocol
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter italic uppercase leading-none mb-2">
                        Meal<br />
                        <span className="text-creative-lime">Feedback.</span>
                    </h2>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-2">
                        {day?.toUpperCase()} • {mealType?.toUpperCase()} • {mealName || 'TBD'}
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Star Rating */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 block">Satisfaction Level *</label>
                        <div className="flex gap-4">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setRating(num)}
                                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${rating >= num
                                        ? 'bg-creative-lime border-creative-lime text-black shadow-[0_0_20px_rgba(163,230,53,0.3)]'
                                        : 'border-white/5 bg-white/5 text-white/20 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-xl font-black italic">{num}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 block">Observations (Optional)</label>
                            <span className={`text-[8px] font-black ${comment.length >= 300 ? 'text-red-500' : 'text-white/20'}`}>
                                {comment.length} / 300
                            </span>
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 300))}
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white/80 focus:border-creative-lime/50 focus:outline-none transition-all resize-none"
                            placeholder="TRANSMIT YOUR NUTRITIONAL FEEDBACK..."
                        />
                    </div>

                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={isSubmitting || rating === 0}
                    >
                        SUBMIT INTEL →
                    </Button>
                </div>
            </Card>
        </div>
    );
}
