import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import api from '../../lib/api';

export default function Stock() {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ item_name: '', quantity: '', unit: 'kg', reorder_level: '' });

    useEffect(() => {
        fetchStock();
    }, []);

    async function fetchStock() {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/api/inventory');
            setStock(Array.isArray(data) ? data : []);
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data');
            setStock([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError('');
        try {
            await api.post('/api/inventory', {
                item_name: form.item_name,
                quantity: Number(form.quantity || 0),
                unit: form.unit,
                reorder_level: Number(form.reorder_level || 0),
                max_stock_level: Math.max(Number(form.quantity || 0), Number(form.reorder_level || 0) * 2),
                status: 'in_stock'
            });
            setForm({ item_name: '', quantity: '', unit: 'kg', reorder_level: '' });
            await fetchStock();
        } catch (submitError) {
            setError(submitError.message || 'Operation failed');
        }
    }

    async function adjustStock(item, quantity) {
        setError('');
        const nextQty = Number(quantity);
        if (!Number.isFinite(nextQty) || nextQty < 0) return;
        try {
            await api.put(`/api/inventory/${item.id}`, { quantity: nextQty });
            await fetchStock();
        } catch (submitError) {
            setError(submitError.message || 'Operation failed');
        }
    }

    async function removeItem(id) {
        setError('');
        try {
            await api.delete(`/api/inventory/${id}`);
            await fetchStock();
        } catch (submitError) {
            setError(submitError.message || 'Operation failed');
        }
    }

    return (
        <AdminLayout title="Stock Management">
            {error ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-300">{error}</div> : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <form onSubmit={handleCreate} className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} required placeholder="Ingredient name" className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                    <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required placeholder="Quantity" className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                    <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required placeholder="Unit" className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                    <input type="number" min="0" step="0.01" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} required placeholder="Threshold" className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                    <button type="submit" className="bg-creative-lime text-black rounded-xl text-sm font-black">Add Ingredient</button>
                </form>
                <button className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-left">Low Stock Alerts: {stock.filter((s) => Number(s.quantity || 0) <= Number(s.reorder_level || 0)).length}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stock.map((s) => {
                    const threshold = Number(s.reorder_level || 0);
                    const pct = Math.max(5, Math.min(100, threshold > 0 ? (Number(s.quantity || 0) / (threshold * 2)) * 100 : 0));
                    const low = Number(s.quantity || 0) <= threshold;
                    return (
                        <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex justify-between"><p className="font-black">{s.item_name}</p><p className="text-sm">{s.quantity} {s.unit}</p></div>
                            <div className="w-full h-2 bg-white/10 rounded-full mt-3 overflow-hidden"><div className={`h-full ${low ? 'bg-red-400' : 'bg-creative-lime'}`} style={{ width: `${pct}%` }}></div></div>
                            <p className={`text-xs mt-2 ${low ? 'text-red-300' : 'text-white/50'}`}>Threshold: {threshold} {s.unit}</p>
                            <div className="mt-3 flex gap-2">
                                <input type="number" min="0" step="0.01" defaultValue={s.quantity} onBlur={(e) => adjustStock(s, e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs" />
                                <button type="button" onClick={() => removeItem(s.id)} className="text-xs px-2 py-1 bg-red-500/20 rounded">Remove</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <DataTable
                columns={[{ key: 'item_name', label: 'Ingredient' }, { key: 'quantity', label: 'Quantity' }, { key: 'unit', label: 'Unit' }, { key: 'updated_at', label: 'Last Updated' }, { key: 'reorder_level', label: 'Alert Threshold' }]}
                rows={stock}
                emptyMessage={loading ? 'Loading...' : 'No data available'}
            />
        </AdminLayout>
    );
}
