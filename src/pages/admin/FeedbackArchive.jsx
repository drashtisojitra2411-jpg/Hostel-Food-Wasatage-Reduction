import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { fetchFeedback } from '../../utils/feedback'
import { useAuth } from '../../context/AuthContext'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const PAGE_SIZE = 24

function formatDate(value) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '--'
    return parsed.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    })
}

function RatingBadge({ value }) {
    const rating = Math.max(0, Math.min(5, Number(value) || 0))
    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-1 text-base">
                {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} className={index < rating ? 'text-amber-300' : 'text-white/15'}>&#9733;</span>
                ))}
            </div>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {rating > 0 ? `${rating}/5` : 'No rating'}
            </span>
        </div>
    )
}

export default function FeedbackArchive() {
    const navigate = useNavigate()
    const { role } = useAuth()
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [count, setCount] = useState(0)
    const [filters, setFilters] = useState({ meal_type: '', date: '' })

    useEffect(() => {
        let cancelled = false

        async function loadFeedback() {
            setLoading(true)
            const result = await fetchFeedback({
                ...filters,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE
            })

            if (!cancelled) {
                setFeedback(result.success ? result.data : [])
                setCount(result.success ? result.count : 0)
                setLoading(false)
            }
        }

        loadFeedback()
        return () => {
            cancelled = true
        }
    }, [filters, page])

    const pageTitle = useMemo(() => {
        if (role === 'chef') return 'Kitchen Feedback Archive'
        if (role === 'hostel_admin') return 'Hostel Feedback Archive'
        if (role === 'mess_manager') return 'Mess Feedback Archive'
        return 'Anonymous Feedback Archive'
    }, [role])

    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />

            <main className="lg:ml-72 px-4 pb-24 pt-20 md:px-8 lg:px-12 lg:py-10">
                <div className="mx-auto max-w-6xl space-y-6">
                    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Visible to chef, manager, and admin</p>
                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{pageTitle}</h1>
                            <p className="mt-2 max-w-2xl text-sm text-white/55">
                                This view only shows anonymous feedback content. Student names and IDs are intentionally excluded.
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => navigate(role === 'chef' ? '/chef' : role === 'super_admin' ? '/admin' : '/mess-manager')}>
                            Back to Dashboard
                        </Button>
                    </header>

                    <Card variant="glass" className="rounded-[2rem] p-5 sm:p-6" hover={false}>
                        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                            <label className="block">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Meal type</span>
                                <select
                                    value={filters.meal_type}
                                    onChange={(event) => {
                                        setFilters((prev) => ({ ...prev, meal_type: event.target.value }))
                                        setPage(0)
                                    }}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none transition focus:border-creative-lime/50"
                                >
                                    <option value="">All meals</option>
                                    {MEAL_TYPES.map((meal) => (
                                        <option key={meal} value={meal}>
                                            {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Date</span>
                                <input
                                    type="date"
                                    value={filters.date}
                                    onChange={(event) => {
                                        setFilters((prev) => ({ ...prev, date: event.target.value }))
                                        setPage(0)
                                    }}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none transition focus:border-creative-lime/50"
                                />
                            </label>

                            <div className="flex items-end">
                                <Button
                                    variant="ghost"
                                    className="w-full border border-white/10"
                                    onClick={() => {
                                        setFilters({ meal_type: '', date: '' })
                                        setPage(0)
                                    }}
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {loading ? (
                        <Card variant="premium" className="rounded-[2rem] p-10 text-center" hover={false}>
                            <div className="mx-auto h-12 w-12 rounded-full border-4 border-creative-lime/20 border-t-creative-lime animate-spin" />
                            <p className="mt-4 text-sm text-white/55">Loading anonymous feedback...</p>
                        </Card>
                    ) : feedback.length === 0 ? (
                        <Card variant="premium" className="rounded-[2rem] p-10 text-center" hover={false}>
                            <p className="text-lg font-semibold">No feedback yet</p>
                            <p className="mt-2 text-sm text-white/55">New anonymous submissions will appear here after students send them.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {feedback.map((item) => (
                                <Card key={item.id} variant="premium" className="rounded-[2rem] p-5" hover={false}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.25em] text-creative-lime">{item.meal_type}</p>
                                            <p className="mt-2 text-xs text-white/45">{formatDate(item.created_at)}</p>
                                        </div>
                                        <RatingBadge value={item.rating} />
                                    </div>
                                    <p className="mt-5 text-sm leading-7 text-white/85">{item.message}</p>
                                    <div className="mt-5 border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.2em] text-white/30">
                                        Anonymous entry
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {count > PAGE_SIZE && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-white/55">
                                Page {page + 1} of {totalPages}
                            </p>
                            <div className="flex gap-3">
                                <Button variant="ghost" className="border border-white/10" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
                                    Previous
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="border border-white/10"
                                    disabled={page + 1 >= totalPages}
                                    onClick={() => setPage((prev) => prev + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
