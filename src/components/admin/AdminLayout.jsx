import Navigation from '../layout/Navigation'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout({ title, subtitle, children }) {
    const { role } = useAuth()
    const isHostelAdmin = role === 'hostel_admin'

    return (
        <div className="min-h-screen bg-black text-white p-6 lg:ml-72 transition-all duration-500 font-sans">
            <Navigation />
            <div className="max-w-7xl mx-auto space-y-8 mt-20 lg:mt-0">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                        {isHostelAdmin ? 'Hostel Admin' : 'Super Admin'} <span className="text-creative-lime">{isHostelAdmin ? 'Analytics' : 'Console'}</span>
                    </h1>
                    <p className="text-white/50 font-medium tracking-widest uppercase text-sm mt-2">{title} {subtitle ? `| ${subtitle}` : ''}</p>
                </div>
                {children}
            </div>
        </div>
    )
}
