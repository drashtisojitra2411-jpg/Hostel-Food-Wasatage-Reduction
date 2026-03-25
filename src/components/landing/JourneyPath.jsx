import React from 'react';

export default function JourneyPath() {
    const steps = [
        {
            id: '01',
            status: 'CRITICAL',
            label: 'INEFFICIENCY',
            desc: 'Systemic waste across uncoordinated dining halls.',
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: '02',
            status: 'ACTIVE',
            label: 'SYNCHRONIZATION',
            desc: 'Real-time data ingestion and demand forecasting.',
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        },
        {
            id: '03',
            status: 'OPTIMIZING',
            label: 'PRECISION FEED',
            desc: 'Algorithmic batching and portion calibration.',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: '04',
            status: 'STABLE',
            label: 'ZERO BITE',
            desc: 'Absolute resource efficiency and circular logistics.',
            color: 'text-creative-lime',
            bg: 'bg-creative-lime/10',
            border: 'border-creative-lime/20'
        }
    ];

    return (
        <div className="w-full py-20 relative select-none">
            {/* Background Structural Line */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 hidden lg:block"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                {steps.map((step, idx) => (
                    <div key={step.id} className="group relative">
                        {/* 3D Card Effect */}
                        <div className={`p-10 rounded-[2.5rem] bg-black border-2 ${step.border} transition-all duration-700 hover:-translate-y-6 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group-hover:border-white/20`}>
                            {/* Decorative ID Background */}
                            <span className="absolute -right-4 -bottom-4 text-9xl font-black opacity-[0.03] group-hover:opacity-[0.07] transition-opacity italic">
                                {step.id}
                            </span>

                            {/* Status Pill */}
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${step.bg} ${step.color} text-[10px] font-black tracking-[0.3em] mb-8 border ${step.border}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                {step.status}
                            </div>

                            {/* Label & Description */}
                            <h3 className="text-3xl font-black mb-6 tracking-tighter leading-none italic uppercase">
                                {step.label}
                            </h3>
                            <p className="text-sm font-medium text-white/40 leading-relaxed uppercase tracking-wider group-hover:text-white transition-colors duration-500 italic">
                                {step.desc}
                            </p>

                            {/* Connection Indicator (Mobile Hidden) */}
                            {idx < steps.length - 1 && (
                                <div className="absolute top-1/2 -right-4 w-8 h-px bg-white/10 z-20 hidden lg:block group-hover:w-12 group-hover:bg-white/30 transition-all"></div>
                            )}
                        </div>

                        {/* Step Marker */}
                        <div className="hidden lg:flex absolute -top-12 left-1/2 -translate-x-1/2 flex-col items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${step.bg} border-2 ${step.border} group-hover:scale-150 transition-transform duration-500`}></div>
                            <div className="w-px h-8 bg-gradient-to-b from-white/10 to-transparent"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
