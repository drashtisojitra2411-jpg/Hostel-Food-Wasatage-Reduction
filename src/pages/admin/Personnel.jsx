import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import api from '../../lib/api';

export default function Personnel() {
    const [rows, setRows] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'chef', hostel_id: '' });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError('');
        try {
            const [usersRes, hostelsRes] = await Promise.all([
                api.get('/api/admin/users'),
                api.get('/api/admin/hostels')
            ]);
            setRows(Array.isArray(usersRes) ? usersRes : []);
            const hostelRows = Array.isArray(hostelsRes) ? hostelsRes : [];
            setHostels(hostelRows);
            if (hostelRows.length > 0 && !form.hostel_id) {
                setForm((prev) => ({ ...prev, hostel_id: hostelRows[0].id }));
            }
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to fetch data');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    const filtered = useMemo(() => rows.filter((r) => {
        const matchQuery = [r.name, r.email, r.hostel_name].join(' ').toLowerCase().includes(query.toLowerCase());
        const normalizedRole = String(r.role || '').replace('_', ' ').toLowerCase();
        const matchRole = roleFilter === 'All' || normalizedRole === roleFilter.toLowerCase();
        return matchQuery && matchRole;
    }), [rows, query, roleFilter]);

    async function handleCreate(e) {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post('/api/admin/users', form);
            setSuccess('User added successfully');
            setForm({ full_name: '', email: '', password: '', role: 'chef', hostel_id: form.hostel_id });
            await fetchData();
        } catch (submitError) {
            setError(submitError.message || 'Operation failed');
        }
    }

    async function handleDisableToggle(row) {
        setError('');
        setSuccess('');
        try {
            if (row.is_active) {
                await api.delete(`/api/admin/users/${row.id}`);
                setSuccess('User disabled');
            } else {
                await api.put(`/api/admin/users/${row.id}`, { is_active: true });
                setSuccess('User enabled');
            }
            await fetchData();
        } catch (submitError) {
            setError(submitError.message || 'Operation failed');
        }
    }

    return (
        <AdminLayout title="Personnel Management">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">Total Personnel: {rows.length}</div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">Active: {rows.filter((r) => r.is_active).length}</div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">Disabled: {rows.filter((r) => !r.is_active).length}</div>
            </div>

            {error ? <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-300">{error}</div> : null}
            {success ? <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3 text-sm text-green-300">{success}</div> : null}

            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white/5 border border-white/10 rounded-3xl p-4">
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" required className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" required className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" required className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm">
                    <option value="chef">Chef</option>
                    <option value="ngo">NGO</option>
                    <option value="hostel_admin">Hostel Admin</option>
                    <option value="mess_manager">Mess Manager</option>
                </select>
                <button type="submit" className="bg-creative-lime text-black rounded-xl px-3 py-2 text-sm font-black">Add Personnel</button>
                <div className="md:col-span-2">
                    <select value={form.hostel_id} onChange={(e) => setForm({ ...form, hostel_id: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm">
                        <option value="">Unassigned Hostel</option>
                        {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                </div>
            </form>

            <DataTable
                columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'role', label: 'Role' },
                    { key: 'email', label: 'Email' },
                    { key: 'hostel_name', label: 'Assigned Hostel' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: 'Actions' }
                ]}
                rows={filtered}
                emptyMessage={loading ? 'Loading...' : 'No data available'}
                toolbar={
                    <div className="flex flex-col md:flex-row gap-3">
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm flex-1" />
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm">
                            <option>All</option>
                            <option>Chef</option>
                            <option>NGO</option>
                            <option>Hostel Admin</option>
                            <option>Mess Manager</option>
                        </select>
                    </div>
                }
                renderCell={(row, key) => {
                    if (key === 'role') return toDisplayRole(row.role);
                    if (key === 'status') return <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${row.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-300'}`}>{row.is_active ? 'Active' : 'Disabled'}</span>;
                    if (key === 'actions') return <div className="flex gap-2"><button onClick={() => handleDisableToggle(row)} className="text-xs px-2 py-1 bg-white/10 rounded">{row.is_active ? 'Disable' : 'Enable'}</button></div>;
                    return row[key];
                }}
            />
        </AdminLayout>
    );
}

function toDisplayRole(role = '') {
    return String(role).replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
