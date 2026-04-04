import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState({ totalBookings: 0, expectedAttendance: 0, lowStockItems: 0, todayWastage: 0 })
    const [barData, setBarData] = useState([])
    const [trendData, setTrendData] = useState([])
    const [alerts, setAlerts] = useState([])
    const [attendance, setAttendance] = useState({ date: getTodayDate(), totalPresent: 0, students: [], totalsByMeal: [] })
    const [wastage, setWastage] = useState({ total: 0, totalsByMeal: [], logs: [] })
    const [formData, setFormData] = useState({
        date: getTodayDate(),
        meal_type: 'lunch',
        food_item: '',
        quantity_wasted: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    useEffect(() => {
        fetchDashboardData()
    }, [])

    useEffect(() => {
        if (!loading) {
            fetchDashboardData({ silent: true })
        }
    }, [formData.date])

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

            setStats({
                totalBookings: dashRes?.stats?.total_bookings || 0,
                expectedAttendance: dashRes?.stats?.expected_attendance || 0,
                lowStockItems: dashRes?.stats?.low_stock_items || 0,
                todayWastage: dashRes?.stats?.today_wastage || 0
            })
            setAlerts(Array.isArray(dashRes?.alerts) ? dashRes.alerts : [])
            setBarData(Array.isArray(analyticsRes?.weekly_waste) ? analyticsRes.weekly_waste : [])
            setTrendData(Array.isArray(analyticsRes?.waste_trend) ? analyticsRes.waste_trend : [])
            setAttendance({
                date: dashRes?.attendance?.date || getTodayDate(),
                totalPresent: dashRes?.attendance?.total_present || 0,
                students: Array.isArray(dashRes?.attendance?.students) ? dashRes.attendance.students : [],
                totalsByMeal: Array.isArray(dashRes?.attendance?.totals_by_meal) ? dashRes.attendance.totals_by_meal : []
            })
            setWastage({
                total: Number(wastageRes?.total_wastage || 0),
                totalsByMeal: Array.isArray(wastageRes?.totals_by_meal) ? wastageRes.totals_by_meal : [],
                logs: Array.isArray(wastageRes?.logs) ? wastageRes.logs : []
            })
        } catch (error) {
            setStats({ totalBookings: 0, expectedAttendance: 0, lowStockItems: 0, todayWastage: 0 })
            setAlerts([])
            setBarData([])
            setTrendData([])
            setAttendance({ date: getTodayDate(), totalPresent: 0, students: [], totalsByMeal: [] })
            setWastage({ total: 0, totalsByMeal: [], logs: [] })
            showToast(error.message || 'Failed to load dashboard data', 'error')
        } finally {
            setLoading(false)
            setRefreshing(false)
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
            showToast('Wastage updated successfully', 'success')
            setFormData((prev) => ({ ...prev, food_item: '', quantity_wasted: '' }))
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

    const quickActions = [
        { icon: 'FB', label: 'FEEDBACK', path: '/admin/feedback' },
        { icon: 'LOG', label: 'WASTAGE LOG', path: '/mess-manager/wastage/log' },
        { icon: 'INV', label: 'INVENTORY', path: '/mess-manager/inventory' },
        { icon: 'QR', label: 'ATTENDANCE QR', path: '/generate-qr' },
        { icon: 'REP', label: 'REPORTS', path: '/mess-manager/reports' }
    ]

    const attendanceCards = MEAL_OPTIONS.map((meal) => {
        const current = attendance.totalsByMeal.find((item) => item.meal_type === meal)
        return {
            meal,
            total: current?.total_present || 0
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

    const isHostelAdmin = role === 'hostel_admin'

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
                        { label: 'PROVISIONS SECURED', value: stats.totalBookings, color: 'text-creative-lime' },
                        { label: 'EXPECTED UNITS', value: stats.expectedAttendance, color: 'text-white' },
                        { label: 'PRESENT TODAY', value: attendance.totalPresent, color: 'text-sky-300' },
                        { label: 'WASTE MEASURED', value: `${stats.todayWastage} KG`, color: 'text-creative-purple' }
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
                                    <span className="block text-2xl font-black tracking-tighter mt-4">{Math.max(0, 100 - Math.min(100, Math.round(stats.todayWastage)))}%</span>
                                    <p className="text-xs uppercase tracking-[0.25em] text-white/35 mt-2">Waste control score</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full border-l-4 border-l-sky-400/50">
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase">Today&apos;s Attendance</h2>
                                    <p className="text-sm text-white/50 mt-2">Students marked present for {attendance.date}</p>
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
                                        <p className="text-2xl font-black mt-2">{item.total}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                                {attendance.students.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No present students recorded yet.</div>
                                ) : attendance.students.map((student) => (
                                    <div key={`${student.student_id}-${student.meal_type}-${student.scanned_at}`} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center justify-between gap-4">
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

                            <div className="mt-8 max-h-72 overflow-y-auto space-y-3 pr-1">
                                {wastage.logs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No wastage records for the selected date.</div>
                                ) : wastage.logs.map((log) => (
                                    <div key={log.id} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{log.food_item}</p>
                                            <p className="text-xs text-white/45">{formatMealLabel(log.meal_type)} | {log.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-creative-purple">{Number(log.quantity || 0).toFixed(2)} KG</p>
                                        </div>
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
