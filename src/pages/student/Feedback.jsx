import { useMemo, useState } from 'react'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Toast from '../../components/common/Toast'
import { FEEDBACK_MAX_LENGTH, FEEDBACK_MEAL_TYPES, submitAnonymousFeedback } from '../../utils/feedback'

const INITIAL_FORM = {
    message: '',
    rating: '5',
    meal_type: 'lunch'
}

function StarPreview({ rating = 0 }) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0))
    return (
        <div className="flex gap-2 text-xl">
            {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={index < value ? 'text-amber-300' : 'text-white/20'}>&#9733;</span>
            ))}
        </div>
    )
}

export default function Feedback() {
    const [form, setForm] = useState(INITIAL_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    const remainingChars = useMemo(() => FEEDBACK_MAX_LENGTH - form.message.length, [form.message.length])

    async function handleSubmit(event) {
        event.preventDefault()

        if (!form.message.trim()) {
            setToastMessage('Please enter feedback before submitting.')
            setToastType('warning')
            return
        }

        setSubmitting(true)
        const result = await submitAnonymousFeedback({
            message: form.message,
            rating: form.rating,
            meal_type: form.meal_type
        })

        if (result.success) {
            setForm(INITIAL_FORM)
            setToastMessage('Feedback submitted anonymously')
            setToastType('success')
        } else {
            setToastMessage(result.error || 'Failed to submit feedback')
            setToastType('error')
        }
        setSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />

            <main className="lg:ml-72 px-4 pb-24 pt-20 md:px-8 lg:px-12 lg:py-10">
                <div className="mx-auto max-w-5xl space-y-6">
                    <header className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Anonymous Feedback System</p>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Share what worked. Fix what did not.</h1>
                        <p className="max-w-2xl text-sm text-white/60">
                            Your message is stored without name or student ID. Mess manager, chef, and hostel admin only see the feedback itself.
                        </p>
                    </header>

                    <Card variant="premium" className="rounded-[2rem] p-6 sm:p-8" hover={false}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Meal type</span>
                                    <select
                                        value={form.meal_type}
                                        onChange={(event) => setForm((prev) => ({ ...prev, meal_type: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none transition focus:border-creative-lime/50"
                                    >
                                        {FEEDBACK_MEAL_TYPES.map((meal) => (
                                            <option key={meal} value={meal}>
                                                {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Rating</span>
                                    <div className="mt-2 rounded-2xl border border-white/10 bg-black p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <select
                                                value={form.rating}
                                                onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))}
                                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-creative-lime/50"
                                            >
                                                {[5, 4, 3, 2, 1].map((value) => (
                                                    <option key={value} value={value}>{value} / 5</option>
                                                ))}
                                            </select>
                                            <StarPreview rating={form.rating} />
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <label className="block">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Feedback message</span>
                                    <span className={`text-xs ${remainingChars < 30 ? 'text-amber-300' : 'text-white/35'}`}>
                                        {form.message.length}/{FEEDBACK_MAX_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    value={form.message}
                                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value.slice(0, FEEDBACK_MAX_LENGTH) }))}
                                    placeholder="Write your feedback about food quality, quantity, hygiene, taste, or service."
                                    className="mt-2 h-40 w-full rounded-[1.75rem] border border-white/10 bg-black px-5 py-4 text-sm outline-none transition resize-none focus:border-creative-lime/50"
                                    maxLength={FEEDBACK_MAX_LENGTH}
                                    required
                                />
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <div>
                                    <p className="text-sm font-semibold">Submission stays anonymous</p>
                                    <p className="text-xs text-white/50">No student identity is sent with this form.</p>
                                </div>
                                <Button type="submit" isLoading={submitting} disabled={submitting || !form.message.trim()}>
                                    Submit Feedback
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </main>

            <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
        </div>
    )
}
