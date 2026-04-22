import { useEffect, useMemo, useState } from 'react'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Toast from '../../components/common/Toast'
import api from '../../lib/api'
import { ATTENDANCE_QR_EXPECTED_FORMAT } from '../../../shared/attendanceQr'

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner']

function getTodayDate() {
    const localDate = new Date()
    return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

function formatMealLabel(value = '') {
    return String(value).replace(/^\w/, (char) => char.toUpperCase())
}

export default function AttendanceQR() {
    const [selectedDate, setSelectedDate] = useState(getTodayDate())
    const [selectedMealType, setSelectedMealType] = useState('lunch')
    const [availableMeals, setAvailableMeals] = useState([])
    const [loadingMeals, setLoadingMeals] = useState(false)
    const [loadingQr, setLoadingQr] = useState(false)
    const [qrData, setQrData] = useState(null)
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    useEffect(() => {
        fetchMeals(selectedDate)
    }, [selectedDate])

    async function fetchMeals(date) {
        setLoadingMeals(true)
        try {
            const data = await api.get(`/api/meals?date=${date}`)
            const meals = Array.isArray(data) ? data : []
            setAvailableMeals(meals)

            const hasSelectedMeal = meals.some((meal) => meal.meal_type === selectedMealType)
            if (!hasSelectedMeal && meals.length > 0) {
                setSelectedMealType(meals[0].meal_type)
            }
        } catch (error) {
            setAvailableMeals([])
            showToast(error.message || 'Failed to load meals', 'error')
        } finally {
            setLoadingMeals(false)
        }
    }

    async function generateQr() {
        setLoadingQr(true)
        try {
            const data = await api.post('/api/generate-qr', {
                meal_type: selectedMealType,
                date: selectedDate
            })
            setQrData(data)
            showToast(`QR ready for ${formatMealLabel(selectedMealType)}`, 'success')
        } catch (error) {
            setQrData(null)
            showToast(error.message || 'Failed to generate QR', 'error')
        } finally {
            setLoadingQr(false)
        }
    }

    function showToast(message, type = 'info') {
        setToastMessage(message)
        setToastType(type)
    }

    const selectedMeal = useMemo(
        () => availableMeals.find((meal) => meal.meal_type === selectedMealType) || null,
        [availableMeals, selectedMealType]
    )

    const qrStatus = qrData?.status === 'active' ? 'QR Active' : qrData ? 'Scheduled QR' : 'No QR generated'

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-6 lg:p-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card variant="premium" className="p-6 sm:p-8">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/40">Attendance Control</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-black italic tracking-tight uppercase">Generate Attendance QR</h1>
                        <p className="mt-3 text-sm text-white/55">Select the meal window, verify the preview, and publish the live QR for student scans.</p>
                    </Card>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                        <Card variant="glass" className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Date</span>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(event) => {
                                            setSelectedDate(event.target.value)
                                            setQrData(null)
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Meal</span>
                                    <select
                                        value={selectedMealType}
                                        onChange={(event) => {
                                            setSelectedMealType(event.target.value)
                                            setQrData(null)
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm outline-none focus:border-creative-lime/40"
                                    >
                                        {MEAL_OPTIONS.map((meal) => (
                                            <option key={meal} value={meal}>
                                                {formatMealLabel(meal)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">QR Status</p>
                                        <p className={`mt-2 text-2xl font-black ${qrData?.status === 'active' ? 'text-creative-lime' : 'text-white'}`}>{qrStatus}</p>
                                    </div>
                                    <Button onClick={generateQr} isLoading={loadingQr} disabled={loadingMeals}>
                                        Generate QR
                                    </Button>
                                </div>
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Meal</p>
                                        <p className="mt-2 font-semibold">{formatMealLabel(selectedMealType)}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Date</p>
                                        <p className="mt-2 font-semibold">{selectedDate}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Window</p>
                                        <p className="mt-2 font-semibold">
                                            {qrData?.timing ? `${qrData.timing.start_display} - ${qrData.timing.end_display}` : selectedMeal ? `${selectedMeal.start_time?.slice(0, 5)} - ${selectedMeal.end_time?.slice(0, 5)}` : '--'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Payload Contract</p>
                                <p className="mt-3 text-sm text-white/60">Students scan one shared QR. The backend identifies the logged-in student, validates the meal window, blocks duplicate scans, and marks attendance on the canonical meal record.</p>
                                <code className="mt-3 block text-xs text-creative-lime break-all">{ATTENDANCE_QR_EXPECTED_FORMAT}</code>
                            </div>
                        </Card>

                        <Card variant="glass" className="p-6 text-center">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">QR Preview</p>
                            {qrData?.qr_image ? (
                                <>
                                    <img
                                        src={qrData.qr_image}
                                        alt="Attendance QR"
                                        className="mx-auto mt-4 w-72 h-72 rounded-2xl border border-white/10 bg-white p-3"
                                    />
                                    <p className="mt-4 text-lg font-black text-creative-lime">{formatMealLabel(qrData.meal_type)}</p>
                                    <p className="mt-1 text-sm text-white/55">{qrData.date}</p>
                                    <p className="mt-1 text-sm text-white/55">Expires at {new Date(qrData.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                </>
                            ) : (
                                <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-sm text-white/45">
                                    {loadingMeals ? 'Loading meal slots...' : 'Generate a QR to preview it here.'}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </main>

            <Toast
                message={toastMessage}
                type={toastType}
                duration={5000}
                onClose={() => setToastMessage('')}
            />
        </div>
    )
}
