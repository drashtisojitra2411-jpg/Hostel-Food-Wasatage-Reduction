import Navigation from '../layout/Navigation';

export default function AdminLayout({ title, subtitle, children }) {
    return (
        <div className="min-h-screen bg-black text-white p-6 lg:ml-72 transition-all duration-500 font-sans">
            <Navigation />
            <div className="max-w-7xl mx-auto space-y-8 mt-20 lg:mt-0">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                        Super Admin <span className="text-creative-lime line-through">Console</span>
                    </h1>
                    <p className="text-white/50 font-medium tracking-widest uppercase text-sm mt-2">{title} {subtitle ? `| ${subtitle}` : ''}</p>
                </div>
                {children}
            </div>
        </div>
    );
}
