import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        // JavaScript Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            return setError('Email address is required');
        }
        if (!emailRegex.test(email)) {
            return setError('Please enter a valid email address');
        }

        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography overflow-hidden flex items-center justify-center p-8 relative">
            {/* Architectural Background */}
            <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-creative-purple/5 blur-[180px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-creative-lime/5 blur-[150px] rounded-full pointer-events-none" />

            {/* Decorative Background Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
                <h1 className="text-[40vw] font-black italic tracking-tighter leading-none">RESET</h1>
            </div>

            <div className="w-full max-w-xl relative z-10">
                <Card variant="premium" className="p-12 border-white/5 bg-black/40 backdrop-blur-3xl animate-fade-in">
                    {/* Header - Recovery Mode */}
                    <div className="text-center mb-16 space-y-4">
                        <div className="inline-block px-4 py-1.5 border border-creative-purple/30 bg-creative-purple/5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] text-creative-purple animate-pulse">
                            IDENTITY RECOVERY PROTOCOL
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter italic uppercase text-white">RECOVER.</h2>
                        <p className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase italic">
                            {success ? 'Link deployed to your communication channel.' : 'Re-establish access to the operational matrix.'}
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center space-y-10 animate-bounce-in">
                            <div className="w-24 h-24 mx-auto border border-creative-lime/30 bg-creative-lime/10 rounded-3xl flex items-center justify-center">
                                <svg className="w-10 h-10 text-creative-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-black italic tracking-tighter uppercase">DEPLOYMENT SUCCESSFUL</h3>
                                <p className="text-[10px] font-black text-white/40 tracking-widest uppercase italic max-w-xs mx-auto leading-loose">
                                    A synchronization link has been dispatched to <span className="text-white">{email}</span>. Check your terminal.
                                </p>
                            </div>
                            <div className="pt-8">
                                <Link to="/login">
                                    <Button variant="primary" className="w-full py-8 text-[10px] tracking-[0.4em]">RETURN TO LOGIN</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-10">
                            {error && (
                                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest italic animate-shake">
                                    EXCEPTION: {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-4">Credential Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-6 px-8 text-xs font-black uppercase tracking-widest focus:border-creative-purple outline-none transition-all"
                                    placeholder="IDENTIFY@MATRIX.COM"
                                    required
                                />
                            </div>

                            <div className="space-y-6 pt-4">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full py-8 text-[10px] tracking-[0.4em]"
                                    disabled={loading}
                                >
                                    {loading ? 'DEPLOYING LINK...' : 'INITIATE RECOVERY'}
                                </Button>

                                <div className="text-center pt-8">
                                    <Link to="/login" className="text-[10px] font-black text-white/20 hover:text-white tracking-[0.5em] uppercase italic transition-colors flex items-center justify-center gap-4 group">
                                        <svg className="w-4 h-4 group-hover:-translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        TERMINATE & RETURN
                                    </Link>
                                </div>
                            </div>
                        </form>
                    )}
                </Card>

                {/* Footer Telemetry */}
                <div className="mt-12 text-center opacity-10 flex flex-col gap-2 pointer-events-none uppercase">
                    <div className="text-[8px] font-mono tracking-[0.5em]">Auth_Sync: Active // Sector: Recovery</div>
                </div>
            </div>
        </div>
    );
}
