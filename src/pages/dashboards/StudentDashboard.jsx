import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import WeeklyMenu from '../../components/common/WeeklyMenu'
import api from '../../lib/api'

export default function StudentDashboard() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()

    const [stats, setStats] = useState({ mealsBooked: 0, mealsAttended: 0, mealsSkipped: 0, presentAbsentRatio: 0, donations: 0 })
    const [activities, setActivities] = useState([])
    const [rewardSummary, setRewardSummary] = useState({
        rewards: { points: 0, total_meals: 0, total_rewards: 0 },
        penalty: { skipped_meals_count: 0, penalty_status: 'clear', total_penalties: 0, note: '' },
        fee_preview: { base_fee: 100, discount_percent: 10, effective_fee: 90 }
    })
    const [billingSummary, setBillingSummary] = useState(null)
    const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7))
    const [paying, setPaying] = useState(false)

    const greeting = useMemo(() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }, [])

    const firstName = useMemo(() => profile?.full_name?.split(' ')?.[0] || 'Student', [profile?.full_name])

    const statCards = useMemo(() => [
        { label: 'Total Meals Booked', value: stats.mealsBooked },
        { label: 'Total Meals Attended', value: stats.mealsAttended },
        { label: 'Total Meals Skipped', value: stats.mealsSkipped },
        { label: 'Present / Absent Ratio', value: stats.presentAbsentRatio }
    ], [stats])

    const rewardsProgress = useMemo(() => {
        const points = Number(rewardSummary?.rewards?.points || 0)
        return Math.min(100, points % 100)
    }, [rewardSummary?.rewards?.points])

    const fetchDashboardData = useCallback(async (month = billingMonth) => {
        try {
            const [dashboardRes, historyRes, rewardsRes, billingRes] = await Promise.all([
                api.get('/api/student/dashboard'),
                api.get('/api/meal-bookings/history'),
                api.get('/api/rewards/summary'),
                api.get(`/api/billing/summary?month=${month}`)
            ])

            setStats({
                mealsBooked: dashboardRes?.meals_booked || 0,
                mealsAttended: dashboardRes?.meals_attended || 0,
                mealsSkipped: dashboardRes?.meals_skipped || 0,
                presentAbsentRatio: dashboardRes?.present_absent_ratio || 0,
                donations: dashboardRes?.donations_completed || 0
            })

            const latest = (Array.isArray(historyRes) ? historyRes : []).slice(0, 3).map((row) => ({
                id: row.id,
                title: `${String(row.meal_type || row.meal || 'Meal').toUpperCase()} ${String(row.status || '').toUpperCase()}`,
                time: row.booking_date || row.date || 'N/A'
            }))
            setActivities(latest)
            setRewardSummary(rewardsRes || null)
            setBillingSummary(billingRes || null)
        } catch {
            setStats({ mealsBooked: 0, mealsAttended: 0, mealsSkipped: 0, presentAbsentRatio: 0, donations: 0 })
            setActivities([])
            setBillingSummary(null)
        }
    }, [billingMonth])

    useEffect(() => {
        fetchDashboardData(billingMonth)
    }, [billingMonth, fetchDashboardData])

    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData(billingMonth)
        }, 15000)

        return () => clearInterval(interval)
    }, [billingMonth, fetchDashboardData])

    async function handlePayNow() {
        if (!billingSummary?.billing || paying) return
        setPaying(true)
        try {
            await api.post('/api/billing/pay', { month: billingMonth })
            await fetchDashboardData(billingMonth)
        } finally {
            setPaying(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        navigate('/login', { replace: true })
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="lg:ml-72 pt-20 pb-24 px-4 md:px-8 lg:px-16 lg:py-8">
                <div className="max-w-7xl mx-auto space-y-5">
                    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-white/70">{greeting}</p>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight">{firstName}</h1>
                            <p className="mt-2 text-sm text-white/55">These dashboard meal metrics are now aggregated across all students from the shared meal records dataset.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" className="!min-h-[44px]" onClick={() => navigate('/student/menu')}>Menu</Button>
                            <Button variant="outline" size="sm" className="!min-h-[44px]" onClick={() => navigate('/student/feedback')}>Feedback</Button>
                            <Button variant="outline" size="sm" className="!min-h-[44px]" onClick={() => navigate('/attendance-history')}>Attendance</Button>
                            <Button size="sm" className="!min-h-[44px]" onClick={() => navigate('/scan-attendance')}>Scan QR</Button>
                            <Button variant="ghost" size="sm" className="!min-h-[44px] col-span-2 md:col-span-1" onClick={handleLogout}>Logout</Button>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {statCards.map((stat) => (
                            <Card key={stat.label} variant="glass" className="rounded-2xl p-4 md:p-5" hover={false}>
                                <p className="text-xs text-white/60">{stat.label}</p>
                                <p className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight break-words">{stat.value}</p>
                            </Card>
                        ))}
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Card variant="premium" className="rounded-2xl p-5 md:p-6" hover={false}>
                            <h2 className="text-xl font-semibold tracking-tight">Reward Summary</h2>
                            <p className="text-sm text-white/70 mt-2">Your points and fee discount update after attendance scans.</p>

                            <div className="mt-4 space-y-3">
                                <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                                    <p className="text-xs text-white/60">Your Points</p>
                                    <p className="text-2xl font-semibold tracking-tight">{rewardSummary?.rewards?.points || 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                                    <p className="text-xs text-white/60">Rewarded Meal Price</p>
                                    <p className="text-xl font-semibold tracking-tight">
                                        INR {rewardSummary?.fee_preview?.effective_fee ?? 90}
                                        <span className="text-sm text-creative-lime ml-2">({rewardSummary?.fee_preview?.discount_percent || 0}% discount)</span>
                                    </p>
                                    <p className="text-xs text-white/50 mt-1">Base meal price: INR {rewardSummary?.fee_preview?.base_fee ?? 100}</p>
                                </div>
                                <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                                    <p className="text-xs text-white/60">Penalty Status</p>
                                    <p className={`text-xl font-semibold tracking-tight capitalize ${
                                        rewardSummary?.penalty?.penalty_status === 'penalty'
                                            ? 'text-red-400'
                                            : rewardSummary?.penalty?.penalty_status === 'warning'
                                                ? 'text-yellow-300'
                                                : 'text-creative-lime'
                                    }`}>
                                        {rewardSummary?.penalty?.penalty_status || 'clear'}
                                    </p>
                                    <p className="text-xs text-white/50 mt-1">
                                        Skipped booked meals: {rewardSummary?.penalty?.skipped_meals_count || 0} | Penalties: {rewardSummary?.penalty?.total_penalties || 0}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                                        <span>Next badge progress</span>
                                        <span>{Math.round(rewardsProgress)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-creative-lime" style={{ width: `${rewardsProgress}%` }} />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card variant="glass" className="rounded-2xl p-5 md:p-6 xl:col-span-2" hover={false}>
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                <div>
                                    <h2 className="text-lg md:text-xl font-semibold tracking-tight">Monthly Bill Breakdown</h2>
                                    <p className="text-sm text-white/60 mt-1">Base: booked meals x INR 100, rewards: attended meals x INR 10, penalties after every 4 skipped meals.</p>
                                </div>
                                <input
                                    type="month"
                                    value={billingMonth}
                                    onChange={(event) => setBillingMonth(event.target.value)}
                                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                                />
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: 'Booked', value: billingSummary?.monthly_breakdown?.total_meals_booked ?? 0 },
                                    { label: 'Attended', value: billingSummary?.monthly_breakdown?.total_meals_attended ?? 0, tone: 'text-creative-lime' },
                                    { label: 'Skipped', value: billingSummary?.monthly_breakdown?.total_meals_skipped ?? 0, tone: 'text-red-400' },
                                    { label: 'Rewards', value: `INR ${billingSummary?.monthly_breakdown?.total_rewards ?? 0}`, tone: 'text-creative-lime' },
                                    { label: 'Penalties', value: `INR ${billingSummary?.monthly_breakdown?.total_penalty_amount ?? 0}`, tone: 'text-red-400' }
                                ].map((item) => (
                                    <div key={item.label} className="rounded-xl border border-white/15 bg-white/5 px-4 py-4">
                                        <p className="text-xs text-white/60">{item.label}</p>
                                        <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.tone || ''}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <p className="text-xs text-white/60">Final Payable Amount</p>
                                    <p className="mt-2 text-3xl font-semibold tracking-tight">INR {billingSummary?.monthly_breakdown?.final_amount ?? 0}</p>
                                    <p className={`text-sm mt-1 ${(billingSummary?.monthly_breakdown?.payment_status || 'unpaid') === 'paid' ? 'text-creative-lime' : 'text-red-400'}`}>
                                        {(billingSummary?.monthly_breakdown?.payment_status || 'unpaid').toUpperCase()}
                                    </p>
                                </div>
                                <Button
                                    onClick={handlePayNow}
                                    disabled={!billingSummary?.billing || billingSummary?.monthly_breakdown?.payment_status === 'paid'}
                                    isLoading={paying}
                                >
                                    {billingSummary?.monthly_breakdown?.payment_status === 'paid' ? 'Paid' : 'Pay Now'}
                                </Button>
                            </div>
                        </Card>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <WeeklyMenu compact />
                        <Card variant="glass" className="rounded-2xl p-5 md:p-6" hover={false}>
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Recent Activity</h2>
                                <Link to="/history" className="text-sm text-creative-lime hover:underline">View all</Link>
                            </div>

                            <div className="mt-4 space-y-3">
                                {activities.length === 0 && <p className="text-sm text-white/60">No recent activity.</p>}
                                {activities.map((activity) => (
                                    <div key={activity.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                        <p className="font-medium text-sm break-words">{activity.title}</p>
                                        <p className="text-xs text-white/60 mt-1">{activity.time}</p>
                                    </div>
                                ))}
                                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                    <p className="text-xs uppercase tracking-widest text-red-300">Penalty Rule</p>
                                    <p className="text-sm text-white/70 mt-1">Skipping 4 booked meals triggers a penalty and resets the skip counter.</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                    <p className="text-xs uppercase tracking-widest text-white/60">Payment Status</p>
                                    <p className="text-sm text-white/70 mt-1">Your bill remains personal, but the dashboard meal metrics above are global across all students.</p>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    )
}
