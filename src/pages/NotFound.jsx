import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography overflow-hidden flex items-center justify-center p-8">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-creative-lime/5 blur-[200px] rounded-full pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

            <div className="relative z-10 text-center space-y-12 max-w-4xl">
                <div className="animate-fade-in">
                    <div className="inline-block px-4 py-1.5 border border-red-500/20 bg-red-500/5 rounded-full text-[9px] font-black uppercase tracking-[0.4em] mb-12 text-red-500 animate-pulse">
                        CRITICAL SYSTEM EXCEPTION // 404
                    </div>

                    <h1 className="text-[18vw] lg:text-[14vw] font-black tracking-[-0.08em] leading-[0.75] italic uppercase select-none">
                        NODE<br />
                        <span className="text-creative-lime">LOST.</span>
                    </h1>
                </div>

                <div className="space-y-12 animate-slide-up animation-delay-300">
                    <p className="text-[10px] md:text-xs font-black text-white/40 tracking-[0.25em] uppercase italic max-w-2xl mx-auto leading-[2]">
                        The requested temporal coordinate does not exist in the<br className="hidden md:block" />
                        current operational matrix. Access terminated.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center pt-8">
                        <Link to="/">
                            <Button variant="primary" className="px-16 py-8 text-[11px] tracking-[0.4em] font-black">RESYNC SYSTEM</Button>
                        </Link>
                    </div>
                </div>

                {/* Footer Telemetry */}
                <div className="fixed bottom-12 left-0 w-full text-center opacity-20 flex flex-col gap-3 pointer-events-none">
                    <div className="text-[9px] font-black tracking-[0.4em] uppercase">Error_Code: @X404_RES_NOT_FOUND</div>
                    <div className="text-[9px] font-black tracking-[0.4em] uppercase">Sector: Global_Campus_Matrix</div>
                </div>
            </div>
        </div>
    );
}
