import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { MealProvider } from './context/MealContext.jsx'
import './index.css'

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Render Error Boundary]', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.assign('/')
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white px-4 flex items-center justify-center">
                    <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/5 p-6 text-center">
                        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
                        <p className="text-sm text-white/70 mt-2">
                            The app hit an unexpected error. Try reloading this page.
                        </p>
                        {this.state.error?.message && (
                            <p className="mt-3 text-xs text-red-300 break-words">{this.state.error.message}</p>
                        )}
                        <button
                            type="button"
                            onClick={this.handleReset}
                            className="mt-5 min-h-[44px] px-4 rounded-xl bg-creative-lime text-black font-medium"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

console.info('[App Bootstrap] Root render started')

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AppErrorBoundary>
            <BrowserRouter>
                <ThemeProvider>
                    <AuthProvider>
                        <MealProvider>
                            <App />
                        </MealProvider>
                    </AuthProvider>
                </ThemeProvider>
            </BrowserRouter>
        </AppErrorBoundary>
    </StrictMode>
)
