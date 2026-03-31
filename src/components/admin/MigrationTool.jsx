import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, writeBatch, query, limit } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export default function MigrationTool() {
    const { currentUser, currentCompanyId } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, running, completed, error
    const [progress, setProgress] = useState([]);
    const [log, setLog] = useState('');

    const collectionsToMigrate = [
        'products', 'orders', 'logistics_transport', 'logistics_bills',
        'ticketCategories', 'tickets', 'suppliers', 'goods_check_in',
        'vendor_brand_registry', 'transports', 'purchaseOrders',
        'formConfigs'
    ];

    const runMigration = async () => {
        if (!window.confirm("CRITICAL: This will copy ALL global data into your CURRENTLY SELECTED company. Continue?")) return;
        
        setStatus('running');
        setLog('Starting migration...\n');
        
        try {
            const companyId = currentCompanyId;
            if (!companyId) throw new Error("No active company selected. Please create/select a company first.");

            for (const collName of collectionsToMigrate) {
                setLog(prev => prev + `Migrating ${collName}... `);
                
                const globalSnap = await getDocs(collection(db, collName));
                if (globalSnap.empty) {
                    setLog(prev => prev + "Empty. Skipping.\n");
                    continue;
                }

                const batch = writeBatch(db);
                globalSnap.docs.forEach(oldDoc => {
                    const newData = oldDoc.data();
                    // Create new doc in scoped company sub-collection
                    const newDocRef = doc(db, 'companies', companyId, collName, oldDoc.id);
                    batch.set(newDocRef, newData);
                });

                await batch.commit();
                setLog(prev => prev + `Done (${globalSnap.size} items).\n`);
                setProgress(prev => [...prev, collName]);
            }

            // Special Case: Configs (Units)
            setLog(prev => prev + "Migrating Units Config... ");
            const unitsSnap = await getDocs(collection(db, 'configs'));
            const unitsDoc = unitsSnap.docs.find(d => d.id === 'units');
            if (unitsDoc) {
                await setDoc(doc(db, 'companies', companyId, 'configs', 'units'), unitsDoc.data());
                setLog(prev => prev + "Done.\n");
            } else {
                setLog(prev => prev + "Not found. Skipping.\n");
            }

            setStatus('completed');
            setLog(prev => prev + "\n--- MIGRATION COMPLETED SUCCESSFULLY ---\n");
            alert("Migration finished! You can now access all data in this company.");
        } catch (err) {
            console.error(err);
            setLog(prev => prev + `\n!!! ERROR: ${err.message}\n`);
            setStatus('error');
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '2rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#1e293b' }}>
                <Database size={24} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0 }}>System Migration Utility</h3>
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', color: '#9a3412' }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem' }}>One-Time Migration Only</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                            This tool moves existing "Poonam Steel" global data into your current active company (**{currentCompanyId || 'NONE'}**). 
                            Do not run this more than once per company.
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {log || "Ready to migrate..."}
                </pre>
            </div>

            {status === 'completed' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: '600' }}>
                    <CheckCircle2 size={20} />
                    Migration Successful! Refreshing is recommended.
                </div>
            ) : (
                <button 
                    onClick={runMigration}
                    disabled={status === 'running' || !currentCompanyId}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {status === 'running' ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Migrating Data...
                        </>
                    ) : (
                        <>
                            <Database size={18} />
                            Start Migration to "{currentCompanyId || 'Selected Company'}"
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
