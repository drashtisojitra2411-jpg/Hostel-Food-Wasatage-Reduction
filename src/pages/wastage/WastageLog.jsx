import { useEffect, useState } from 'react'
import Navigation from '../../components/layout/Navigation'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Toast from '../../components/common/Toast'
import api from '../../lib/api'

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner']

function getTodayDate() {
    return new Date().toISOString().split('T')[0]
}

function formatMealLabel(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

export default function WastageLog() {
    const [formData, setFormData] = useState({
        date: getTodayDate(),
        meal_type: 'lunch',
        food_item: '',
        quantity_wasted: ''
    })
    const [logs, setLogs] = useState([])
    const [totalsByMeal, setTotalsByMeal] = useState([])
    const [totalWastage, setTotalWastage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    useEffect(() => {
        fetchLogs(formData.date)
    }, [formData.date])

    function showToast(message, type = 'info') {
        setToastMessage(message)
        setToastType(type)
    }

    async function fetchLogs(date) {
        setLoading(true)
        try {
            const res = await api.get(`/api/wastage?date=${date}`)
            setLogs(Array.isArray(res?.logs) ? res.logs : [])
            setTotalsByMeal(Array.isArray(res?.totals_by_meal) ? res.totals_by_meal : [])
            setTotalWastage(Number(res?.total_wastage || 0))
        } catch (error) {
            setLogs([])
            setTotalsByMeal([])
            setTotalWastage(0)
            showToast(error.message || 'Failed to load wastage logs', 'error')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(event) {
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
            await fetchLogs(formData.date)
        } catch (error) {
            showToast(error.message || 'Failed to update wastage', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-red-500/5 blur-[150px] rounded-full pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10 space-y-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div>
                            <div className="inline-block px-4 py-1.5 border border-red-500/30 bg-red-500/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] mb-6 text-red-400">
                                WASTAGE SYNC ACTIVE
                            </div>
                            <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">
                                WASTAGE<br />
                                <span className="text-red-500">LOGGER.</span>
                            </h1>
                        </div>
                        <Button variant="outline" onClick={() => fetchLogs(formData.date)} isLoading={loading}>REFRESH</Button>
                    </div>

                    <Card variant="premium" className="border-white/5 p-8 lg:p-10">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Date</span>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                                    className="mt-3 w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none focus:border-red-500"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Meal Type</span>
                                <select
                                    value={formData.meal_type}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, meal_type: event.target.value }))}
                                    className="mt-3 w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none focus:border-red-500"
                                >
                                    {MEAL_OPTIONS.map((meal) => <option key={meal} value={meal}>{formatMealLabel(meal)}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Food Item</span>
                                <input
                                    type="text"
                                    value={formData.food_item}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, food_item: event.target.value }))}
                                    className="mt-3 w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none focus:border-red-500"
                                    placeholder="Rice, dal, curry..."
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Quantity Wasted (kg)</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.quantity_wasted}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, quantity_wasted: event.target.value }))}
                                    className="mt-3 w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none focus:border-red-500"
                                    placeholder="0.00"
                                    required
                                />
                            </label>
                            <div className="md:col-span-2 flex items-center justify-between gap-4 flex-wrap">
                                <p className="text-sm text-white/45">Updates are synced back into the manager dashboard and admin analytics.</p>
                                <Button type="submit" variant="primary" isLoading={submitting}>UPDATE WASTAGE</Button>
                            </div>
                        </form>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card variant="glass" className="md:col-span-1">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Selected day total</p>
                            <p className="text-4xl font-black text-red-400 mt-3">{totalWastage.toFixed(2)} KG</p>
                        </Card>
                        {MEAL_OPTIONS.map((meal) => {
                            const total = totalsByMeal.find((item) => item.meal_type === meal)?.total_wastage || 0
                            return (
                                <Card key={meal} variant="glass">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">{meal}</p>
                                    <p className="text-3xl font-black mt-3">{Number(total).toFixed(2)} KG</p>
                                </Card>
                            )
                        })}
                    </div>

                    <Card variant="glass" className="border-white/5">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase">Logged Items</h2>
                            <p className="text-sm text-white/45">{formData.date}</p>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">Loading wastage records...</div>
                            ) : logs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">No wastage records for this date.</div>
                            ) : logs.map((log) => (
                                <div key={log.id} className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-white">{log.food_item}</p>
                                        <p className="text-xs text-white/45">{formatMealLabel(log.meal_type)}</p>
                                    </div>
                                    <p className="text-xl font-black text-red-400">{Number(log.quantity || 0).toFixed(2)} KG</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </main>

            <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
        </div>
    )
}
