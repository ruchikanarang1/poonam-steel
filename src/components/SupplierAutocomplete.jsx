import React, { useState, useEffect, useRef } from 'react';
import { getSuppliers } from '../lib/db';
import { Search, MapPin } from 'lucide-react';

export default function SupplierAutocomplete({ value, onChange, onSelect, placeholder = "Search Vendor..." }) {
    const [suppliers, setSuppliers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const data = await getSuppliers();
            setSuppliers(data);
        };
        load();
    }, []);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const query = e.target.value;
        onChange(query);
        
        if (query.trim().length > 0) {
            const matches = suppliers.filter(s => 
                s.name.toLowerCase().includes(query.toLowerCase()) || 
                (s.address && s.address.toLowerCase().includes(query.toLowerCase()))
            );
            setFiltered(matches);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSelect = (supplier) => {
        onSelect(supplier);
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    className="input-field"
                    style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', fontSize: '0.85rem', width: '100%' }}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => { if (filtered.length > 0) setShowDropdown(true); }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            </div>

            {showDropdown && filtered.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px'
                }}>
                    {filtered.map(s => (
                        <div
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fbfc'}
                            onMouseOut={(e) => e.target.style.background = 'white'}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{s.name}</div>
                            {s.address && (
                                <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <MapPin size={10} /> {s.address}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
