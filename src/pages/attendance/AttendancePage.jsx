import { useEffect, useMemo, useState } from 'react'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const MEAL_OPTIONS = ['all', 'breakfast', 'lunch', 'dinner']

function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

function formatMeal(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

function formatStatus(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

export default function AttendancePage() {
    const { role } = useAuth()
    const [filters, setFilters] = useState({
        date: getTodayDate(),
        mealType: 'all'
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [attendance, setAttendance] = useState({
        totalPresent: 0,
        records: []
    })

    useEffect(() => {
        fetchAttendance()
    }, [filters.date, filters.mealType])

    async function fetchAttendance() {
        setLoading(true)
        setError('')

        try {
            const params = new URLSearchParams()
            if (filters.date) params.set('date', filters.date)
            if (filters.mealType !== 'all') params.set('meal_type', filters.mealType)

            const response = await api.get(`/api/attendance?${params.toString()}`)
            const records = Array.isArray(response?.records)
                ? response.records
                : Array.isArray(response?.students)
                    ? response.students
                    : []

            setAttendance({
                totalPresent: Number(response?.total_present || records.length || 0),
                records
            })
        } catch (fetchError) {
            setAttendance({ totalPresent: 0, records: [] })
            setError(fetchError.message || 'Failed to load attendance')
        } finally {
            setLoading(false)
        }
    }

    const pageTitle = useMemo(() => {
        if (role === 'mess_manager') return 'Student Attendance'
        if (role === 'hostel_admin') return 'Hostel Attendance'
        return 'Attendance'
    }, [role])

    const subtitle = useMemo(() => {
        if (role === 'mess_manager') return 'Live present-student visibility for mess operations.'
        if (role === 'hostel_admin') return 'Attendance overview across the selected date and meal window.'
        return 'Role-based attendance monitoring.'
    }, [role])

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Attendance Module</p>
                            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter italic leading-[0.9]">
                                {pageTitle}
                            </h1>
                            <p className="text-white/45 mt-3 max-w-2xl">{subtitle}</p>
                        </div>
                        <Button variant="outline" onClick={fetchAttendance} isLoading={loading}>Refresh</Button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <Card variant="glass" className="lg:col-span-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Total Present</p>
                            <p className="text-5xl font-black text-creative-lime mt-4">{loading ? '--' : attendance.totalPresent}</p>
                            <p className="text-sm text-white/45 mt-3">Students marked present for the selected filter set.</p>
                        </Card>

                        <Card variant="glass" className="lg:col-span-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Date</span>
                                    <input
                                        type="date"
                                        value={filters.date}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Meal Type</span>
                                    <select
                                        value={filters.mealType}
                                        onChange={(event) => setFilters((prev) => ({ ...prev, mealType: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                    >
                                        {MEAL_OPTIONS.map((meal) => (
                                            <option key={meal} value={meal}>
                                                {meal === 'all' ? 'All Meals' : formatMeal(meal)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="text-sm text-white/45">
                                    The table shows current attendance rows returned by `/api/attendance`.
                                </div>
                            </div>
                        </Card>
                    </div>

                    {error ? (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    ) : null}

                    <Card variant="premium" className="p-0 border-white/5 overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Present Students</h2>
                                <p className="text-sm text-white/45 mt-1">Clean attendance table with date and meal filters.</p>
                            </div>
                            {loading ? (
                                <div className="flex items-center gap-3 text-sm text-white/50">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-creative-lime rounded-full animate-spin" />
                                    Loading attendance...
                                </div>
                            ) : null}
                        </div>

                        {loading ? (
                            <div className="px-6 py-12 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-white/15 border-t-creative-lime rounded-full animate-spin" />
                            </div>
                        ) : attendance.records.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <p className="text-lg font-black uppercase tracking-[0.2em] text-white/30">No attendance found</p>
                                <p className="text-sm text-white/45 mt-3">Try changing the selected date or meal type.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px] text-left">
                                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                                        <tr>
                                            <th className="px-6 py-4">Student Name</th>
                                            <th className="px-6 py-4">Student ID</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Meal Type</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {attendance.records.map((record) => (
                                            <tr key={`${record.student_id}-${record.date}-${record.meal_type}-${record.id || 'row'}`} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-white">{record.name || 'Student'}</td>
                                                <td className="px-6 py-4 text-white/70">{record.student_id}</td>
                                                <td className="px-6 py-4 text-white/70">{record.date}</td>
                                                <td className="px-6 py-4 text-white/70">{formatMeal(record.meal_type)}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex rounded-full border border-creative-lime/30 bg-creative-lime/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-creative-lime">
                                                        {formatStatus(record.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    )
}
