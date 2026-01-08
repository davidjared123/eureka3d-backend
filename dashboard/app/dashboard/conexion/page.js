'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './conexion.module.css';

export default function ConexionPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
    const [existingGroups, setExistingGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showGroupOptions, setShowGroupOptions] = useState(false);

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
            setGroupName(existingTenant.whatsapp_group_name || 'Pedidos Eureka3D');

            if (existingTenant.trello_api_key) {
                setStep(2);
            }
            if (existingTenant.whatsapp_connected) {
                setWhatsappStatus('connected');
                setStep(3);
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

            setSuccess('✅ Configuración de Trello guardada');
            setTimeout(() => setSuccess(''), 3000);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    // Crear instancia y obtener QR
    const connectWhatsApp = async () => {
        setLoading(true);
        setError('');
        setWhatsappStatus('connecting');

        try {
            // 1. Crear/obtener instancia
            const instanceRes = await fetch('/api/whatsapp/instance', { method: 'POST' });
            const instanceData = await instanceRes.json();

            if (!instanceRes.ok) {
                throw new Error(instanceData.error || 'Error creando instancia');
            }

            // 2. Obtener QR
            const qrRes = await fetch('/api/whatsapp/qr');
            const qrData = await qrRes.json();

            if (qrData.connected) {
                setWhatsappStatus('connected');
                await loadExistingGroups();
                setShowGroupOptions(true);
            } else if (qrData.qrcode) {
                setQrCode(qrData.qrcode);
                // Iniciar polling para verificar conexión
                startConnectionPolling();
            } else {
                throw new Error(qrData.message || 'No se pudo obtener QR');
            }

        } catch (err) {
            setError(err.message || 'Error al conectar WhatsApp');
            setWhatsappStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    // Polling para verificar si el usuario escaneó el QR
    const startConnectionPolling = useCallback(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/whatsapp/instance');
                const data = await res.json();

                if (data.connected) {
                    clearInterval(interval);
                    setWhatsappStatus('connected');
                    setQrCode('');
                    await loadExistingGroups();
                    setShowGroupOptions(true);
                }
            } catch (err) {
                console.error('Error en polling:', err);
            }
        }, 3000); // Cada 3 segundos

        // Limpiar después de 2 minutos
        setTimeout(() => clearInterval(interval), 120000);

        return () => clearInterval(interval);
    }, []);

    // Cargar grupos existentes
    const loadExistingGroups = async () => {
        try {
            const res = await fetch('/api/whatsapp/group');
            const data = await res.json();
            if (data.groups) {
                setExistingGroups(data.groups);
            }
        } catch (err) {
            console.error('Error cargando grupos:', err);
        }
    };

    // Crear nuevo grupo
    const createGroup = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/whatsapp/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error creando grupo');
            }

            setSuccess(`✅ Grupo "${groupName}" creado con ID: ${data.groupId}`);
            setStep(3);

        } catch (err) {
            setError(err.message || 'Error al crear grupo');
        } finally {
            setLoading(false);
        }
    };

    // Seleccionar grupo existente
    const selectGroup = async (group) => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/whatsapp/group', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: group.fullId || group.id,
                    groupName: group.name,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error seleccionando grupo');
            }

            setSuccess(`✅ Grupo "${group.name}" seleccionado`);
            setStep(3);

        } catch (err) {
            setError(err.message || 'Error al seleccionar grupo');
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
            {success && <div className={styles.success}>{success}</div>}

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
                            <p>Vincula tu WhatsApp para recibir pedidos</p>
                        </div>
                    </div>

                    {/* Estado: Sin conectar */}
                    {whatsappStatus === 'disconnected' && (
                        <div className={styles.whatsappConnect}>
                            <p>Haz click para generar el código QR y vincular WhatsApp</p>
                            <button
                                onClick={connectWhatsApp}
                                className="btn btn-primary btn-lg"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner"></span> : '📱 Conectar WhatsApp'}
                            </button>
                        </div>
                    )}

                    {/* Estado: Mostrando QR */}
                    {whatsappStatus === 'connecting' && qrCode && (
                        <div className={styles.qrContainer}>
                            <div className={styles.qrCode}>
                                <img
                                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                    alt="WhatsApp QR Code"
                                    style={{ width: 250, height: 250, borderRadius: 8 }}
                                />
                            </div>
                            <div className={styles.qrInstructions}>
                                <h4>Instrucciones:</h4>
                                <ol>
                                    <li>Abre WhatsApp en tu teléfono</li>
                                    <li>Toca <strong>Menú</strong> o <strong>Configuración</strong></li>
                                    <li>Selecciona <strong>"Dispositivos vinculados"</strong></li>
                                    <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                                    <li>Escanea este código</li>
                                </ol>
                                <p className={styles.waiting}>
                                    <span className="spinner"></span> Esperando escaneo...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Estado: Conectado - Seleccionar/crear grupo */}
                    {whatsappStatus === 'connected' && showGroupOptions && (
                        <div className={styles.groupSelection}>
                            <div className={styles.connectedBadge}>
                                <span>✅</span> WhatsApp Conectado
                            </div>

                            <h3>Selecciona el grupo de pedidos</h3>
                            <p>El bot escuchará los mensajes del grupo que elijas</p>

                            {/* Instrucciones para crear grupo */}
                            <div className={styles.createGroupSection}>
                                <h4>💡 ¿No tienes un grupo?</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
                                    Crea uno manualmente en WhatsApp:
                                </p>
                                <ol style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-lg)' }}>
                                    <li>Abre WhatsApp en tu teléfono</li>
                                    <li>Toca el botón <strong>+</strong> → <strong>Nuevo grupo</strong></li>
                                    <li>Agrega al menos 1 contacto (puede ser tu otro número o un familiar)</li>
                                    <li>Nombra el grupo (ej: "Pedidos 3D")</li>
                                    <li>Vuelve aquí y haz click en <strong>"Actualizar lista"</strong></li>
                                </ol>
                                <button
                                    onClick={loadExistingGroups}
                                    className="btn btn-secondary"
                                    disabled={loading}
                                    style={{ marginTop: 'var(--space-md)' }}
                                >
                                    {loading ? <span className="spinner"></span> : '🔄 Actualizar lista de grupos'}
                                </button>
                            </div>

                            {/* Seleccionar grupo existente */}
                            {existingGroups.length > 0 ? (
                                <div className={styles.existingGroupsSection}>
                                    <h4>Selecciona tu grupo de pedidos:</h4>
                                    <div className={styles.groupList}>
                                        {existingGroups.map((group) => (
                                            <button
                                                key={group.id}
                                                className={styles.groupItem}
                                                onClick={() => selectGroup(group)}
                                                disabled={loading}
                                            >
                                                <span className={styles.groupIcon}>👥</span>
                                                <span className={styles.groupName}>{group.name}</span>
                                                <span className={styles.groupArrow}>→</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.existingGroupsSection}>
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                                        No se encontraron grupos. Crea uno en WhatsApp y actualiza la lista.
                                    </p>
                                </div>
                            )}
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
                                <span>Grupo: {tenant?.whatsapp_group_name || groupName}</span>
                            </div>
                        </div>

                        <div className={styles.nextSteps}>
                            <h4>Próximos pasos:</h4>
                            <ol>
                                <li>Envía un mensaje al grupo para probar</li>
                                <li>El bot responderá y creará tarjetas en Trello</li>
                                <li>Usa <code>#info</code> para ver pedidos pendientes</li>
                            </ol>
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
