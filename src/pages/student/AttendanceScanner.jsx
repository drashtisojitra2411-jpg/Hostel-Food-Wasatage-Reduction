import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../../components/layout/Navigation'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Toast from '../../components/common/Toast'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const SCANNER_ID = 'student-attendance-scanner'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function extractToken(decodedText) {
    if (!decodedText) return null
    const raw = String(decodedText).trim()

    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw)
            return parsed.token || parsed.qr_token || null
        } catch {
            return raw
        }
    }

    return raw
}

function stopMediaStream(stream) {
    if (!stream) return
    const tracks = stream.getTracks?.() || []
    tracks.forEach((track) => track.stop())
}

export default function AttendanceScanner() {
    const { role } = useAuth()
    const scannerRef = useRef(null)
    const scannerCtorRef = useRef(null)
    const scanLockedRef = useRef(false)
    const activeStreamRef = useRef(null)

    const [isScanning, setIsScanning] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState('')
    const [lastAttendance, setLastAttendance] = useState(null)
    const [mealWindow, setMealWindow] = useState(null)

    // Toast popup state
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState('info')

    const isStudentRole = role === 'student'
    const isMealActive = Boolean(mealWindow?.active_meal)

    const isSecureContext = useMemo(() => {
        const protocol = window.location.protocol
        const host = window.location.hostname
        return protocol === 'https:' || LOCAL_HOSTS.has(host)
    }, [])

    // Fetch current meal window on mount and poll every 60s
    useEffect(() => {
        let cancelled = false
        async function fetchMealWindow() {
            try {
                const data = await api.get('/api/meal-timings/current')
                if (!cancelled) setMealWindow(data)
            } catch {
                // Silently fail — scanner still works, just without time awareness
            }
        }
        fetchMealWindow()
        const interval = setInterval(fetchMealWindow, 60_000)
        return () => { cancelled = true; clearInterval(interval) }
    }, [])

    function showToast(message, type = 'info') {
        setToastMessage(message)
        setToastType(type)
    }

    function clearToast() {
        setToastMessage('')
    }

    const ensureScanner = useCallback(async () => {
        if (!scannerCtorRef.current) {
            const module = await import('html5-qrcode')
            scannerCtorRef.current = module.Html5Qrcode
        }

        if (!scannerRef.current) {
            scannerRef.current = new scannerCtorRef.current(SCANNER_ID)
        }
        return scannerRef.current
    }, [])

    const ensureVideoAttributes = useCallback(() => {
        const videoEl = document.querySelector(`#${SCANNER_ID} video`)
        if (!videoEl) return

        videoEl.autoplay = true
        videoEl.playsInline = true
        videoEl.muted = true
        videoEl.setAttribute('autoplay', 'true')
        videoEl.setAttribute('playsinline', 'true')
        videoEl.setAttribute('webkit-playsinline', 'true')
    }, [])

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current

        try {
            if (scanner?.isScanning) {
                await scanner.stop()
            }
            if (scanner) {
                await scanner.clear()
            }
        } catch (error) {
            console.warn('[AttendanceScanner] Scanner stop error', error)
        } finally {
            const videoEl = document.querySelector(`#${SCANNER_ID} video`)
            const stream = videoEl?.srcObject
            if (stream && typeof stream.getTracks === 'function') {
                stopMediaStream(stream)
            }
            if (videoEl) {
                videoEl.srcObject = null
            }

            stopMediaStream(activeStreamRef.current)
            activeStreamRef.current = null
            setIsScanning(false)
        }
    }, [])

    const requestCameraPermission = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera API not supported in this browser')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        })

        activeStreamRef.current = stream
        stopMediaStream(stream)
        activeStreamRef.current = null
    }, [])

    const submitAttendance = useCallback(async (decodedText) => {
        const token = extractToken(decodedText)

        if (!token) {
            showToast('Invalid QR code. Please scan a valid attendance QR.', 'error')
            scanLockedRef.current = false
            return
        }

        setIsSubmitting(true)

        try {
            const response = await api.post('/api/attendance', {
                qr_token: token,
                qr_data: decodedText
            })

            setLastAttendance(response)
            setSuccess('Attendance successfully recorded')
            showToast('✅ Attendance successfully recorded!', 'success')
        } catch (error) {
            const msg = error?.message || 'Failed to mark attendance'
            const normalized = msg.toLowerCase()

            if (normalized.includes('expired')) {
                showToast('⏰ QR code has expired. Please ask for a new QR code.', 'warning')
            } else if (normalized.includes('already marked') || normalized.includes('already')) {
                showToast('You have already marked attendance for this meal.', 'warning')
            } else if (normalized.includes('outside') || normalized.includes('allowed from')) {
                showToast(msg, 'warning')
            } else if (normalized.includes('invalid qr') || normalized.includes('invalid')) {
                showToast('Invalid QR code. Please scan the official hostel QR.', 'error')
            } else {
                showToast(msg, 'error')
            }
        } finally {
            setIsSubmitting(false)
            scanLockedRef.current = false
        }
    }, [])

    const startScanner = useCallback(async () => {
        if (!isStudentRole) {
            showToast('Only students can scan attendance.', 'error')
            return
        }

        if (!isSecureContext) {
            showToast('Camera access requires HTTPS. Open this app over HTTPS.', 'error')
            return
        }

        if (!isMealActive) {
            showToast('No active meal right now. Check the schedule below.', 'warning')
            return
        }

        if (isScanning || isSubmitting) return

        const scanner = await ensureScanner()

        try {
            await requestCameraPermission()

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    aspectRatio: 1,
                    rememberLastUsedCamera: true,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)
                        return { width: size, height: size }
                    }
                },
                async (decodedText) => {
                    if (scanLockedRef.current) return
                    scanLockedRef.current = true

                    await stopScanner()
                    await submitAttendance(decodedText)
                },
                () => null
            )

            ensureVideoAttributes()
            setIsScanning(true)
        } catch (error) {
            console.error('[AttendanceScanner] Camera error:', error)
            const normalized = String(error?.message || error?.name || '').toLowerCase()
            if (normalized.includes('permission') || normalized.includes('notallowederror')) {
                showToast('Camera permission denied. Allow camera access in browser settings.', 'error')
            } else if (normalized.includes('notfounderror')) {
                showToast('No camera found on this device.', 'error')
            } else {
                showToast('Unable to start camera. Please try again.', 'error')
            }
            await stopScanner()
        }
    }, [ensureScanner, ensureVideoAttributes, isMealActive, isScanning, isSecureContext, isStudentRole, isSubmitting, requestCameraPermission, stopScanner, submitAttendance])

    useEffect(() => {
        return () => {
            stopScanner()
        }
    }, [stopScanner])

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="lg:ml-72 pt-20 pb-24 lg:py-8 px-3 sm:px-4 lg:px-10">
                <div className="max-w-3xl mx-auto space-y-4">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Scan Attendance</h1>
                            <p className="text-sm text-white/60 mt-1">Point your camera at the meal QR code</p>
                        </div>
                        <Link to="/dashboard" className="text-sm text-creative-lime hover:underline whitespace-nowrap">
                            ← Back
                        </Link>
                    </div>

                    {/* Active Meal Status Bar */}
                    {isMealActive && mealWindow?.active_meal && (
                        <div className="rounded-xl border border-creative-lime/30 bg-creative-lime/10 px-4 py-3 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-creative-lime opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-creative-lime"></span>
                            </span>
                            <p className="text-sm font-semibold text-creative-lime">
                                {mealWindow.active_meal.meal_name.charAt(0).toUpperCase() + mealWindow.active_meal.meal_name.slice(1)} is active
                                <span className="font-normal text-white/50 ml-2">
                                    {mealWindow.active_meal.start_time_display} – {mealWindow.active_meal.end_time_display}
                                </span>
                            </p>
                        </div>
                    )}

                    {!isMealActive && mealWindow && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                            <p className="text-sm font-semibold text-yellow-300">
                                {mealWindow.next_meal
                                    ? `Next meal: ${mealWindow.next_meal.meal_name.charAt(0).toUpperCase() + mealWindow.next_meal.meal_name.slice(1)} starts at ${mealWindow.next_meal.start_time_display}${mealWindow.next_meal.is_tomorrow ? ' (tomorrow)' : ''}`
                                    : 'No upcoming meals scheduled.'}
                            </p>
                            <p className="text-xs text-white/40 mt-1">Current IST: {mealWindow.current_time_ist}</p>
                        </div>
                    )}

                    {/* Camera Section — Large and Centered */}
                    <Card variant="premium" className="rounded-2xl p-3 sm:p-4" hover={false}>
                        <div className="relative">
                            <div
                                id={SCANNER_ID}
                                className="w-full aspect-square max-h-[65vh] rounded-2xl overflow-hidden bg-black/80 border border-white/10"
                            />
                            {/* Scanning overlay indicator */}
                            {isScanning && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-creative-lime/50 rounded-2xl animate-pulse" />
                                </div>
                            )}
                            {/* Submitting overlay */}
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-3 border-creative-lime/30 border-t-creative-lime rounded-full animate-spin" />
                                        <p className="text-sm font-semibold text-white/80">Recording attendance...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <Button
                                onClick={startScanner}
                                disabled={!isSecureContext || !isStudentRole || isScanning || isSubmitting || !isMealActive}
                                className="w-full !min-h-[52px] !text-sm !font-bold"
                            >
                                {isSubmitting ? '⏳ Recording...' : isScanning ? '📷 Scanning...' : '📸 Start Camera'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={stopScanner}
                                disabled={!isScanning}
                                className="w-full !min-h-[52px] !text-sm !font-bold"
                            >
                                ⏹ Stop
                            </Button>
                        </div>
                    </Card>

                    {/* Attendance Result */}
                    {lastAttendance?.rewards && (
                        <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                            <p className="text-sm font-semibold text-creative-lime mb-3">{success}</p>
                            {lastAttendance?.scanned_at && (
                                <p className="text-xs text-white/50 mb-3">
                                    Recorded at: {new Date(lastAttendance.scanned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                </p>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
                                    <p className="text-xs text-white/50">Points</p>
                                    <p className="text-xl font-bold">{lastAttendance.rewards.points}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
                                    <p className="text-xs text-white/50">Meals</p>
                                    <p className="text-xl font-bold">{lastAttendance.rewards.total_meals}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
                                    <p className="text-xs text-white/50">Fee</p>
                                    <p className="text-xl font-bold">₹{lastAttendance?.fee_preview?.effective_fee ?? '-'}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Instructions + Schedule (below camera) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                            <h2 className="text-base font-semibold tracking-tight mb-2">How to scan</h2>
                            <ul className="space-y-1.5 text-sm text-white/65">
                                <li>📌 Use the hostel-issued QR only</li>
                                <li>📐 Keep QR fully inside the frame</li>
                                <li>⏱ Hold camera steady for 1-2 seconds</li>
                                <li>🔄 If expired, request a fresh QR</li>
                            </ul>
                            {!isSecureContext && (
                                <p className="text-xs text-yellow-300 mt-3">
                                    ⚠ Camera works only on HTTPS (or localhost).
                                </p>
                            )}
                            {!isStudentRole && (
                                <p className="text-xs text-red-300 mt-3">
                                    ⚠ Only students can scan attendance
                                </p>
                            )}
                        </Card>

                        <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                            <h2 className="text-base font-semibold tracking-tight mb-2">Meal Schedule (IST)</h2>
                            {mealWindow?.all_timings ? (
                                <div className="space-y-1.5">
                                    {mealWindow.all_timings.map((t) => (
                                        <div
                                            key={t.meal_name}
                                            className={`text-sm px-3 py-2 rounded-xl flex justify-between items-center ${
                                                t.is_active
                                                    ? 'bg-creative-lime/15 text-creative-lime font-bold border border-creative-lime/30'
                                                    : 'text-white/50 bg-white/5'
                                            }`}
                                        >
                                            <span>{t.meal_name.charAt(0).toUpperCase() + t.meal_name.slice(1)}</span>
                                            <span className="text-xs">{t.start_time_display} – {t.end_time_display}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/40">Loading schedule...</p>
                            )}
                        </Card>
                    </div>
                </div>
            </main>

            {/* Centered Toast Popup */}
            <Toast
                message={toastMessage}
                type={toastType}
                duration={5000}
                onClose={clearToast}
            />
        </div>
    )
}
