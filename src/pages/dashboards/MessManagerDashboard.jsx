import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import WeeklyMenu from '../../components/common/WeeklyMenu'
import WastageBarChart from '../../components/analytics/WastageBarChart'
import WastageTrendChart from '../../components/analytics/WastageTrendChart'
import ProgressRing from '../../components/analytics/ProgressRing'
import Toast from '../../components/common/Toast'
import api from '../../lib/api'

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner']

function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

function formatMealLabel(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

export default function MessManagerDashboard() {
    const { role, signOut } = useAuth()
    const navigate = useNavigate()
    const isHostelAdmin = role === 'hostel_admin'

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState({
        totalBookings: 0,
        expectedAttendance: 0,
        lowStockItems: 0,
        todayWastage: 0,
        mealsAttended: 0,
        mealsSkipped: 0,
        totalPenalties: 0,
        totalRewards: 0,
        presentAbsentRatio: 0
    })
    const [attendance, setAttendance] = useState({
        date: getTodayDate(),
        totalPresent: 0,
        totalAbsent: 0,
        presentUsers: [],
        absentUsers: [],
        totalsByMeal: [],
        totals: { meals_booked: 0, meals_attended: 0, meals_skipped: 0 }
    })
    const [barData, setBarData] = useState([])
    const [trendData, setTrendData] = useState([])
    const [alerts, setAlerts] = useState([])
    const [wastage, setWastage] = useState({ total: 0, totalsByMeal: [], logs: [] })
    const [formData, setFormData] = useState({
        date: getTodayDate(),
        meal_type: 'lunch',
        food_item: '',
        quantity_wasted: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7))
    const [billingFilter, setBillingFilter] = useState({ payment_status: 'all', hostel_id: '', block: '' })
    const [billingOverview, setBillingOverview] = useState({
        total_students: 0,
        total_meals_booked: 0,
        total_attended: 0,
        total_skipped: 0,
        total_revenue_expected: 0,
        total_rewards_given: 0,
        total_penalties_collected: 0
    })
    const [billingRows, setBillingRows] = useState([])
    const [billingSort, setBillingSort] = useState({ key: 'final_amount', direction: 'desc' })
    const [hostels, setHostels] = useState([])
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    useEffect(() => {
        fetchDashboardData()
        fetchBillingData()
    }, [])

    useEffect(() => {
        if (!loading) {
            fetchDashboardData({ silent: true })
        }
    }, [formData.date])

    useEffect(() => {
        if (!loading) {
            fetchBillingData()
        }
    }, [billingMonth, billingFilter.payment_status, billingFilter.hostel_id, billingFilter.block])

    useEffect(() => {
        if (loading) return undefined

        const interval = setInterval(() => {
            fetchDashboardData({ silent: true })
            fetchBillingData()
        }, 15000)

        return () => clearInterval(interval)
    }, [loading, billingMonth, billingFilter.payment_status, billingFilter.hostel_id, billingFilter.block, formData.date])

    async function fetchDashboardData({ silent = false } = {}) {
        if (!silent) {
            setLoading(true)
        } else {
            setRefreshing(true)
        }

        try {
            const [dashRes, analyticsRes, wastageRes] = await Promise.all([
                api.get('/api/mess-manager/dashboard'),
                api.get('/api/chef/analytics'),
                api.get(`/api/wastage?date=${formData.date}`)
            ])

            if (isHostelAdmin) {
                const hostelsRes = await api.get('/api/admin/hostels')
                setHostels(Array.isArray(hostelsRes) ? hostelsRes : [])
            }

            setStats({
                totalBookings: dashRes?.stats?.total_bookings || 0,
                expectedAttendance: dashRes?.stats?.expected_attendance || 0,
                lowStockItems: dashRes?.stats?.low_stock_items || 0,
                todayWastage: dashRes?.stats?.today_wastage || 0,
                mealsAttended: dashRes?.stats?.meals_attended || 0,
                mealsSkipped: dashRes?.stats?.meals_skipped || 0,
                totalPenalties: dashRes?.stats?.total_penalties || 0,
                totalRewards: dashRes?.stats?.total_rewards || 0,
                presentAbsentRatio: dashRes?.stats?.present_absent_ratio || 0
            })

            setAttendance({
                date: dashRes?.attendance?.date || getTodayDate(),
                totalPresent: dashRes?.attendance?.total_present || 0,
                totalAbsent: dashRes?.attendance?.total_absent || 0,
                presentUsers: Array.isArray(dashRes?.attendance?.present_users) ? dashRes.attendance.present_users : [],
                absentUsers: Array.isArray(dashRes?.attendance?.absent_users) ? dashRes.attendance.absent_users : [],
                totalsByMeal: Array.isArray(dashRes?.attendance?.totals_by_meal) ? dashRes.attendance.totals_by_meal : [],
                totals: dashRes?.attendance?.totals || { meals_booked: 0, meals_attended: 0, meals_skipped: 0 }
            })

            setBarData(Array.isArray(analyticsRes?.weekly_waste) ? analyticsRes.weekly_waste : [])
            setTrendData(Array.isArray(analyticsRes?.waste_trend) ? analyticsRes.waste_trend : [])
            setAlerts(Array.isArray(dashRes?.alerts) ? dashRes.alerts : [])
            setWastage({
                total: Number(wastageRes?.total_wastage || 0),
                totalsByMeal: Array.isArray(wastageRes?.totals_by_meal) ? wastageRes.totals_by_meal : [],
                logs: Array.isArray(wastageRes?.logs) ? wastageRes.logs : []
            })
        } catch (error) {
            showToast(error.message || 'Failed to load dashboard data', 'error')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    async function fetchBillingData() {
        try {
            const params = new URLSearchParams({ month: billingMonth })
            if (billingFilter.payment_status !== 'all') params.set('payment_status', billingFilter.payment_status)
            if (billingFilter.hostel_id) params.set('hostel_id', billingFilter.hostel_id)
            if (billingFilter.block) params.set('block', billingFilter.block)
            const billingRes = await api.get(`/api/billing/all-users?${params.toString()}`)
            setBillingOverview(billingRes?.overview || billingOverview)
            setBillingRows(Array.isArray(billingRes?.billing_rows) ? billingRes.billing_rows : [])
        } catch (error) {
            setBillingRows([])
            showToast(error.message || 'Failed to load billing data', 'error')
        }
    }

    function showToast(message, type = 'info') {
        setToastMessage(message)
        setToastType(type)
    }

    async function handleWastageSubmit(event) {
        event.preventDefault()
        const quantity = Number(formData.quantity_wasted)

        if (!formData.food_item.trim()) {
            showToast('Food item is required', 'warning')
            return
        }

        if (!Number.isFinite(quantity) || quantity < 0) {
            showToast('Quantity wasted must be zero or greater', 'warning')
            return
        }

        setSubmitting(true)
        try {
            await api.post('/api/wastage', {
                date: formData.date,
                meal_type: formData.meal_type,
                food_item: formData.food_item.trim(),
                quantity_wasted: quantity
            })
            setFormData((prev) => ({ ...prev, food_item: '', quantity_wasted: '' }))
            showToast('Wastage updated successfully', 'success')
            await fetchDashboardData({ silent: true })
        } catch (error) {
            showToast(error.message || 'Failed to update wastage', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to terminate the current session?')) {
            await signOut()
            navigate('/login', { replace: true })
        }
    }

    const attendanceCards = MEAL_OPTIONS.map((meal) => {
        const current = attendance.totalsByMeal.find((item) => item.meal_type === meal)
        return {
            meal,
            totalPresent: current?.total_present || 0,
            totalAbsent: current?.total_absent || 0
        }
    })

    const wastageCards = MEAL_OPTIONS.map((meal) => {
        const current = wastage.totalsByMeal.find((item) => item.meal_type === meal)
        return {
            meal,
            total: current?.total_wastage || 0
        }
    })

    const attendancePercentage = stats.expectedAttendance > 0
        ? Math.min(100, Math.round((attendance.totalPresent / stats.expectedAttendance) * 100))
        : 0

    const sortedBillingRows = useMemo(() => {
        const rows = [...billingRows]
        const direction = billingSort.direction === 'asc' ? 1 : -1
        rows.sort((left, right) => {
            const leftValue = left?.[billingSort.key]
            const rightValue = right?.[billingSort.key]

            if (typeof leftValue === 'number' || typeof rightValue === 'number') {
                return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction
            }

            return String(leftValue || '').localeCompare(String(rightValue || '')) * direction
        })
        return rows
    }, [billingRows, billingSort])

    function toggleBillingSort(key) {
        setBillingSort((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const quickActions = [
        { icon: 'FB', label: 'FEEDBACK', path: '/admin/feedback' },
        { icon: 'LOG', label: 'WASTAGE LOG', path: '/mess-manager/wastage/log' },
        { icon: 'INV', label: 'INVENTORY', path: '/mess-manager/inventory' },
        { icon: 'QR', label: 'ATTENDANCE QR', path: '/generate-qr' },
        { icon: 'REP', label: 'REPORTS', path: '/mess-manager/reports' }
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black overflow-x-hidden">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative">
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/45">{isHostelAdmin ? 'Hostel Admin Dashboard' : 'Mess Manager Dashboard'}</p>
                        <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] italic">OPERATIONAL<br /><span className="text-creative-purple">VISIBILITY.</span></h1>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => fetchDashboardData({ silent: true })} isLoading={refreshing}>REFRESH</Button>
                        {isHostelAdmin ? <Button variant="outline" size="sm" to="/admin/metrics">ATTENDANCE ANALYTICS</Button> : null}
                        <Button variant="outline" size="sm" onClick={() => navigate('/', { replace: true })}>HOME</Button>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-500/30 text-red-500/60">LOGOUT</Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {[
                        { label: 'MEALS BOOKED', value: stats.totalBookings, color: 'text-white' },
                        { label: 'MEALS ATTENDED', value: stats.mealsAttended, color: 'text-creative-lime' },
                        { label: 'MEALS SKIPPED', value: stats.mealsSkipped, color: 'text-red-400' },
                        { label: 'ACTIVE PENALTIES', value: stats.totalPenalties, color: 'text-yellow-300' }
                    ].map((stat) => (
                        <Card key={stat.label} variant="glass">
                            <h3 className={`text-5xl font-black tracking-tighter mb-1 ${stat.color}`}>{loading ? '--' : stat.value}</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                        </Card>
                    ))}

                    <div className="lg:col-span-1 grid grid-cols-2 gap-4">
                        {quickActions.map((action) => (
                            <Link key={action.label} to={action.path}>
                                <Card variant="glass" className="h-full p-6 flex flex-col items-center justify-center text-center gap-3">
                                    <span className="text-lg font-black text-creative-lime">{action.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{action.label}</span>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="lg:col-span-3">
                        <Card variant="glass" className="p-10">
                            <div className="flex items-center justify-between gap-4 mb-10">
                                <h2 className="text-3xl font-black tracking-tighter italic uppercase">Flux Analysis</h2>
                                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Realtime wastage trend</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <WastageBarChart data={barData} />
                                <WastageTrendChart data={trendData} />
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <WeeklyMenu compact />
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="premium" className="h-full flex flex-col justify-between">
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase mb-8">Efficiency Metrics</h2>
                            <div className="flex flex-col md:flex-row justify-around items-center gap-12 py-6">
                                <div className="flex flex-col items-center">
                                    <ProgressRing progress={attendancePercentage} size={160} color="#a3e635" />
                                    <span className="block text-3xl font-black tracking-tighter mt-4">{attendancePercentage}%</span>
                                    <p className="text-xs uppercase tracking-[0.25em] text-white/35 mt-2">Attendance capture</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <ProgressRing progress={Math.max(0, 100 - Math.min(100, Math.round(stats.todayWastage)))} size={130} color="#8b5cf6" />
                                    <span className="block text-2xl font-black tracking-tighter mt-4">{stats.presentAbsentRatio}</span>
                                    <p className="text-xs uppercase tracking-[0.25em] text-white/35 mt-2">Present / absent ratio</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full border-l-4 border-l-sky-400/50">
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase">Today&apos;s Attendance</h2>
                                    <p className="text-sm text-white/50 mt-2">Present students for {attendance.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Total present</p>
                                    <p className="text-4xl font-black text-sky-300">{attendance.totalPresent}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {attendanceCards.map((item) => (
                                    <div key={item.meal} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{item.meal}</p>
                                        <p className="text-2xl font-black mt-2">{item.totalPresent}</p>
                                        <p className="text-xs text-white/45 mt-1">Absent {item.totalAbsent}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Booked</p>
                                    <p className="text-2xl font-black mt-2">{attendance.totals.meals_booked}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Attended</p>
                                    <p className="text-2xl font-black mt-2 text-creative-lime">{attendance.totals.meals_attended}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Skipped</p>
                                    <p className="text-2xl font-black mt-2 text-red-400">{attendance.totals.meals_skipped}</p>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                                {attendance.presentUsers.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No present students recorded yet.</div>
                                ) : attendance.presentUsers.map((student) => (
                                    <div key={`${student.student_id}-${student.meal_type}-${student.scanned_at || student.id}`} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{student.name}</p>
                                            <p className="text-xs text-white/45">{student.student_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">{student.meal_type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full border-l-4 border-l-red-500/50">
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase">Absent Students</h2>
                                    <p className="text-sm text-white/50 mt-2">Booked students remain absent here until scanned or auto-marked absent.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Total absent</p>
                                    <p className="text-4xl font-black text-red-400">{attendance.totalAbsent}</p>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                                {attendance.absentUsers.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No absent students for the selected date.</div>
                                ) : attendance.absentUsers.map((student) => (
                                    <div key={`${student.student_id}-${student.meal_type}-${student.id}`} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{student.name}</p>
                                            <p className="text-xs text-white/45">{student.student_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs uppercase tracking-[0.25em] text-red-300">{student.meal_type}</p>
                                            <p className="text-xs text-white/45 mt-1">{student.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full">
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase">Update Wastage</h2>
                                    <p className="text-sm text-white/50 mt-2">Write through to the backend and refresh manager/admin views.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Selected day total</p>
                                    <p className="text-3xl font-black text-creative-purple">{wastage.total.toFixed(2)} KG</p>
                                </div>
                            </div>

                            <form onSubmit={handleWastageSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Date</span>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Meal type</span>
                                    <select
                                        value={formData.meal_type}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, meal_type: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                    >
                                        {MEAL_OPTIONS.map((meal) => <option key={meal} value={meal}>{formatMealLabel(meal)}</option>)}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Food item</span>
                                    <input
                                        type="text"
                                        value={formData.food_item}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, food_item: event.target.value }))}
                                        placeholder="Rice, dal, chapati..."
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Quantity wasted (kg)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.quantity_wasted}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, quantity_wasted: event.target.value }))}
                                        placeholder="0.00"
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                        required
                                    />
                                </label>
                                <div className="md:col-span-2 flex items-center justify-between gap-4 flex-wrap pt-2">
                                    <div className="text-sm text-white/45">Negative values are blocked. Existing items update in place.</div>
                                    <Button type="submit" isLoading={submitting} disabled={submitting}>UPDATE WASTAGE</Button>
                                </div>
                            </form>

                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {wastageCards.map((item) => (
                                    <div key={item.meal} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{item.meal}</p>
                                        <p className="text-2xl font-black mt-2">{Number(item.total).toFixed(2)} KG</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full border-l-4 border-l-red-500/50">
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase mb-8">Priority Alerts</h2>
                            <div className="space-y-4">
                                {alerts.length === 0 ? <div className="text-sm text-white/40">No active alerts.</div> : alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-black/40 border border-white/10">
                                            {alert.type === 'danger' ? '!' : alert.type === 'warning' ? '!!' : 'i'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm tracking-tight text-white">{alert.message}</p>
                                            <p className="text-[10px] font-black text-white/20 mt-1 uppercase tracking-widest">{alert.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-4">
                        <Card variant="premium" className="p-8">
                            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter italic uppercase">Billing Overview</h2>
                                    <p className="text-sm text-white/50 mt-2">All students, real calculations, sortable columns.</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <input
                                        type="month"
                                        value={billingMonth}
                                        onChange={(event) => setBillingMonth(event.target.value)}
                                        className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                                    />
                                    <select
                                        value={billingFilter.payment_status}
                                        onChange={(event) => setBillingFilter((prev) => ({ ...prev, payment_status: event.target.value }))}
                                        className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                    {isHostelAdmin ? (
                                        <select
                                            value={billingFilter.hostel_id}
                                            onChange={(event) => setBillingFilter((prev) => ({ ...prev, hostel_id: event.target.value }))}
                                            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                                        >
                                            <option value="">All Hostels</option>
                                            {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}
                                        </select>
                                    ) : null}
                                    <input
                                        type="text"
                                        value={billingFilter.block}
                                        onChange={(event) => setBillingFilter((prev) => ({ ...prev, block: event.target.value }))}
                                        placeholder="Block"
                                        className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                                {[
                                    { label: 'Students', value: billingOverview.total_students },
                                    { label: 'Meals Booked', value: billingOverview.total_meals_booked },
                                    { label: 'Attended', value: billingOverview.total_attended, tone: 'text-creative-lime' },
                                    { label: 'Skipped', value: billingOverview.total_skipped, tone: 'text-red-400' },
                                    { label: 'Rewards', value: `INR ${billingOverview.total_rewards_given}`, tone: 'text-creative-lime' },
                                    { label: 'Penalties', value: `INR ${billingOverview.total_penalties_collected}`, tone: 'text-red-400' }
                                ].map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{item.label}</p>
                                        <p className={`text-2xl font-black mt-2 ${item.tone || ''}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1320px] text-left">
                                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                                        <tr>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('student_name')}>Student Name</th>
                                            <th className="px-4 py-4">Hostel / Block</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('total_booked_meals')}>Booked Meals</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('attended_meals')}>Attended Meals</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('skipped_meals')}>Skipped Meals</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('rewards')}>Rewards</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('penalties')}>Penalties</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('final_amount')}>Final Amount</th>
                                            <th className="px-4 py-4 cursor-pointer" onClick={() => toggleBillingSort('payment_status')}>Payment Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedBillingRows.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="px-4 py-8 text-sm text-white/45">No billing rows for the selected filters.</td>
                                            </tr>
                                        ) : sortedBillingRows.map((row) => (
                                            <tr key={row.user_id} className="hover:bg-white/5">
                                                <td className="px-4 py-4">
                                                    <p className="font-semibold text-white">{row.student_name}</p>
                                                    <p className="text-xs text-white/45">{row.email}</p>
                                                </td>
                                                <td className="px-4 py-4 text-white/70">{row.hostel_name} / {row.block}</td>
                                                <td className="px-4 py-4 text-white/80">{row.total_booked_meals}</td>
                                                <td className="px-4 py-4 text-creative-lime">{row.attended_meals}</td>
                                                <td className="px-4 py-4 text-red-300">{row.skipped_meals}</td>
                                                <td className="px-4 py-4 text-creative-lime">INR {row.rewards}</td>
                                                <td className="px-4 py-4 text-red-300">INR {row.penalties}</td>
                                                <td className="px-4 py-4 font-semibold text-white">INR {row.final_amount}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${
                                                        row.payment_status === 'paid'
                                                            ? 'border-creative-lime/30 bg-creative-lime/10 text-creative-lime'
                                                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                                                    }`}>
                                                        {row.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage('')}
            />
        </div>
    )
}
