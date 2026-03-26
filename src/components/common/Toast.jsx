import { useEffect, useState } from 'react'

const VARIANTS = {
    success: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        icon: '✅',
    },
    error: {
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        text: 'text-red-300',
        icon: '❌',
    },
    warning: {
        bg: 'bg-yellow-500/15',
        border: 'border-yellow-500/40',
        text: 'text-yellow-300',
        icon: '⏰',
    },
    info: {
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/40',
        text: 'text-blue-300',
        icon: 'ℹ️',
    },
}

/**
 * Centered popup toast with fade in/out animation.
 * @param {{ message: string, type: 'success'|'error'|'warning'|'info', duration?: number, onClose: () => void }} props
 */
export default function Toast({ message, type = 'info', duration = 5000, onClose }) {
    const [visible, setVisible] = useState(false)
    const [exiting, setExiting] = useState(false)
    const v = VARIANTS[type] || VARIANTS.info

    useEffect(() => {
        if (!message) return undefined
        // Trigger fade-in
        const enterTimer = requestAnimationFrame(() => setVisible(true))

        // Start fade-out before removing
        const exitTimer = setTimeout(() => {
            setExiting(true)
            setVisible(false)
        }, duration - 400)

        // Fully remove
        const removeTimer = setTimeout(() => {
            onClose?.()
        }, duration)

        return () => {
            cancelAnimationFrame(enterTimer)
            clearTimeout(exitTimer)
            clearTimeout(removeTimer)
        }
    }, [message, duration, onClose])

    if (!message) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4">
            <div
                className={`
                    pointer-events-auto max-w-md w-full rounded-2xl border ${v.border} ${v.bg}
                    backdrop-blur-xl shadow-2xl px-6 py-5
                    transition-all duration-400 ease-out
                    ${visible && !exiting ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
                `}
            >
                <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{v.icon}</span>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${v.text} leading-relaxed`}>{message}</p>
                    </div>
                    <button
                        onClick={() => onClose?.()}
                        className="text-white/40 hover:text-white/80 transition-colors text-lg flex-shrink-0 mt-0.5"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-0.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${v.text.replace('text-', 'bg-')}`}
                        style={{
                            animation: `toast-progress ${duration}ms linear forwards`,
                        }}
                    />
                </div>
            </div>
            <style>{`
                @keyframes toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    )
}
