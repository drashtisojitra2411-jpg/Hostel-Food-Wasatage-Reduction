export default function ChartPanel({ title, children, className = '' }) {
    return (
        <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 ${className}`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/70 mb-4">{title}</h3>
            <div className="h-72 w-full">{children}</div>
        </div>
    );
}
