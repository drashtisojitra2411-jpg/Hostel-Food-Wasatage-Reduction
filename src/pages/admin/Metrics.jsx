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
    const [attendanceData, setAttendanceData] = useState(null)
    const [attendanceDate, setAttendanceDate] = useState(getTodayDate())
    const [loading, setLoading] = useState(true)
    const [attendanceLoading, setAttendanceLoading] = useState(true)
    const [error, setError] = useState('')
    const [attendanceError, setAttendanceError] = useState('')

    useEffect(() => {
        fetchMetrics()
    }, [])

    useEffect(() => {
        fetchAttendance(attendanceDate)
    }, [attendanceDate])

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
            const res = await api.get(`/api/attendance?date=${date}`)
            setAttendanceData(res)
        } catch (fetchError) {
            setAttendanceError(fetchError.message || 'Failed to fetch attendance analytics')
            setAttendanceData(null)
        } finally {
            setAttendanceLoading(false)
        }
    }

    const metrics = data?.metrics || {}
    const monthlyWasteReduction = data?.monthly_waste_reduction || []
    const servedVsWasted = data?.served_vs_wasted || []
    const wasteByHostel = data?.waste_by_hostel || []
    const ngoPickupFrequency = data?.ngo_pickup_frequency || []
    const attendanceOverview = useMemo(() => {
        const raw = Array.isArray(attendanceData?.analytics) ? attendanceData.analytics : Array.isArray(data?.attendance_overview) ? data.attendance_overview : []
        return MEAL_OPTIONS.map((meal) => {
            const current = raw.find((row) => row.meal_type === meal)
            return {
                meal_type: formatMealLabel(meal),
                total_present: current?.total_present || 0
            }
        })
    }, [attendanceData, data])

    const attendanceStudents = Array.isArray(attendanceData?.students) ? attendanceData.students : []

    return (
        <AdminLayout title="System Metrics" subtitle="Attendance + Waste Analytics">
            {error ? <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div> : null}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Waste Today (kg)" value={loading ? '--' : `${metrics.food_wasted_today || 0}`} accent="text-creative-lime" />
                <MetricCard label="Meals Served Today" value={loading ? '--' : `${metrics.meals_served_today || 0}`} accent="text-blue-400" />
                <MetricCard label="Food Donated Today (kg)" value={loading ? '--' : `${metrics.food_donated_today || 0}`} />
                <MetricCard label="Total Present" value={attendanceLoading ? '--' : `${attendanceData?.total_present || 0}`} helper={`Date: ${attendanceDate}`} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Attendance Analytics</h2>
                        <p className="text-sm text-white/45 mt-2">Meal-wise present count and visible student list for the selected date.</p>
                    </div>
                    <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Date filter</span>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(event) => setAttendanceDate(event.target.value)}
                            className="mt-2 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-creative-lime/40"
                        />
                    </label>
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
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">Present Students</h3>
                        <div className="h-72 overflow-y-auto space-y-3 pr-1">
                            {attendanceLoading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading attendance...</div>
                            ) : attendanceStudents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No present students found for this date.</div>
                            ) : attendanceStudents.map((student) => (
                                <div key={`${student.student_id}-${student.meal_type}-${student.id}`} className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-white">{student.name}</p>
                                        <p className="text-xs text-white/45">{student.student_id}</p>
                                    </div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-creative-lime">{student.meal_type}</p>
                                </div>
                            ))}
                        </div>
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
