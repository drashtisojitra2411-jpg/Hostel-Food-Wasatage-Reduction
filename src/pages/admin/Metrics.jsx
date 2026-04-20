import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import AdminLayout from '../../components/admin/AdminLayout'
import MetricCard from '../../components/admin/MetricCard'
import ChartPanel from '../../components/admin/ChartPanel'
import api from '../../lib/api'

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444']
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner']

function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

function formatMealLabel(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

export default function Metrics() {
    const [data, setData] = useState(null)
    const [governanceData, setGovernanceData] = useState(null)
    const [billingData, setBillingData] = useState(null)
    const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7))
    const [billingLoading, setBillingLoading] = useState(true)
    const [billingError, setBillingError] = useState('')
    const [settingsForm, setSettingsForm] = useState({
        meal_price: 100,
        reward_discount_per_meal: 10,
        penalty_amount: 50,
        penalty_skip_threshold: 4
    })
    const [savingSettings, setSavingSettings] = useState(false)
    const [attendanceDate, setAttendanceDate] = useState(getTodayDate())
    const [mealType, setMealType] = useState('all')
    const [loading, setLoading] = useState(true)
    const [attendanceLoading, setAttendanceLoading] = useState(true)
    const [error, setError] = useState('')
    const [attendanceError, setAttendanceError] = useState('')

    useEffect(() => {
        fetchMetrics()
    }, [])

    useEffect(() => {
        fetchAttendance(attendanceDate)
    }, [attendanceDate, mealType])

    useEffect(() => {
        fetchBillingAnalytics(billingMonth)
    }, [billingMonth])

    async function fetchMetrics() {
        setLoading(true)
        setError('')
        try {
            const res = await api.get('/api/analytics/overview')
            setData(res)
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data')
            setData(null)
        } finally {
            setLoading(false)
        }
    }

    async function fetchAttendance(date) {
        setAttendanceLoading(true)
        setAttendanceError('')
        try {
            const params = new URLSearchParams({ date })
            if (mealType !== 'all') params.set('meal_type', mealType)
            const res = await api.get(`/api/admin/meal-governance?${params.toString()}`)
            setGovernanceData(res)
        } catch (fetchError) {
            setAttendanceError(fetchError.message || 'Failed to fetch attendance analytics')
            setGovernanceData(null)
        } finally {
            setAttendanceLoading(false)
        }
    }

    async function fetchBillingAnalytics(month) {
        setBillingLoading(true)
        setBillingError('')
        try {
            const res = await api.get(`/api/admin/billing/analytics?month=${month}`)
            setBillingData(res)
            if (res?.settings) {
                setSettingsForm({
                    meal_price: res.settings.meal_price ?? 100,
                    reward_discount_per_meal: res.settings.reward_discount_per_meal ?? 10,
                    penalty_amount: res.settings.penalty_amount ?? 50,
                    penalty_skip_threshold: res.settings.penalty_skip_threshold ?? 4
                })
            }
        } catch (fetchError) {
            setBillingError(fetchError.message || 'Failed to fetch billing analytics')
            setBillingData(null)
        } finally {
            setBillingLoading(false)
        }
    }

    const metrics = data?.metrics || {}
    const monthlyWasteReduction = data?.monthly_waste_reduction || []
    const servedVsWasted = data?.served_vs_wasted || []
    const wasteByHostel = data?.waste_by_hostel || []
    const ngoPickupFrequency = data?.ngo_pickup_frequency || []
    const attendanceOverview = useMemo(() => {
        const raw = Array.isArray(data?.attendance_overview) ? data.attendance_overview : []
        return MEAL_OPTIONS.map((meal) => {
            const current = raw.find((row) => row.meal_type === meal)
            return {
                meal_type: formatMealLabel(meal),
                total_present: current?.total_present || 0
            }
        })
    }, [data])

    const governanceOverview = governanceData?.overview || {}
    const frequentAbsentees = Array.isArray(governanceData?.insights?.frequent_absentees) ? governanceData.insights.frequent_absentees : []
    const flaggedUsers = Array.isArray(governanceData?.insights?.flagged_users) ? governanceData.insights.flagged_users : []
    const userHistory = Array.isArray(governanceData?.user_history) ? governanceData.user_history : []
    const billingOverview = billingData?.overview || {}
    const topDefaulters = Array.isArray(billingData?.top_defaulters) ? billingData.top_defaulters : []
    const highPenaltyUsers = Array.isArray(billingData?.high_penalty_users) ? billingData.high_penalty_users : []
    const billingHistory = Array.isArray(billingData?.billing_history) ? billingData.billing_history : []

    async function handleExport() {
        try {
            const params = new URLSearchParams({ date: attendanceDate })
            if (mealType !== 'all') params.set('meal_type', mealType)
            const token = api.getToken()
            const response = await fetch(`${api.baseURL}/admin/meal-governance/export?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!response.ok) throw new Error('Failed to export report')
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `meal-governance-${attendanceDate}.csv`
            link.click()
            window.URL.revokeObjectURL(url)
        } catch (exportError) {
            setAttendanceError(exportError.message || 'Failed to export report')
        }
    }

    async function handleBillingExport() {
        try {
            const token = api.getToken()
            const response = await fetch(`${api.baseURL}/admin/billing/export?month=${billingMonth}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!response.ok) throw new Error('Failed to export billing report')
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `billing-${billingMonth}.csv`
            link.click()
            window.URL.revokeObjectURL(url)
        } catch (exportError) {
            setBillingError(exportError.message || 'Failed to export billing report')
        }
    }

    async function handleSaveSettings() {
        setSavingSettings(true)
        try {
            const res = await api.put('/api/admin/billing/settings', settingsForm)
            if (res?.settings) {
                setSettingsForm({
                    meal_price: res.settings.meal_price,
                    reward_discount_per_meal: res.settings.reward_discount_per_meal,
                    penalty_amount: res.settings.penalty_amount,
                    penalty_skip_threshold: res.settings.penalty_skip_threshold
                })
            }
            await fetchBillingAnalytics(billingMonth)
        } catch (saveError) {
            setBillingError(saveError.message || 'Failed to save billing settings')
        } finally {
            setSavingSettings(false)
        }
    }

    return (
        <AdminLayout title="System Metrics" subtitle="Attendance + Waste Analytics">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total Users" value={attendanceLoading ? '--' : `${governanceOverview.total_users || 0}`} accent="text-creative-lime" />
                <MetricCard label="Meals Booked" value={attendanceLoading ? '--' : `${governanceOverview.total_meals_booked || 0}`} accent="text-blue-400" />
                <MetricCard label="Attendance Rate" value={attendanceLoading ? '--' : `${governanceOverview.attendance_rate || 0}%`} />
                <MetricCard label="Penalties Applied" value={attendanceLoading ? '--' : `${governanceOverview.total_penalties_applied || 0}`} helper={`Rewards: ${governanceOverview.total_rewards_given || 0}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Monthly Revenue" value={billingLoading ? '--' : `₹${billingOverview.total_monthly_revenue || 0}`} accent="text-creative-lime" />
                <MetricCard label="Pending Payments" value={billingLoading ? '--' : `₹${billingOverview.pending_payments || 0}`} accent="text-red-400" />
                <MetricCard label="Collection Rate" value={billingLoading ? '--' : `${billingOverview.collection_rate || 0}%`} />
                <MetricCard label="Billing Students" value={billingLoading ? '--' : `${billingOverview.total_students || 0}`} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Meal Governance</h2>
                        <p className="text-sm text-white/45 mt-2">Absentee insight, penalties, rewards, and student-level booking history.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Date filter</span>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(event) => setAttendanceDate(event.target.value)}
                                className="mt-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-creative-lime/40"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Meal type</span>
                            <select
                                value={mealType}
                                onChange={(event) => setMealType(event.target.value)}
                                className="mt-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-creative-lime/40"
                            >
                                <option value="all">All Meals</option>
                                {MEAL_OPTIONS.map((meal) => (
                                    <option key={meal} value={meal}>{formatMealLabel(meal)}</option>
                                ))}
                            </select>
                        </label>
                        <button onClick={handleExport} className="self-end rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-semibold hover:border-creative-lime/40">
                            Export CSV
                        </button>
                    </div>
                </div>
                {attendanceError ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{attendanceError}</div> : null}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ChartPanel title="Total Present Per Meal">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceOverview}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="meal_type" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip />
                                <Bar dataKey="total_present" fill="#22c55e" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Most Frequent Absentees</h3>
                        <div className="h-72 overflow-y-auto space-y-3 pr-1">
                            {attendanceLoading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading attendance...</div>
                            ) : frequentAbsentees.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No absentee trend found for this filter.</div>
                            ) : frequentAbsentees.map((student) => (
                                <div key={student.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-white">{student.name}</p>
                                        <p className="text-xs text-white/45">{student.email}</p>
                                    </div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-red-300">{student.skipped_count} skipped</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Billing Analytics</h2>
                        <p className="text-sm text-white/45 mt-2">Monthly revenue, pending payments, defaulters, and penalty-heavy users.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="month"
                            value={billingMonth}
                            onChange={(event) => setBillingMonth(event.target.value)}
                            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-creative-lime/40"
                        />
                        <button onClick={handleBillingExport} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-semibold hover:border-creative-lime/40">
                            Export CSV
                        </button>
                    </div>
                </div>
                {billingError ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{billingError}</div> : null}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Top Defaulters</h3>
                        <div className="h-72 overflow-y-auto space-y-3 pr-1">
                            {billingLoading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading billing...</div>
                            ) : topDefaulters.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No unpaid users for this month.</div>
                            ) : topDefaulters.map((user) => (
                                <div key={user.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-white/45">{user.hostel_name}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-red-300">₹{user.final_amount}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">High Penalty Users</h3>
                        <div className="h-72 overflow-y-auto space-y-3 pr-1">
                            {billingLoading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading penalty data...</div>
                            ) : highPenaltyUsers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No penalty-heavy users for this month.</div>
                            ) : highPenaltyUsers.map((user) => (
                                <div key={user.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-white/45">{user.hostel_name}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-red-300">{user.penalty_count} penalties</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Billing Rules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Meal price</span>
                                <input type="number" value={settingsForm.meal_price} onChange={(e) => setSettingsForm((prev) => ({ ...prev, meal_price: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm" />
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Reward per attended meal</span>
                                <input type="number" value={settingsForm.reward_discount_per_meal} onChange={(e) => setSettingsForm((prev) => ({ ...prev, reward_discount_per_meal: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm" />
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Penalty amount</span>
                                <input type="number" value={settingsForm.penalty_amount} onChange={(e) => setSettingsForm((prev) => ({ ...prev, penalty_amount: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm" />
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Skip threshold</span>
                                <input type="number" min="1" value={settingsForm.penalty_skip_threshold} onChange={(e) => setSettingsForm((prev) => ({ ...prev, penalty_skip_threshold: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm" />
                            </label>
                        </div>
                        <button onClick={handleSaveSettings} disabled={savingSettings} className="mt-4 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-semibold hover:border-creative-lime/40">
                            {savingSettings ? 'Saving...' : 'Save Billing Rules'}
                        </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Student Billing History</h3>
                        <div className="h-80 overflow-y-auto space-y-3 pr-1">
                            {billingLoading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading history...</div>
                            ) : billingHistory.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No billing history found.</div>
                            ) : billingHistory.map((row) => (
                                <div key={row.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{row.name}</p>
                                            <p className="text-xs text-white/45">{row.hostel_name}</p>
                                        </div>
                                        <p className={`text-xs uppercase tracking-[0.25em] ${row.payment_status === 'paid' ? 'text-creative-lime' : 'text-red-300'}`}>
                                            {row.payment_status}
                                        </p>
                                    </div>
                                    <p className="text-xs text-white/50 mt-2">₹{row.final_amount} | Rewards: ₹{row.rewards} | Penalties: ₹{row.penalties}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Users With Penalties Or Rewards</h3>
                    <div className="h-72 overflow-y-auto space-y-3 pr-1">
                        {attendanceLoading ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading users...</div>
                        ) : flaggedUsers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No flagged users found.</div>
                        ) : flaggedUsers.map((user) => (
                            <div key={user.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-white">{user.name}</p>
                                        <p className="text-xs text-white/45">{user.email}</p>
                                    </div>
                                    <p className={`text-xs uppercase tracking-[0.25em] ${
                                        user.penalty_status === 'penalty' ? 'text-red-300' : user.total_rewards > 0 ? 'text-creative-lime' : 'text-yellow-300'
                                    }`}>
                                        {user.penalty_status}
                                    </p>
                                </div>
                                <p className="text-xs text-white/50 mt-2">Skips: {user.skipped_meals_count} | Penalties: {user.total_penalties} | Rewards: {user.total_rewards}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Individual User History</h3>
                    <div className="h-72 overflow-y-auto space-y-3 pr-1">
                        {attendanceLoading ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading history...</div>
                        ) : userHistory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No meal history found.</div>
                        ) : userHistory.map((row) => (
                            <div key={row.id} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-white">{row.name}</p>
                                        <p className="text-xs text-white/45">{row.booking_date} | {row.meal_type}</p>
                                    </div>
                                    <p className={`text-xs uppercase tracking-[0.25em] ${
                                        row.status === 'attended' ? 'text-creative-lime' : row.status === 'skipped' ? 'text-red-300' : 'text-white/60'
                                    }`}>
                                        {row.status}
                                    </p>
                                </div>
                                <p className="text-xs text-white/50 mt-2">₹{row.original_price} to ₹{row.discounted_price} | Reward: {row.reward_applied ? 'Yes' : 'No'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartPanel title="Waste Reduction Over Time">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyWasteReduction}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="month" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Line type="monotone" dataKey="reduction" stroke="#22c55e" strokeWidth={3} /></LineChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Meals Served vs Meals Wasted">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={servedVsWasted}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="month" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Bar dataKey="served" fill="#22c55e" /><Bar dataKey="wasted" fill="#3b82f6" /></BarChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Waste by Hostel">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={wasteByHostel}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="hostel" stroke="#9ca3af" /><YAxis stroke="#9ca3af" /><Tooltip /><Bar dataKey="waste" fill="#ef4444" /></BarChart></ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="NGO Pickup Frequency">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ngoPickupFrequency} dataKey="pickups" nameKey="ngo" outerRadius={90}>{ngoPickupFrequency.map((entry, index) => <Cell key={`${entry.ngo}-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                </ChartPanel>
            </div>
        </AdminLayout>
    )
}
