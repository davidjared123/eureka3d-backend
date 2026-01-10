'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../configuracion/configuracion.module.css';

const DAYS = [
    { key: 'trello_list_monday', label: 'Lunes', emoji: '1️⃣' },
    { key: 'trello_list_tuesday', label: 'Martes', emoji: '2️⃣' },
    { key: 'trello_list_wednesday', label: 'Miércoles', emoji: '3️⃣' },
    { key: 'trello_list_thursday', label: 'Jueves', emoji: '4️⃣' },
    { key: 'trello_list_friday', label: 'Viernes', emoji: '5️⃣' },
    { key: 'trello_list_saturday', label: 'Sábado', emoji: '6️⃣' },
    { key: 'trello_list_sunday', label: 'Domingo', emoji: '7️⃣' },
];

export default function TrelloClient() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tenant, setTenant] = useState(null);
    const [trelloLists, setTrelloLists] = useState([]);

    // Config
    const [multilistEnabled, setMultilistEnabled] = useState(false);
    const [dailyLists, setDailyLists] = useState({});
    const [defaultListId, setDefaultListId] = useState('');

    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (tenantData) {
                setTenant(tenantData);
                setMultilistEnabled(tenantData.trello_multilist_enabled || false);
                setDefaultListId(tenantData.trello_list_pedidos_id || '');

                const lists = {};
                DAYS.forEach(day => {
                    lists[day.key] = tenantData[day.key] || '';
                });
                setDailyLists(lists);

                // Fetch Trello lists
                if (tenantData.trello_api_key && tenantData.trello_token && tenantData.trello_board_id) {
                    await fetchTrelloLists(tenantData);
                }
            }
        } catch (err) {
            setError('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrelloLists = async (t) => {
        try {
            const res = await fetch(
                `https://api.trello.com/1/boards/${t.trello_board_id}/lists?key=${t.trello_api_key}&token=${t.trello_token}`
            );
            const lists = await res.json();
            setTrelloLists(lists);
        } catch (err) {
            console.error('Error fetching lists:', err);
        }
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const updateData = {
                trello_multilist_enabled: multilistEnabled,
                ...dailyLists,
            };

            const { error } = await supabase
                .from('tenants')
                .update(updateData)
                .eq('id', tenant.id);

            if (error) throw error;

            setSuccess('✅ Configuración guardada');
        } catch (err) {
            setError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDayChange = (dayKey, value) => {
        setDailyLists(prev => ({
            ...prev,
            [dayKey]: value,
        }));
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <span className="spinner" style={{ width: 40, height: 40 }}></span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <a href="/dashboard" className={styles.backBtn}>
                ← Volver al Dashboard
            </a>

            <div className={styles.header}>
                <h1>📋 Configuración de Trello</h1>
                <p>Administra cómo se organizan los pedidos en tu tablero</p>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            {/* Mode Selection */}
            <section className={styles.section}>
                <h2>📊 Modo de Organización</h2>

                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <label
                        style={{
                            flex: 1,
                            padding: 'var(--space-lg)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${!multilistEnabled ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                            background: !multilistEnabled ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}
                    >
                        <input
                            type="radio"
                            checked={!multilistEnabled}
                            onChange={() => setMultilistEnabled(false)}
                            style={{ marginRight: 'var(--space-sm)' }}
                        />
                        <strong>📋 Lista Única</strong>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
                            Todos los pedidos van a una sola lista
                        </p>
                    </label>

                    <label
                        style={{
                            flex: 1,
                            padding: 'var(--space-lg)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${multilistEnabled ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                            background: multilistEnabled ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}
                    >
                        <input
                            type="radio"
                            checked={multilistEnabled}
                            onChange={() => setMultilistEnabled(true)}
                            style={{ marginRight: 'var(--space-sm)' }}
                        />
                        <strong>📅 Multi-Lista por Día</strong>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
                            Cada pedido va a la lista según su día de entrega
                        </p>
                    </label>
                </div>
            </section>

            {/* Multi-list Configuration */}
            {multilistEnabled && (
                <section className={styles.section}>
                    <h2>📅 Listas por Día de la Semana</h2>
                    <p className={styles.sectionDesc}>
                        Selecciona qué lista de Trello corresponde a cada día
                    </p>

                    {trelloLists.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                            No se encontraron listas en tu tablero. Verifica tu configuración de Trello.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {DAYS.map(day => (
                                <div
                                    key={day.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-md)',
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem', width: '2rem' }}>{day.emoji}</span>
                                    <span style={{ fontWeight: 500, width: '100px' }}>{day.label}</span>
                                    <select
                                        value={dailyLists[day.key] || ''}
                                        onChange={(e) => handleDayChange(day.key, e.target.value)}
                                        className="form-input"
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">-- Usar lista principal --</option>
                                        {trelloLists.map(list => (
                                            <option key={list.id} value={list.id}>
                                                {list.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Current Config Summary */}
            <section className={styles.section}>
                <h2>📌 Configuración Actual</h2>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Tablero</span>
                        <span className={styles.infoValue}>{tenant?.trello_board_id || 'No configurado'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Lista Principal</span>
                        <span className={styles.infoValue}>
                            {trelloLists.find(l => l.id === defaultListId)?.name || defaultListId || 'No configurado'}
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Modo</span>
                        <span className={styles.infoValue}>
                            {multilistEnabled ? '📅 Multi-Lista' : '📋 Lista Única'}
                        </span>
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="btn btn-primary btn-lg btn-full"
                disabled={saving}
                style={{ marginTop: 'var(--space-lg)' }}
            >
                {saving ? <span className="spinner"></span> : '💾 Guardar Cambios'}
            </button>
        </div>
    );
}
