import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ComparisonSlider from '../components/landing/ComparisonSlider'
import JourneyPath from '../components/landing/JourneyPath'

export default function Home() {
    const { user, role, loading } = useAuth()
    const [isVisible, setIsVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const [selectedDetail, setSelectedDetail] = useState(null)

    const contentDetails = {
        '01': {
            title: 'THE CRISIS WE SOLVED',
            subtitle: 'Hostel Mass Inefficiency',
            description: 'Traditionally, hostel messes prepare food based on total enrollment, ignoring students who eat out or skip meals. This leads to a 35-40% daily wastage rate. Our system introduces precision booking, ensuring kitchens only cook what is actually consumed.',
            stats: ['40% Waste Reduction', '₹2L+ Saved/Month']
        },
        '02': {
            title: 'REAL-TIME TRUTH',
            subtitle: 'Data-Driven Sustainability',
            description: 'We don\'t just estimate. Our IoT-integrated scales and real-time booking logs provide a live heatmap of food consumption. This data allows for dynamic menu adjustments and predictable procurement, slashing operational costs.',
            stats: ['99% Data Accuracy', 'Live Eco-Heatmaps']
        },
        '03': {
            title: 'INTELLIGENT ECOSYSTEM',
            subtitle: 'Beyond Simple Booking',
            description: 'The HFWR platform connects the kitchen, the student, and the donor. When surplus is detected, our AI immediately alerts local NGOs, turning potential waste into a community resource within minutes.',
            stats: ['15 Min Response Time', 'Zero-Waste Cycle']
        },
        '04': {
            title: 'BE THE CHANGE',
            subtitle: 'Join the Movement',
            description: 'Sustainability isn\'t a solo mission. By joining HFWR, you become part of a network of 5,000+ eco-ninjas dedicated to making food waste history. Your profile tracks your individual contribution and rewards your consistency.',
            stats: ['5K+ Active Members', 'Badges & Rewards']
        }
    }

    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                if (window.scrollY > lastScrollY && window.scrollY > 100) { // scrolling down
                    setIsVisible(false)
                } else { // scrolling up
                    setIsVisible(true)
                }
                setLastScrollY(window.scrollY)
            }
        }

        window.addEventListener('scroll', controlNavbar)
        return () => window.removeEventListener('scroll', controlNavbar)
    }, [lastScrollY])

    const navItems = [
        { id: '01', title: 'The Problem', link: '#problem' },
        { id: '02', title: 'Live Impact', link: '#stats' },
        { id: '03', title: 'System Features', link: '#features' },
    ]

    // Redirect authenticated users
    useEffect(() => {
        if (!loading && user && isVisible) { // If user is logged in, send them to their dashboard.
            const path = role === 'mess_manager' ? '/mess-manager' :
                role === 'super_admin' ? '/admin' :
                    role === 'chef' ? '/chef' :
                        role === 'ngo' ? '/ngo' : '/dashboard'
            window.location.replace(path)
        }
    }, [user, loading, role, isVisible])

    if (loading) return null; // Or a loading spinner

    return (
        <div className="min-h-screen bg-creative-dark text-white selection:bg-creative-lime selection:text-creative-dark overflow-x-hidden">
            {/* Custom Creative Cursor Layer (Pure CSS) */}
            <div className="fixed inset-0 pointer-events-none z-[100] mix-blend-difference hidden lg:block">
                <div className="absolute w-8 h-8 rounded-full border border-creative-lime transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2" id="custom-cursor"></div>
            </div>

            {/* Sticky Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[60] py-6 px-8 flex justify-between items-center transition-all duration-500 glass-strong m-4 rounded-3xl border border-white/10 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'}`}>
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-12 h-12 rounded-2xl bg-creative-lime flex items-center justify-center transition-transform group-hover:rotate-12 group-hover:scale-110">
                        <svg className="w-8 h-8 text-creative-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-display font-black tracking-tighter text-white">ZeroBite<span className="text-creative-lime">.</span></span>
                </Link>

                <div className="flex items-center gap-8">
                    <div className="hidden md:flex gap-8 text-sm font-bold tracking-widest uppercase">
                        <Link to="/vision-protocol" className="hover:text-creative-lime transition-colors">Vision</Link>
                    </div>
                    {user ? (
                        <div className="flex gap-4">
                            <Link to="/dashboard" className="px-8 py-3 rounded-2xl bg-creative-lime text-creative-dark font-black hover:scale-105 active:scale-95 transition-all shadow-glow-primary">
                                DASHBOARD
                            </Link>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <Link to="/login" className="px-8 py-3 rounded-2xl bg-white/10 text-white font-black hover:bg-white/20 hover:scale-105 active:scale-95 transition-all hidden md:block">
                                LOGIN
                            </Link>
                            <Link to="/register" className="px-8 py-3 rounded-2xl bg-creative-purple text-white font-black hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all">
                                JOIN NOW
                            </Link>
                        </div>
                    )}
                </div>
            </nav>

            {/* Split-Screen Hero */}
            <header className="relative min-h-screen grid lg:grid-cols-12 items-stretch pt-20">
                {/* Left side: The Statement */}
                <div className="lg:col-span-8 flex flex-col justify-center px-8 lg:px-20 py-20 bg-creative-dark relative overflow-hidden">
                    <div className="absolute -top-24 -left-20 w-96 h-96 bg-creative-purple/20 rounded-full blur-[120px] animate-pulse-slow"></div>

                    <div className="relative z-10">
                        <div className="block-reveal-container mb-4">
                            <div className="block-reveal-box bg-creative-lime"></div>
                            <span className="block-reveal-content text-creative-lime font-black tracking-[0.3em] uppercase text-sm">
                                The Future of Sustenance
                            </span>
                        </div>

                        <h1 className="text-jumbo mb-8 mt-2">
                            <div className="block-reveal-container">
                                <div className="block-reveal-box bg-creative-lime" style={{ animationDelay: '0.2s' }}></div>
                                <span className="block-reveal-content" style={{ animationDelay: '0.8s' }}>DUMP WASTE<span className="text-creative-lime">,</span></span>
                            </div>
                            <br />
                            <div className="block-reveal-container">
                                <div className="block-reveal-box bg-creative-purple" style={{ animationDelay: '0.4s' }}></div>
                                <span className="block-reveal-content text-creative-purple" style={{ animationDelay: '1.0s' }}>NOT FOOD</span>
                            </div>
                        </h1>

                        <p className="text-xl lg:text-3xl text-gray-400 font-medium max-w-2xl leading-relaxed mb-12 animate-slide-up animation-delay-700 opacity-0 fill-mode-forwards">
                            A high-precision ecosystem for hostels to decimate food wastage, optimize resources, and feed thousands more.
                        </p>

                        <div className="flex flex-wrap gap-6 animate-slide-up animation-delay-1000 opacity-0 fill-mode-forwards">
                            <Link
                                to={!user ? "/login" : (role === 'student' ? "/dashboard" : "/mess-manager")}
                                className="group relative px-16 py-8 bg-creative-lime text-creative-dark font-black text-2xl rounded-full overflow-hidden transition-all hover:scale-105 shadow-glow-primary flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center gap-4">
                                    STUDENT PORTAL
                                    <span className="group-hover:translate-x-3 transition-transform text-3xl">→</span>
                                </span>
                                <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
                            </Link>

                            <Link
                                to={!user ? "/manager/login" : (role === 'mess_manager' || role === 'super_admin' ? "/mess-manager" : "/dashboard")}
                                className="group relative px-16 py-8 border-4 border-white/10 hover:border-creative-purple bg-white/5 backdrop-blur-xl rounded-full overflow-hidden text-2xl font-black transition-all hover:scale-105 flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center gap-4">
                                    MANAGER LOGIN
                                    <span className="group-hover:translate-x-3 transition-transform tracking-widest text-3xl">{'>>'}</span>
                                </span>
                                <div className="absolute inset-0 bg-creative-purple transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                            </Link>
                        </div>

                        <div className="mt-16 animate-fade-in animation-delay-1000 opacity-0 fill-mode-forwards">
                            <Link to="/vision-protocol" className="inline-flex items-center gap-4 text-[11px] font-black tracking-[0.6em] text-white/30 hover:text-creative-lime transition-all group">
                                <span className="w-12 h-[1px] bg-white/10 group-hover:w-20 group-hover:bg-creative-lime transition-all"></span>
                                VIEW OUR VISION
                                <span className="w-12 h-[1px] bg-white/10 group-hover:w-20 group-hover:bg-creative-lime transition-all"></span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right side: Contents / Image (As requested) */}
                <div className="lg:col-span-4 bg-creative-gray border-l border-white/5 p-12 lg:p-20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(#84cc16 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    />

                    <div className="relative z-10">
                        <h2 className="text-4xl font-display font-black mb-16 tracking-tight">Contents</h2>
                        <ul className="space-y-12">
                            {navItems.map((item, idx) => (
                                <li key={item.id} className="group cursor-pointer relative">
                                    {/* Hover Tooltip (Cool Words) */}
                                    <div className="absolute left-0 -top-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                                        <span className="text-[10px] font-black tracking-[.4em] text-creative-lime uppercase bg-creative-dark py-1 px-3 border border-creative-lime/30 rounded-full shadow-lg">
                                            {item.id === '01' && 'Decode the Crisis'}
                                            {item.id === '02' && 'See the Truth'}
                                            {item.id === '03' && 'Unlock Intelligent Tech'}
                                            {item.id === '04' && 'Join the Elite'}
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => contentDetails[item.id] && setSelectedDetail(contentDetails[item.id])}
                                        className="flex items-baseline gap-6 border-b border-white/10 pb-4 transition-all group-hover:border-creative-lime group-hover:translate-x-4"
                                    >
                                        <span className="text-creative-lime font-black text-xl">{item.id}</span>
                                        <span className="text-3xl lg:text-4xl font-display font-bold group-hover:text-creative-lime">{item.title}</span>
                                        {/* Hint text on the right */}
                                        <span className="ml-auto text-[10px] font-black opacity-0 group-hover:opacity-40 transition-opacity uppercase tracking-[0.3em] hidden lg:block">Click for details</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative z-10 p-8 rounded-3xl bg-white/5 backdrop-blur-3xl border border-white/10 animate-float-delayed mt-20">
                        <div className="text-creative-lime text-5xl mb-4">“</div>
                        <p className="text-xl italic text-gray-300 leading-relaxed mb-6">
                            "Sustainability is no longer about doing less harm, it's about doing more good."
                        </p>
                        <div className="items-center flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-creative-purple flex items-center justify-center font-black">AD</div>
                            <div>
                                <div className="font-bold">Anna Dhir</div>
                                <div className="text-sm opacity-50">Impact Officer @ HFWR</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Vision Modal Overlay */}
            {selectedDetail && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-20 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-creative-dark/80 backdrop-blur-xl animate-fade-in"
                        onClick={() => setSelectedDetail(null)}
                    ></div>

                    {/* Modal Card */}
                    <div className="relative w-full max-w-5xl bg-creative-gray/40 border border-white/10 rounded-[3rem] p-12 lg:p-20 backdrop-blur-3xl animate-bounce-in shadow-2xl overflow-hidden group">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-creative-lime/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-creative-purple/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>

                        <button
                            onClick={() => setSelectedDetail(null)}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5"
                        >
                            ✕
                        </button>

                        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <span className="text-creative-lime font-black tracking-widest uppercase text-sm mb-4 block">
                                    {selectedDetail.subtitle}
                                </span>
                                <h3 className="text-5xl lg:text-7xl font-display font-black leading-none mb-8">
                                    {selectedDetail.title.split(' ').map((word, i) => (
                                        <span key={i} className={i === selectedDetail.title.split(' ').length - 1 ? 'text-creative-lime' : ''}>
                                            {word}{' '}
                                        </span>
                                    ))}
                                </h3>
                                <p className="text-2xl text-gray-300 leading-relaxed mb-12">
                                    {selectedDetail.description}
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {selectedDetail.stats.map((stat, i) => (
                                        <div key={i} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold">
                                            {stat}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <Link
                                    to="/register"
                                    onClick={() => setSelectedDetail(null)}
                                    className="p-10 rounded-[2rem] bg-creative-lime text-creative-dark text-3xl font-black flex justify-between items-center group/btn hover:scale-[1.02] transition-all"
                                >
                                    GET STARTED <span className="group-hover:translate-x-4 transition-transform">→</span>
                                </Link>
                                <div className="p-10 rounded-[2rem] border-4 border-white/10 text-white text-xl font-bold">
                                    Every meal you book precisely saves approximately 0.5kg of CO2 equivalent emissions. 🌍
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bento Grid Features */}
            <section id="features" className="py-40 px-8 lg:px-20 bg-creative-dark relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-creative-purple/5 rounded-full blur-[200px] pointer-events-none"></div>

                <div className="relative z-10 mb-24 max-w-4xl animate-fade-in">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[.4em] text-creative-lime mb-8 animate-fade-in opacity-0 fill-mode-forwards">
                        System Infrastructure
                    </div>
                    <h2 className="text-6xl lg:text-[8rem] font-display font-black mb-8 leading-[0.9] tracking-tighter">
                        ENGINEERED FOR <br /> <span className="text-creative-lime">PRECISION.</span>
                    </h2>
                    <p className="text-2xl text-gray-500 max-w-2xl leading-relaxed">
                        Every interface is tuned for speed. Every byte is optimized for impact. Experience hostel management as it should be.
                    </p>
                </div>

                <div className="bento-grid" onMouseMove={(e) => {
                    const cards = e.currentTarget.querySelectorAll('.bento-card');
                    cards.forEach(card => {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        card.style.setProperty('--mouse-x', `${x}px`);
                        card.style.setProperty('--mouse-y', `${y}px`);
                    });
                }}>
                    {/* Feature 1: The Heavy Lifter */}
                    <div className="bento-card bento-purple md:col-span-3 lg:col-span-4 h-[600px] group cursor-default">
                        <div className="bento-inner-glow"></div>
                        <div className="h-full flex flex-col justify-between relative z-10">
                            <div>
                                <div className="glass-tag mb-8 inline-block">Core Module</div>
                                <h3 className="text-6xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tighter">
                                    Smart Meal <br /> Booking System
                                </h3>
                                <p className="text-xl lg:text-2xl opacity-70 max-w-lg leading-relaxed font-medium">
                                    Total elimination of guesswork. A refined, one-tap booking engine providing instant headcount precision for your kitchen staff.
                                </p>
                            </div>

                            <div className="flex items-center gap-8 border-t border-white/10 pt-10">
                                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
                                    🍱
                                </div>
                                <div>
                                    <div className="text-sm font-black uppercase tracking-widest text-creative-lime mb-1">Efficiency Boost</div>
                                    <div className="text-3xl font-black italic">+84% Productivity</div>
                                </div>
                            </div>
                        </div>
                        {/* Interactive floating element */}
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000"></div>
                    </div>

                    {/* Feature 2: High Impact Precision */}
                    <div className="bento-card bento-lime md:col-span-1 lg:col-span-2 h-[600px] flex flex-col justify-between group cursor-default">
                        <div className="bento-inner-glow"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="glass-tag !bg-black/10 !border-black/10 inline-block mb-12">Accuracy Rank</div>
                                <div className="text-9xl lg:text-[10rem] font-black mb-4 tracking-tighter group-hover:scale-105 transition-transform duration-700">98%</div>
                                <h3 className="text-4xl font-black leading-tight">Precision <br /> Reliability.</h3>
                            </div>
                            <p className="text-lg font-bold opacity-80 leading-snug">
                                State-of-the-art algorithms that decimate over-preparation errors to negligible levels.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3: Real-time Analytics */}
                    <div className="bento-card bento-dark md:col-span-2 lg:col-span-2 h-[450px] group cursor-default">
                        <div className="bento-inner-glow"></div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="w-16 h-16 bg-creative-lime/10 border border-creative-lime/20 rounded-2xl flex items-center justify-center text-creative-lime text-3xl mb-8 group-hover:rotate-12 transition-all duration-500">
                                📊
                            </div>
                            <div>
                                <h3 className="text-4xl font-black mb-4 tracking-tight">Live Pulse Analytics</h3>
                                <p className="text-xl text-gray-500 leading-relaxed">
                                    Track wastage heatmaps and environmental impact scores with zero-latency synchronization.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 4: NGO Connectivity */}
                    <div className="bento-card bento-ghost md:col-span-2 lg:col-span-2 h-[450px] group cursor-default">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="w-16 h-16 bg-creative-purple/10 border border-creative-purple/20 rounded-2xl flex items-center justify-center text-creative-purple text-3xl mb-8 group-hover:-rotate-12 transition-all duration-500">
                                🤝
                            </div>
                            <div>
                                <h3 className="text-4xl font-black mb-4 tracking-tight">Hyper-Local NGO Connect</h3>
                                <p className="text-xl text-[#888] leading-relaxed">
                                    Automated dispatch systems that bridge the gap between surplus and those in need within minutes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Feature 5: Economic Impact */}
                    <div className="bento-card bento-dark md:col-span-4 lg:col-span-2 h-[450px] group flex items-center justify-center bg-gradient-to-br from-[#0D0D0D] to-[#141414] overflow-hidden">
                        <div className="bento-inner-glow"></div>
                        <div className="text-center group-hover:scale-110 transition-transform duration-700 relative z-10">
                            <div className="text-8xl mb-6 animate-float-delayed">💰</div>
                            <h3 className="text-3xl font-black tracking-tighter">SAVE LAKHS <br /> ANNUALLY</h3>
                            <div className="mt-4 glass-tag">Economic Optimization</div>
                        </div>
                        {/* Decorative grid for professional look */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    </div>
                </div>
            </section>

            {/* High Impact Comparison Section */}
            <section className="py-32 px-8 lg:px-20 bg-gradient-to-b from-creative-dark to-black overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center mb-20">
                        <div>
                            <div className="glass-tag mb-8 inline-block !text-creative-lime">Impact Visualization</div>
                            <h2 className="text-6xl lg:text-[7rem] font-display font-black leading-[0.9] mb-8 tracking-tighter">
                                SEE THE <span className="text-creative-lime underline decoration-8 decoration-creative-lime/20">TRUTH.</span>
                            </h2>
                            <p className="text-2xl text-gray-400 leading-relaxed mb-12 font-medium">
                                Traditional hostel kitchens bleed up to 40% of their daily output due to guesswork. Our data-driven model reverses this in weeks.
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="group flex items-center gap-6 p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-red-500/50 transition-all duration-500">
                                    <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform">!</div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-[.3em] opacity-40 mb-1">Status Quo</div>
                                        <div className="text-2xl font-bold">Blind Batch Preparation</div>
                                    </div>
                                </div>
                                <div className="group flex items-center gap-6 p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-creative-lime/50 transition-all duration-500">
                                    <div className="w-14 h-14 bg-creative-lime/10 text-creative-lime rounded-full flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform">✓</div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-[.3em] text-creative-lime mb-1">Our Solution</div>
                                        <div className="text-2xl font-bold">Algorithmic Demand Splicing</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative group">
                            <ComparisonSlider />
                            {/* Decorative architectural frame */}
                            <div className="absolute -inset-8 border border-white/10 rounded-[4rem] pointer-events-none group-hover:border-creative-lime/20 transition-colors duration-1000"></div>
                            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-creative-lime rounded-tl-2xl"></div>
                            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-creative-lime rounded-br-2xl"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ticker Stats Band (High Energy Creative Marquee) */}
            <section className="py-12 bg-creative-lime overflow-hidden relative group/ticker">
                <div className="absolute inset-0 bg-black/5 mix-blend-overlay"></div>
                <div className="ticker-scanline"></div>
                <div className="marquee-container -rotate-1 scale-105">
                    {[1, 2].map(i => (
                        <div key={i} className="marquee-content text-8xl lg:text-9xl font-black italic tracking-tight text-creative-dark items-center leading-none">
                            <span className="text-chromatic">ZERO WASTE</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">PRECISION FEEDING</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">ECO POWER</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">SAVE MONEY</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">CIRCULAR ECONOMY</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">SUSTAINABLE FUTURE</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">CARBON NEUTRAL</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">LOGISTICS SYNC</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">RESOURCE OPTIMIZATION</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                            <span className="text-chromatic">IMPACT DRIVEN</span>
                            <span className="separator-glitch text-4xl lg:text-7xl mx-8">//</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Journey Section */}
            <section id="stats" className="py-32 px-8 lg:px-20 relative overflow-hidden">
                {/* Section Background Decoration */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-creative-purple/5 rounded-full blur-[200px] -mr-96 -mt-96 pointer-events-none"></div>

                <div className="text-center mb-20 relative z-10">
                    <div className="glass-tag mb-8 inline-block !text-creative-lime">Mission Roadmap</div>
                    <h2 className="text-5xl lg:text-7xl font-black mb-8 tracking-tighter uppercase italic">
                        THE EVOLUTION TO <br />
                        <span className="text-creative-lime">ZERO WASTE.</span>
                    </h2>
                    <JourneyPath />
                </div>

            </section>

            {/* Testimonials Overflow (Premium Refine) */}
            <section className="py-40 bg-creative-gray/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                <div className="px-8 lg:px-20 grid lg:grid-cols-12 gap-16 items-start">
                    <div className="lg:col-span-8">
                        <div className="glass-tag mb-8 inline-block !text-creative-purple">Community Impact</div>
                        <h2 className="text-7xl lg:text-[10rem] font-black leading-[0.85] mb-12 tracking-tighter opacity-10">THEY <br /> LOVE IT.</h2>
                        <div className="p-16 lg:p-24 rounded-[4rem] bg-creative-purple text-white relative overflow-hidden group shadow-2xl">
                            <div className="absolute -right-20 -top-20 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-1000"></div>
                            <div className="relative z-10">
                                <div className="text-8xl lg:text-9xl font-serif leading-none mb-10 opacity-30 italic">“</div>
                                <h3 className="text-4xl lg:text-5xl font-black mb-16 leading-[1.1] tracking-tight">
                                    "THE ENERGY HERE IS INCREDIBLE. OUR MESS MANAGEMENT DRAMATICALLY SHIFTED FROM INEFFICIENCY TO ABSOLUTE PRECISION!"
                                </h3>
                                <div className="flex items-center gap-8">
                                    <div className="relative">
                                        <img src="https://i.pravatar.cc/200?u=1" className="w-24 h-24 rounded-[2rem] object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Testimonial" />
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-creative-lime rounded-full border-4 border-creative-purple flex items-center justify-center text-xs">✓</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black uppercase tracking-tighter">Rahul Sharma</div>
                                        <div className="text-lg font-bold opacity-60">Student Union Head, IITB</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-4 space-y-8 lg:pt-40">
                        <div className="p-10 rounded-[3rem] border-4 border-creative-lime/30 text-creative-lime group hover:bg-creative-lime hover:text-creative-dark transition-all duration-500 cursor-default">
                            <p className="text-2xl font-bold mb-6 italic leading-relaxed">"Finally a system that respects the food we eat and the work we put in."</p>
                            <span className="font-black text-sm uppercase tracking-widest">— MESS MANAGER S.K (BOMBAY)</span>
                        </div>
                        <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 group hover:border-creative-purple transition-all duration-500 cursor-default">
                            <p className="text-2xl font-bold mb-6 italic leading-relaxed text-gray-400 group-hover:text-white transition-colors">"The UI is cleaner than my room during inspection week. Truly peak UX."</p>
                            <span className="font-black text-sm uppercase tracking-widest text-creative-purple">— ADITYA V. (3RD YEAR)</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Premium Revolution CTA */}
            <section className="py-60 px-8 relative overflow-hidden flex items-center justify-center bg-black">
                {/* Advanced Noise/Mesh background */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.2),_transparent_70%)]"></div>
                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] animate-spin-slow opacity-10 pointer-events-none" style={{ background: 'conic-gradient(from 180deg at 50% 50%, #8b5cf6 0deg, #a3e635 120deg, #8b5cf6 240deg, #a3e635 360deg)' }}></div>

                <div className="relative z-10 text-center max-w-6xl">
                    <div className="glass-tag mb-12 inline-block !bg-white/10 !text-white animate-bounce-in">Final Opportunity</div>
                    <h2 className="text-8xl lg:text-[12rem] font-display font-black leading-[0.8] mb-16 tracking-tighter">
                        JOIN THE <br />
                        <span className="text-creative-lime inline-block hover:scale-110 transition-transform duration-700 cursor-default drop-shadow-[0_0_30px_rgba(163,230,53,0.3)]">REVOLUTION.</span>
                    </h2>
                    <p className="text-2xl lg:text-3xl text-gray-400 mb-20 max-w-3xl mx-auto font-medium leading-relaxed">
                        Sustainability isn't a solo mission. By joining ZeroBite, you become part of a network of 5,000+ eco-ninjas dedicated to making food waste history. Your profile tracks your individual contribution and rewards your consistency.
                    </p>
                    <Link to="/register" className="group relative px-20 py-10 bg-creative-lime text-creative-dark font-black text-4xl rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all inline-block shadow-[0_20px_60px_-15px_rgba(163,230,53,0.5)] overflow-hidden button-shine">
                        <span className="relative z-10 flex items-center gap-6">
                            GET STARTED <span className="group-hover:translate-x-4 transition-transform">→</span>
                        </span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-32 px-8 lg:px-20 border-t border-white/5 bg-black text-gray-500 relative">
                <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-20">
                    <div className="md:col-span-4">
                        <Link to="/" className="text-5xl font-black text-white mb-10 block font-display tracking-tightest">ZeroBite<span className="text-creative-lime">.</span></Link>
                        <p className="text-xl max-w-sm leading-relaxed mb-12 font-medium">
                            Engineering a future where zero food waste is the baseline for every student kitchen worldwide.
                        </p>
                        <div className="flex gap-4">
                            {['𝕏', '📸', 'in'].map((social, idx) => (
                                <div key={idx} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-creative-lime hover:text-creative-dark hover:-translate-y-2 transition-all cursor-pointer font-black text-xl">
                                    {social}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-12">
                        <div>
                            <h4 className="text-white font-black uppercase tracking-[.3em] text-xs mb-10 opacity-30">Platform</h4>
                            <ul className="space-y-6 text-xl font-bold">
                                <li><Link to="/vision-protocol" className="hover:text-creative-lime transition-all">Our Vision</Link></li>
                                <li><Link to="/features" className="hover:text-creative-lime transition-all">Infrastructure</Link></li>
                                <li><Link to="/vision-protocol" className="hover:text-creative-lime transition-all">Impact Report</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-[.3em] text-xs mb-10 opacity-30">Resources</h4>
                            <ul className="space-y-6 text-xl font-bold">
                                <li><Link to="/docs" className="hover:text-creative-purple transition-all">Documentation</Link></li>
                                <li><Link to="/api" className="hover:text-creative-purple transition-all">API Access</Link></li>
                                <li><Link to="/support" className="hover:text-creative-purple transition-all">Support</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-white/5 flex flex-col md:row justify-between items-center gap-8">
                    <div className="text-sm font-black tracking-widest uppercase opacity-20">© 2024 ZEROBITE INFRASTRUCTURE INC.</div>
                    <div className="flex gap-12 text-sm font-black tracking-widest uppercase opacity-20">
                        <span className="hover:opacity-100 cursor-pointer">Privacy</span>
                        <span className="hover:opacity-100 cursor-pointer">Terms</span>
                        <span className="hover:opacity-100 cursor-pointer">Security</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
