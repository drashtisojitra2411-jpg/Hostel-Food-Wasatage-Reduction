export default function SettingsPanel({ title, description = '', children }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-white/80">{title}</h3>
            {description ? <p className="text-sm text-white/50 mt-1 mb-5">{description}</p> : <div className="mb-5"></div>}
            {children}
        </div>
    );
}
