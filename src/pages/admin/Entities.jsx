import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../lib/api';

function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-xl bg-black border border-white/10 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-black uppercase tracking-widest text-white/80">{title}</h3>
                    <button type="button" className="text-white/40 hover:text-white" onClick={onClose}>X</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function Entities() {
    const [hostels, setHostels] = useState([]);
    const [chefs, setChefs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [openAdd, setOpenAdd] = useState(false);
    const [openCapacity, setOpenCapacity] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);

    const [addForm, setAddForm] = useState({ name: '', code: '', capacity: '', location: '' });
    const [capacityForm, setCapacityForm] = useState({ hostelId: '', capacity: '' });
    const [assignForm, setAssignForm] = useState({ chefId: '', hostelId: '' });

    const activeHostels = useMemo(() => hostels, [hostels]);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        setError('');
        try {
            const [hostelRes, chefRes] = await Promise.allSettled([
                api.get('/api/admin/hostels'),
                api.get('/api/admin/users?role=chef')
            ]);

            if (hostelRes.status === 'fulfilled') {
                const rows = Array.isArray(hostelRes.value) ? hostelRes.value : [];
                setHostels(rows);
                if (rows.length > 0 && !capacityForm.hostelId) {
                    setCapacityForm((prev) => ({ ...prev, hostelId: rows[0].id }));
                }
                if (rows.length > 0 && !assignForm.hostelId) {
                    setAssignForm((prev) => ({ ...prev, hostelId: rows[0].id }));
                }
            } else {
                setHostels([]);
                setError('Failed to fetch data');
            }

            if (chefRes.status === 'fulfilled') {
                const rows = Array.isArray(chefRes.value) ? chefRes.value : [];
                setChefs(rows);
                if (rows.length > 0 && !assignForm.chefId) {
                    setAssignForm((prev) => ({ ...prev, chefId: rows[0].id }));
                }
            } else {
                setChefs([]);
            }
        } catch {
            setError('Failed to load entities data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddHostel = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/api/admin/hostels', {
                name: addForm.name,
                code: addForm.code,
                capacity: Number(addForm.capacity || 0),
                location: addForm.location
            });
            setSuccess('Hostel created successfully');
            setOpenAdd(false);
            setAddForm({ name: '', code: '', capacity: '', location: '' });
            await refreshData();
        } catch (submitError) {
            setError(submitError.message || 'Failed to create hostel');
        }
    };

    const handleUpdateCapacity = async (e) => {
        e.preventDefault();
        if (!capacityForm.hostelId) {
            setError('Please select a hostel');
            return;
        }
        setError('');
        try {
            await api.put(`/api/admin/hostels/${capacityForm.hostelId}/capacity`, {
                capacity: Number(capacityForm.capacity || 0)
            });
            setSuccess('Hostel capacity updated successfully');
            setOpenCapacity(false);
            setCapacityForm((prev) => ({ ...prev, capacity: '' }));
            await refreshData();
        } catch (submitError) {
            setError(submitError.message || 'Failed to update hostel capacity');
        }
    };

    const handleAssignChef = async (e) => {
        e.preventDefault();
        if (!assignForm.chefId || !assignForm.hostelId) {
            setError('Please select both chef and hostel');
            return;
        }
        setError('');
        try {
            await api.put('/api/admin/assign-chef', {
                chefId: assignForm.chefId,
                hostelId: assignForm.hostelId
            });
            setSuccess('Chef assigned to hostel');
            setOpenAssign(false);
            await refreshData();
        } catch (submitError) {
            setError(submitError.message || 'Failed to assign chef');
        }
    };

    return (
        <AdminLayout title="Entities Management">
            {success ? (
                <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-2xl px-4 py-3 text-sm">
                    {success}
                </div>
            ) : null}
            {error ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setOpenAdd(true)} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left hover:border-creative-lime/40">Add New Hostel</button>
                <button onClick={() => setOpenCapacity(true)} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left hover:border-creative-lime/40">Edit Hostel Capacity</button>
                <button onClick={() => setOpenAssign(true)} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left hover:border-creative-lime/40">Assign Chef to Hostel</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeHostels.map((h, idx) => (
                    <div key={h.id || idx} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <h3 className="text-xl font-black uppercase tracking-tight">{h.name}</h3>
                        <p className="text-sm text-white/60 mt-1">Assigned Chef: {h.assigned_chef || 'Unassigned'}</p>
                        <div className="grid grid-cols-2 gap-4 mt-5">
                            <div><p className="text-[10px] text-white/40 uppercase tracking-widest">Student Capacity</p><p className="text-2xl font-black">{h.capacity}</p></div>
                            <div><p className="text-[10px] text-white/40 uppercase tracking-widest">Meals Today</p><p className="text-2xl font-black text-creative-lime">{h.meals_served_today || 0}</p></div>
                        </div>
                        <div className="mt-4">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Waste Percentage</p>
                            <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-red-400" style={{ width: `${Math.min((Number(h.waste_pct) || 0) * 8, 100)}%` }}></div>
                            </div>
                            <p className="text-sm text-red-300 mt-2 font-bold">{Number(h.waste_pct || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                ))}
            </div>

            <Modal open={openAdd} title="Add New Hostel" onClose={() => setOpenAdd(false)}>
                <form onSubmit={handleAddHostel} className="space-y-4">
                    <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Hostel Name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2" />
                    <input value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })} placeholder="Hostel Code" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2" />
                    <input type="number" min="0" value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })} placeholder="Student Capacity" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2" />
                    <input value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} placeholder="Location" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2" />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setOpenAdd(false)} className="px-4 py-2 bg-white/10 rounded-xl">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-creative-lime text-black rounded-xl font-black">Create Hostel</button>
                    </div>
                </form>
            </Modal>

            <Modal open={openCapacity} title="Edit Hostel Capacity" onClose={() => setOpenCapacity(false)}>
                <form onSubmit={handleUpdateCapacity} className="space-y-4">
                    <select value={capacityForm.hostelId} onChange={(e) => setCapacityForm({ ...capacityForm, hostelId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                        {activeHostels.length === 0 ? <option value="">No hostels available</option> : null}
                        {activeHostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <input type="number" min="0" value={capacityForm.capacity} onChange={(e) => setCapacityForm({ ...capacityForm, capacity: e.target.value })} placeholder="New Capacity" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2" />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setOpenCapacity(false)} className="px-4 py-2 bg-white/10 rounded-xl">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-creative-lime text-black rounded-xl font-black">Update Capacity</button>
                    </div>
                </form>
            </Modal>

            <Modal open={openAssign} title="Assign Chef to Hostel" onClose={() => setOpenAssign(false)}>
                <form onSubmit={handleAssignChef} className="space-y-4">
                    <select value={assignForm.chefId} onChange={(e) => setAssignForm({ ...assignForm, chefId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                        {chefs.length === 0 ? <option value="">No chefs available</option> : chefs.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                    </select>
                    <select value={assignForm.hostelId} onChange={(e) => setAssignForm({ ...assignForm, hostelId: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                        {activeHostels.length === 0 ? <option value="">No hostels available</option> : null}
                        {activeHostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setOpenAssign(false)} className="px-4 py-2 bg-white/10 rounded-xl">Cancel</button>
                        <button type="submit" disabled={chefs.length === 0 || !assignForm.chefId} className="px-4 py-2 bg-creative-lime text-black rounded-xl font-black disabled:opacity-50">Assign Chef</button>
                    </div>
                </form>
            </Modal>

            {loading ? <div className="text-center text-white/50 text-sm">Loading entities...</div> : null}
            {!loading && activeHostels.length === 0 ? <div className="text-center text-white/50 text-sm">No data available</div> : null}
        </AdminLayout>
    );
}
