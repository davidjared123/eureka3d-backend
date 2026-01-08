'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './conexion.module.css';

export default function ConexionPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tenant, setTenant] = useState(null);
    const [user, setUser] = useState(null);

    // Trello config
    const [trelloApiKey, setTrelloApiKey] = useState('');
    const [trelloToken, setTrelloToken] = useState('');
    const [trelloBoardId, setTrelloBoardId] = useState('');
    const [trelloListId, setTrelloListId] = useState('');

    // WhatsApp config
    const [qrCode, setQrCode] = useState('');
    const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
    const [groupName, setGroupName] = useState('Pedidos Eureka3D');

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        loadUserAndTenant();
    }, []);

    const loadUserAndTenant = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        const { data: existingTenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (existingTenant) {
            setTenant(existingTenant);
            setTrelloApiKey(existingTenant.trello_api_key || '');
            setTrelloToken(existingTenant.trello_token || '');
            setTrelloBoardId(existingTenant.trello_board_id || '');
            setTrelloListId(existingTenant.trello_list_pedidos_id || '');

            if (existingTenant.trello_api_key) {
                setStep(2);
            }
            if (existingTenant.whatsapp_connected) {
                setWhatsappStatus('connected');
            }
        }
    };

    const saveTrelloConfig = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const tenantData = {
                user_id: user.id,
                business_name: user.user_metadata?.full_name || 'Mi Negocio',
                trello_api_key: trelloApiKey,
                trello_token: trelloToken,
                trello_board_id: trelloBoardId,
                trello_list_pedidos_id: trelloListId,
            };

            if (tenant) {
                const { error } = await supabase
                    .from('tenants')
                    .update(tenantData)
                    .eq('id', tenant.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('tenants')
                    .insert([tenantData])
                    .select()
                    .single();
                if (error) throw error;
                setTenant(data);
            }

            setStep(2);
        } catch (err) {
            setError(err.message || 'Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    const connectWhatsApp = async () => {
        setLoading(true);
        setError('');
        setWhatsappStatus('connecting');

        try {
            // Aquí iría la lógica para obtener el QR de Evolution API
            // Por ahora simulamos
            setQrCode('PLACEHOLDER_QR_CODE');

            // En producción, esto sería una llamada a Evolution API
            // const response = await fetch('/api/whatsapp/connect', { method: 'POST' });
            // const data = await response.json();
            // setQrCode(data.qrCode);

        } catch (err) {
            setError(err.message || 'Error al conectar WhatsApp');
            setWhatsappStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Back button */}
            <a href="/dashboard" className={styles.backBtn}>
                ← Volver al Dashboard
            </a>

            <div className={styles.header}>
                <h1>Configuración de Conexión</h1>
                <p>Configura Trello y WhatsApp para empezar a recibir pedidos</p>
            </div>

            {/* Progress Steps */}
            <div className={styles.steps}>
                <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
                    <div className={styles.stepNumber}>1</div>
                    <span>Trello</span>
                </div>
                <div className={styles.stepLine}></div>
                <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
                    <div className={styles.stepNumber}>2</div>
                    <span>WhatsApp</span>
                </div>
                <div className={styles.stepLine}></div>
                <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
                    <div className={styles.stepNumber}>3</div>
                    <span>Listo</span>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Step 1: Trello */}
            {step === 1 && (
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>📋</span>
                        <div>
                            <h2>Configurar Trello</h2>
                            <p>Conecta tu tablero de Trello donde llegarán los pedidos</p>
                        </div>
                    </div>

                    <div className={styles.helpBox}>
                        <h4>¿Cómo obtener las credenciales?</h4>
                        <ol>
                            <li>
                                <strong>API Key:</strong>{' '}
                                <a href="https://trello.com/power-ups/admin" target="_blank" rel="noopener">
                                    Power-Ups Admin → Nueva integración → API Key
                                </a>
                            </li>
                            <li>
                                <strong>Token:</strong> En la misma página, click en "Token" al lado de API Key
                            </li>
                            <li>
                                <strong>Board ID:</strong> Abre tu tablero, añade <code>.json</code> al final de la URL
                            </li>
                            <li>
                                <strong>List ID:</strong> En el JSON, busca el <code>id</code> de la lista "Pedidos"
                            </li>
                        </ol>
                    </div>

                    <form onSubmit={saveTrelloConfig} className={styles.form}>
                        <div className="form-group">
                            <label className="form-label">API Key</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={trelloApiKey}
                                onChange={(e) => setTrelloApiKey(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Token</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
                                value={trelloToken}
                                onChange={(e) => setTrelloToken(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Board ID</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="5a1b2c3d4e5f6g7h8i9j"
                                value={trelloBoardId}
                                onChange={(e) => setTrelloBoardId(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">List ID (Lista de Pedidos)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="5a1b2c3d4e5f6g7h8i9j"
                                value={trelloListId}
                                onChange={(e) => setTrelloListId(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-full"
                            disabled={loading}
                        >
                            {loading ? <span className="spinner"></span> : 'Guardar y Continuar →'}
                        </button>
                    </form>
                </div>
            )}

            {/* Step 2: WhatsApp */}
            {step === 2 && (
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>💬</span>
                        <div>
                            <h2>Conectar WhatsApp</h2>
                            <p>Escanea el código QR con tu WhatsApp</p>
                        </div>
                    </div>

                    {whatsappStatus === 'disconnected' && (
                        <div className={styles.whatsappConnect}>
                            <p>Haz click en el botón para generar el código QR</p>
                            <button
                                onClick={connectWhatsApp}
                                className="btn btn-primary btn-lg"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner"></span> : 'Generar Código QR'}
                            </button>
                        </div>
                    )}

                    {whatsappStatus === 'connecting' && qrCode && (
                        <div className={styles.qrContainer}>
                            <div className={styles.qrCode}>
                                {/* En producción, aquí iría el QR real */}
                                <div className={styles.qrPlaceholder}>
                                    <span>📱</span>
                                    <p>QR Code</p>
                                    <small>Escanea con WhatsApp</small>
                                </div>
                            </div>
                            <div className={styles.qrInstructions}>
                                <h4>Instrucciones:</h4>
                                <ol>
                                    <li>Abre WhatsApp en tu teléfono</li>
                                    <li>Toca Menú o Configuración</li>
                                    <li>Selecciona "Dispositivos vinculados"</li>
                                    <li>Toca "Vincular un dispositivo"</li>
                                    <li>Escanea este código</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {whatsappStatus === 'connected' && (
                        <div className={styles.connected}>
                            <span className={styles.connectedIcon}>✅</span>
                            <h3>¡WhatsApp Conectado!</h3>
                            <p>Tu número está vinculado correctamente</p>

                            <div className={styles.groupConfig}>
                                <label className="form-label">Nombre del grupo de pedidos:</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                className="btn btn-primary btn-lg"
                            >
                                Continuar →
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setStep(1)}
                        className="btn btn-ghost"
                        style={{ marginTop: 'var(--space-md)' }}
                    >
                        ← Volver a Trello
                    </button>
                </div>
            )}

            {/* Step 3: Complete */}
            {step === 3 && (
                <div className={styles.card}>
                    <div className={styles.complete}>
                        <span className={styles.completeIcon}>🎉</span>
                        <h2>¡Configuración Completa!</h2>
                        <p>Ya puedes empezar a recibir pedidos por WhatsApp</p>

                        <div className={styles.summary}>
                            <div className={styles.summaryItem}>
                                <span>✅</span>
                                <span>Trello configurado</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>✅</span>
                                <span>WhatsApp conectado</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>✅</span>
                                <span>Grupo: {groupName}</span>
                            </div>
                        </div>

                        <a href="/dashboard" className="btn btn-primary btn-lg">
                            Ir al Dashboard →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
