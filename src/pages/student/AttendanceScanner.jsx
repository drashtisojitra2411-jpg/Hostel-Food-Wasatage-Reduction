import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../../components/layout/Navigation'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
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

function mapScanError(message) {
    const normalized = String(message || '').toLowerCase()

    if (normalized.includes('permission') || normalized.includes('notallowederror')) {
        return 'Camera permission denied. Allow camera access in browser settings and try again.'
    }
    if (normalized.includes('https') || normalized.includes('secure context')) {
        return 'Camera access requires HTTPS on mobile browsers.'
    }
    if (normalized.includes('notfounderror')) {
        return 'No camera found on this device.'
    }
    if (normalized.includes('notreadableerror') || normalized.includes('trackstart')) {
        return 'Camera is busy in another app. Close it and try again.'
    }

    return 'Unable to start camera. Please try again.'
}

function mapAttendanceError(message) {
    const normalized = String(message || '').toLowerCase()

    if (normalized.includes('expired')) {
        return 'QR expired. Please ask for a new QR code.'
    }
    if (normalized.includes('already marked')) {
        return 'You have already marked attendance'
    }
    if (normalized.includes('outside meal window')) {
        return 'Attendance is not available for this time window.'
    }
    if (normalized.includes('invalid qr')) {
        return 'Invalid QR code. Please scan the official hostel QR.'
    }

    return message || 'Failed to mark attendance. Please try again.'
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
    const [status, setStatus] = useState({ type: 'info', text: 'Tap start to open camera.' })
    const [success, setSuccess] = useState('')
    const [toast, setToast] = useState('')
    const [lastAttendance, setLastAttendance] = useState(null)
    const isStudentRole = role === 'student'

    const isSecureContext = useMemo(() => {
        const protocol = window.location.protocol
        const host = window.location.hostname
        return protocol === 'https:' || LOCAL_HOSTS.has(host)
    }, [])

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
                console.info('[AttendanceScanner] Stopping QR scanner')
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

        console.info('[AttendanceScanner] Requesting camera permission')
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        })

        activeStreamRef.current = stream
        console.info('[AttendanceScanner] Camera permission granted')
        stopMediaStream(stream)
        activeStreamRef.current = null
    }, [])

    const submitAttendance = useCallback(async (decodedText) => {
        const token = extractToken(decodedText)

        if (!token) {
            setStatus({ type: 'error', text: 'Invalid QR payload. Please scan again.' })
            scanLockedRef.current = false
            return
        }

        setIsSubmitting(true)
        setStatus({ type: 'info', text: 'Marking attendance...' })
        setSuccess('')

        try {
            const response = await api.post('/api/attendance', {
                qr_token: token,
                qr_data: decodedText
            })

            setLastAttendance(response)
            setSuccess('Attendance successfully recorded')
            setToast('Attendance successfully recorded')
            setStatus({
                type: 'success',
                text: 'Attendance successfully recorded'
            })
        } catch (error) {
            setStatus({ type: 'error', text: mapAttendanceError(error?.message) })
        } finally {
            setIsSubmitting(false)
            scanLockedRef.current = false
        }
    }, [])

    const startScanner = useCallback(async () => {
        if (!isStudentRole) {
            setStatus({ type: 'error', text: 'Only students can scan attendance' })
            return
        }

        if (!isSecureContext) {
            setStatus({ type: 'error', text: 'Camera access requires HTTPS. Open this app over HTTPS.' })
            return
        }

        if (isScanning || isSubmitting) return

        const scanner = await ensureScanner()

        try {
            await requestCameraPermission()

            console.info('[AttendanceScanner] Starting QR scanner with back camera')
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
            setStatus({ type: 'info', text: 'Scanner active. Keep QR inside the frame.' })
        } catch (error) {
            console.error('[AttendanceScanner] Camera error:', error)
            setStatus({ type: 'error', text: mapScanError(error?.message || error?.name) })
            await stopScanner()
        }
    }, [ensureScanner, ensureVideoAttributes, isScanning, isSecureContext, isStudentRole, isSubmitting, requestCameraPermission, stopScanner, submitAttendance])

    useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(''), 2500)
        return () => clearTimeout(timer)
    }, [toast])

    useEffect(() => {
        return () => {
            stopScanner()
        }
    }, [stopScanner])

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="lg:ml-72 pt-20 pb-24 lg:py-8 px-3 sm:px-4 lg:px-10">
                <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4">
                    <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Scan Attendance QR</h1>
                                <p className="text-sm text-white/70 mt-1">Open camera, scan hostel QR, and submit attendance instantly.</p>
                            </div>
                            <Link to="/dashboard" className="text-sm text-creative-lime hover:underline whitespace-nowrap">
                                Back
                            </Link>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                        <Card variant="premium" className="rounded-2xl p-3 sm:p-4 lg:col-span-2" hover={false}>
                            <div
                                id={SCANNER_ID}
                                className="w-full h-[62vh] sm:h-[68vh] lg:h-[70vh] max-h-[640px] rounded-2xl overflow-hidden bg-black border border-white/15"
                            />

                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <Button
                                    onClick={startScanner}
                                    disabled={!isSecureContext || !isStudentRole || isScanning || isSubmitting}
                                    className="w-full !min-h-[48px] !text-sm"
                                >
                                    {isSubmitting ? 'Recording...' : isScanning ? 'Scanning...' : 'Start Camera'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={stopScanner}
                                    disabled={!isScanning}
                                    className="w-full !min-h-[48px] !text-sm"
                                >
                                    Stop
                                </Button>
                            </div>
                        </Card>

                        <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                            <h2 className="text-lg font-semibold tracking-tight">How to scan</h2>
                            <ul className="mt-3 space-y-2 text-sm text-white/75">
                                <li>Use the hostel-issued QR only.</li>
                                <li>Keep QR fully inside the frame.</li>
                                <li>Hold camera steady for 1-2 seconds.</li>
                                <li>If expired, request a fresh QR.</li>
                            </ul>
                            {!isSecureContext && (
                                <p className="text-xs text-yellow-300 mt-3">
                                    Camera works only on HTTPS (or localhost in development).
                                </p>
                            )}
                            {!isStudentRole && (
                                <p className="text-xs text-red-300 mt-3">
                                    Only students can scan attendance
                                </p>
                            )}
                        </Card>
                    </div>

                    <Card variant="glass" className="rounded-2xl p-4 sm:p-5" hover={false}>
                        {success && <p className="text-sm font-medium text-creative-lime mb-2">{success}</p>}
                        <p
                            className={`text-sm font-medium ${
                                status.type === 'error'
                                    ? 'text-red-300'
                                    : status.type === 'success'
                                    ? 'text-creative-lime'
                                    : 'text-white/80'
                            }`}
                        >
                            {status.text}
                        </p>
                        {lastAttendance?.scanned_at && (
                            <p className="text-xs text-white/60 mt-2">
                                Recorded at: {new Date(lastAttendance.scanned_at).toLocaleString()}
                            </p>
                        )}

                        {lastAttendance?.rewards && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-3">
                                    <p className="text-xs text-white/60">Points</p>
                                    <p className="text-xl font-semibold">{lastAttendance.rewards.points}</p>
                                </div>
                                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-3">
                                    <p className="text-xs text-white/60">Total Meals</p>
                                    <p className="text-xl font-semibold">{lastAttendance.rewards.total_meals}</p>
                                </div>
                                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-3">
                                    <p className="text-xs text-white/60">Effective Fee</p>
                                    <p className="text-xl font-semibold">INR {lastAttendance?.fee_preview?.effective_fee ?? '-'}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </main>
            {toast && (
                <div className="fixed top-4 right-4 z-[60] rounded-xl border border-creative-lime/40 bg-black/90 px-4 py-3 text-sm text-creative-lime shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    )
}
