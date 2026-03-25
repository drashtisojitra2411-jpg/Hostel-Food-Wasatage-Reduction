/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Primary - Emerald Green (growth/sustainability)
                primary: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
                // Accent - Orange (energy/action)
                accent: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                // Secondary - Teal (freshness)
                secondary: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6',
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                    950: '#042f2e',
                },
                // Highlight - Warm Yellow
                highlight: {
                    50: '#fefce8',
                    100: '#fef9c3',
                    200: '#fef08a',
                    300: '#fde047',
                    400: '#facc15',
                    500: '#eab308',
                    600: '#ca8a04',
                    700: '#a16207',
                    800: '#854d0e',
                    900: '#713f12',
                    950: '#422006',
                },
                // Creative Overhaul Colors
                creative: {
                    purple: '#6366f1',
                    lime: '#bef264',
                    dark: '#0a0a0a',
                    gray: '#171717',
                    purple_light: '#a5b4fc',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Outfit', 'Inter', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'slide-up': 'slide-up 0.5s ease-out forwards',
                'slide-down': 'slide-down 0.5s ease-out forwards',
                'slide-left': 'slide-left 0.5s ease-out forwards',
                'slide-right': 'slide-right 0.5s ease-out forwards',
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'bounce-in': 'bounce-in 0.6s ease-out forwards',
                'spin-slow': 'spin 3s linear infinite',
                'gradient-shift': 'gradient-shift 8s ease infinite',
                'counter': 'counter 2s ease-out forwards',
                'draw-line': 'draw-line 2s ease-out forwards',
                'ripple': 'ripple 0.6s linear',
                'shimmer': 'shimmer 2s infinite',
                'confetti': 'confetti 1s ease-out forwards',
                'grow': 'grow 1s ease-out forwards',
                'bounce-slow': 'bounce 3s infinite',
                'spin-reverse': 'spin-reverse 1s linear infinite',
                'spin-reverse-slow': 'spin-reverse 3s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'color-shift': 'color-shift 3s ease infinite',
                'scan': 'scan 2s linear infinite',
                'dash': 'dash 1s linear infinite',
                'move-path': 'move-simple 3s ease-in-out infinite alternate',
                'block-reveal': 'block-reveal 1.2s cubic-bezier(0.77, 0, 0.175, 1) forwards',
                'marquee': 'marquee 30s linear infinite',
            },
            keyframes: {
                'marquee': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'scan': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(300%)' },
                },
                'dash': {
                    'to': { strokeDashoffset: '-20' },
                },
                'move-simple': {
                    '0%': { left: '10px', top: '50%' },
                    '100%': { left: '90%', top: '50%' },
                },
                'spin-reverse': {
                    'to': { transform: 'rotate(-360deg)' },
                },
                'color-shift': {
                    '0%, 100%': { color: '#10b981' }, // primary-500
                    '50%': { color: '#f97316' }, // accent-500
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(16, 185, 129, 0.5)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-left': {
                    '0%': { transform: 'translateX(20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-right': {
                    '0%': { transform: 'translateX(-20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'bounce-in': {
                    '0%': { transform: 'scale(0.3)', opacity: '0' },
                    '50%': { transform: 'scale(1.05)' },
                    '70%': { transform: 'scale(0.9)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'confetti': {
                    '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
                    '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
                },
                'grow': {
                    '0%': { transform: 'scale(0)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'mesh-gradient': 'linear-gradient(135deg, #10b981 0%, #14b8a6 25%, #06b6d4 50%, #0ea5e9 75%, #6366f1 100%)',
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(16, 185, 129, 0.4)',
                'glow-accent': '0 0 20px rgba(249, 115, 22, 0.4)',
                'glow-secondary': '0 0 20px rgba(20, 184, 166, 0.4)',
                'inner-glow': 'inset 0 0 20px rgba(16, 185, 129, 0.2)',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            addUtilities({
                '.perspective-1000': {
                    'perspective': '1000px',
                },
                '.preserve-3d': {
                    'transform-style': 'preserve-3d',
                },
                '.backface-hidden': {
                    'backface-visibility': 'hidden',
                },
                '.rotate-y-180': {
                    'transform': 'rotateY(180deg)',
                },
                '.rotate-x-180': {
                    'transform': 'rotateX(180deg)',
                },
            })
        }
    ],
}
