import React, { useState, useEffect } from 'react';
import { getTransports, saveTransport, deleteTransport } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Edit2, Check, X, Truck } from 'lucide-react';

export default function TransportManager() {
    const { currentCompanyId } = useAuth();
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', phone: '', vehicleNumber: '' });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { 
        if (currentCompanyId) load(); 
    }, [currentCompanyId]);

    const load = async () => {
        setLoading(true);
        try { setTransports(await getTransports(currentCompanyId)); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await saveTransport(currentCompanyId, editingId, form);
            setForm({ name: '', phone: '', vehicleNumber: '' });
            setEditingId(null);
            await load();
        } catch (err) { alert('Failed to save'); }
        finally { setSaving(false); }
    };

    const startEdit = (t) => {
        setEditingId(t.id);
        setForm({ name: t.name, phone: t.phone || '', vehicleNumber: t.vehicleNumber || '' });
    };

    const cancelEdit = () => { setEditingId(null); setForm({ name: '', phone: '', vehicleNumber: '' }); };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this Transport Company?')) return;
        await deleteTransport(currentCompanyId, id);
        setTransports(transports.filter(t => t.id !== id));
    };

    if (loading) return <p>Loading Transporters...</p>;

    return (
        <div className="card">
            <h3 style={{ color: 'var(--color-accent-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={24} /> Transport Database
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'gray', marginBottom: '1.5rem' }}>
                Manage your Transporter contacts. These will appear as autocomplete suggestions in the Logistics Portal.
            </p>

            {/* Add / Edit Form */}
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>{editingId ? '✏️ Edit Transporter' : '➕ Add New Transporter'}</h4>
                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Company Name *</label>
                        <input className="input-field" placeholder="e.g. VRL Logistics" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Phone Number</label>
                        <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Default Vehicle No (Opt)</label>
                        <input className="input-field" placeholder="e.g. MH 12 AB 1234" value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {saving ? 'Saving...' : <><Check size={16} /> {editingId ? 'Update Transporter' : 'Add Transporter'}</>}
                        </button>
                        {editingId && (
                            <button type="button" className="btn btn-outline" onClick={cancelEdit} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <X size={16} /> Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', fontSize: '0.85rem', color: 'gray' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Company Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Default Vehicle</th>
                        <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {transports.length === 0 && (
                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'gray' }}>No Transporters yet. Add one above.</td></tr>
                    )}
                    {transports.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{t.name}</td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>{t.phone || '—'}</td>
                                <td style={{ padding: '0.75rem 0.5rem', color: 'gray' }}>{t.vehicleNumber || '—'}</td>
                            <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => startEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
