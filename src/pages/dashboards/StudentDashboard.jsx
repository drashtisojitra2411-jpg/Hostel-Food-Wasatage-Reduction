import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import WeeklyMenu from '../../components/common/WeeklyMenu'
import api from '../../lib/api'

const preferenceOptions = [
    { id: 'veg', label: 'Veg Standard', desc: 'Plant-based meals for daily intake.' },
    { id: 'jain', label: 'Jain Protocol', desc: 'Strict root-free meals.' },
    { id: 'egg', label: 'Egg Reinforced', desc: 'Protein-focused meal option.' }
]

export default function StudentDashboard() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()

    const [selectedPreference, setSelectedPreference] = useState(null)
    const [stats, setStats] = useState({ mealsBooked: 0, wastesPrevented: 0, sustainabilityScore: 0, donations: 0 })
    const [activities, setActivities] = useState([])
    const [rewardSummary, setRewardSummary] = useState({
        rewards: { points: 0, total_meals: 0 },
        fee_preview: { base_fee: 120, discount_percent: 0, effective_fee: 120 }
    })

    const greeting = useMemo(() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }, [])

    const firstName = useMemo(() => profile?.full_name?.split(' ')?.[0] || 'Student', [profile?.full_name])

    const statCards = useMemo(() => [
        { label: 'Meals Booked', value: stats.mealsBooked },
        { label: 'Waste Saved (kg)', value: stats.wastesPrevented },
        { label: 'Efficiency Score', value: `${stats.sustainabilityScore}%` },
        { label: 'Donations', value: stats.donations }
    ], [stats])

    const rewardsProgress = useMemo(() => {
        const points = Number(rewardSummary?.rewards?.points || 0)
        const progressBase = 100
        return Math.min(100, (points % progressBase))
    }, [rewardSummary?.rewards?.points])

    const fetchDashboardData = useCallback(async () => {
        try {
            const [dashboardRes, historyRes, rewardsRes] = await Promise.all([
                api.get('/api/student/dashboard'),
                api.get('/api/meal-bookings/history'),
                api.get('/api/rewards/summary')
            ])

            setStats({
                mealsBooked: dashboardRes?.meals_booked || 0,
                wastesPrevented: dashboardRes?.wastes_prevented_kg || 0,
                sustainabilityScore: dashboardRes?.sustainability_score || 0,
                donations: dashboardRes?.donations_completed || 0
            })

            const latest = (Array.isArray(historyRes) ? historyRes : []).slice(0, 3).map((row) => ({
                id: row.id,
                title: `${String(row.meal_type || 'Meal').toUpperCase()} ${String(row.status || '').toUpperCase()}`,
                time: row.booking_date || 'N/A'
            }))
            setActivities(latest)
            setRewardSummary(rewardsRes || rewardSummary)
        } catch {
            setStats({ mealsBooked: 0, wastesPrevented: 0, sustainabilityScore: 0, donations: 0 })
            setActivities([])
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

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
                                    <p className="text-xs text-white/60">Your Meal Fee</p>
                                    <p className="text-xl font-semibold tracking-tight">
                                        INR {rewardSummary?.fee_preview?.effective_fee ?? 120}
                                        <span className="text-sm text-creative-lime ml-2">({rewardSummary?.fee_preview?.discount_percent || 0}% discount)</span>
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
                            <h2 className="text-lg md:text-xl font-semibold tracking-tight">Diet Preference</h2>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {preferenceOptions.map((pref) => (
                                    <button
                                        key={pref.id}
                                        type="button"
                                        onClick={() => setSelectedPreference(pref.id)}
                                        className={`text-left rounded-xl border px-4 py-4 min-h-[84px] transition-colors ${
                                            selectedPreference === pref.id
                                                ? 'border-creative-lime bg-creative-lime/10'
                                                : 'border-white/15 bg-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <p className="font-medium">{pref.label}</p>
                                        <p className="text-xs text-white/60 mt-1">{pref.desc}</p>
                                    </button>
                                ))}
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
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    )
}
