import React, { useEffect, useState } from 'react';
import Navigation from '../../components/layout/Navigation';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Notification from '../../components/common/Notification';
import api from '../../lib/api';

export default function Donations() {
    const [loading, setLoading] = useState(true);
    const [donations, setDonations] = useState([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
    const [form, setForm] = useState({ item_name: '', quantity_kg: '', servings: '', pickup_location: '' });

    useEffect(() => {
        fetchDonations();
    }, []);

    async function fetchDonations() {
        setLoading(true);
        try {
            const data = await api.get('/api/donations');
            setDonations(Array.isArray(data) ? data : []);
        } catch (error) {
            setDonations([]);
            setNotification({ show: true, message: error.message || 'Failed to fetch data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    async function handleDonationSubmit(e) {
        e.preventDefault();
        try {
            await api.post('/api/donations', {
                food_items: [{ name: form.item_name, quantity: Number(form.quantity_kg || 0), unit: 'kg' }],
                total_quantity_kg: Number(form.quantity_kg || 0),
                estimated_servings: Number(form.servings || 0),
                pickup_location: form.pickup_location || null
            });
            setForm({ item_name: '', quantity_kg: '', servings: '', pickup_location: '' });
            setNotification({ show: true, message: 'Donation created', type: 'success' });
            await fetchDonations();
        } catch (error) {
            setNotification({ show: true, message: error.message || 'Operation failed', type: 'error' });
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black italic-typography">
            <Navigation />
            <Notification isVisible={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />

            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10 space-y-12">
                    <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] italic uppercase">SHARE THE<br /><span className="text-creative-lime">SURPLUS.</span></h1>

                    <Card variant="premium" className="p-12">
                        <h2 className="text-3xl font-black tracking-tighter italic uppercase mb-8 text-creative-lime">Initialize Donation</h2>
                        <form onSubmit={handleDonationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-widest" placeholder="Food item" required />
                            <input type="number" min="0" step="0.01" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-widest" placeholder="Quantity (kg)" required />
                            <input type="number" min="0" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-widest" placeholder="Estimated servings" />
                            <input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-widest" placeholder="Pickup location" />
                            <div className="md:col-span-4">
                                <Button type="submit" variant="primary" className="w-full py-6 text-[10px]">CREATE DONATION</Button>
                            </div>
                        </form>
                    </Card>

                    <Card variant="glass" className="p-8 border-white/5">
                        <h3 className="text-2xl font-black tracking-tighter italic uppercase mb-6">Live Donation Records</h3>
                        {loading ? (
                            <div className="text-white/40 text-sm">Loading...</div>
                        ) : donations.length === 0 ? (
                            <div className="text-white/40 text-sm">No data available</div>
                        ) : (
                            <div className="space-y-3">
                                {donations.map((donation) => (
                                    <div key={donation.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <p className="text-sm font-black uppercase">{donation.hostel_name || 'Hostel'}</p>
                                        <p className="text-xs text-white/50 mt-1">{donation.total_quantity_kg} kg | {donation.status}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </main>
        </div>
    );
}
