export default function MetricCard({ label, value, accent = 'text-white', helper = '' }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
            <p className={`text-2xl font-black ${accent}`}>{value}</p>
            {helper ? <p className="text-xs text-white/45 mt-2">{helper}</p> : null}
        </div>
    );
}
