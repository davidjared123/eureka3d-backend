'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './configuracion.module.css';

const DEFAULT_DESCRIPTION = `🤖 *Bot de Pedidos*

📋 *COMANDOS DISPONIBLES:*

🔍 #info → Ver pedidos pendientes
🔍 #info hoy → Pedidos para hoy
🔍 #info semana → Pedidos de la semana
❓ #ayuda → Ver esta lista
❌ #cancelar → Cancelar pedido actual

📝 *CÓMO CREAR UN PEDIDO:*
1️⃣ Envía un mensaje describiendo el pedido
2️⃣ El bot te sugerirá un título
3️⃣ Confirma con "sí" o escribe "otro" para cambiarlo
4️⃣ Indica la fecha de entrega
5️⃣ ¡Listo! Se crea en Trello

💡 También puedes enviar imágenes de referencia`;

export default function ConfiguracionClient() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(null);
    const [tenant, setTenant] = useState(null);

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Business info
    const [businessName, setBusinessName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const fileInputRef = useRef(null);

    // Group description
    const [groupDescription, setGroupDescription] = useState('');

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tenant) {
            setTenant(tenant);
            setBusinessName(tenant.business_name || '');
            setAvatarUrl(tenant.avatar_url || '');
            setGroupDescription(tenant.group_description || DEFAULT_DESCRIPTION.replace('Bot de Pedidos', `Bot de Pedidos - ${tenant.business_name || 'Mi Negocio'}`));
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess('✅ Contraseña actualizada correctamente');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message || 'Error al cambiar contraseña');
        } finally {
            setLoading(false);
        }
    };

    const handleBusinessUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            let newAvatarUrl = avatarUrl;

            // Upload avatar if new file selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                newAvatarUrl = publicUrl;
            }

            // Update tenant
            const { error } = await supabase
                .from('tenants')
                .update({
                    business_name: businessName,
                    avatar_url: newAvatarUrl,
                })
                .eq('user_id', user.id);

            if (error) throw error;

            setAvatarUrl(newAvatarUrl);
            setAvatarFile(null);
            setSuccess('✅ Información actualizada');
        } catch (err) {
            setError(err.message || 'Error al actualizar información');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('La imagen no debe superar 2MB');
                return;
            }
            setAvatarFile(file);
            // Preview
            const reader = new FileReader();
            reader.onload = (e) => setAvatarUrl(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDescriptionUpdate = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // Save to tenant
            await supabase
                .from('tenants')
                .update({ group_description: groupDescription })
                .eq('user_id', user.id);

            // Update in WhatsApp group
            const res = await fetch('/api/whatsapp/group/description', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: groupDescription }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess('✅ Descripción del grupo actualizada');
        } catch (err) {
            setError(err.message || 'Error al actualizar descripción');
        } finally {
            setLoading(false);
        }
    };

    const resetDescription = () => {
        const defaultDesc = DEFAULT_DESCRIPTION.replace(
            'Bot de Pedidos',
            `Bot de Pedidos - ${businessName || 'Mi Negocio'}`
        );
        setGroupDescription(defaultDesc);
    };

    return (
        <div className={styles.container}>
            <a href="/dashboard" className={styles.backBtn}>
                ← Volver al Dashboard
            </a>

            <div className={styles.header}>
                <h1>⚙️ Configuración</h1>
                <p>Personaliza tu cuenta y el bot</p>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            {/* Business Info */}
            <section className={styles.section}>
                <h2>🏢 Información del Negocio</h2>

                <form onSubmit={handleBusinessUpdate} className={styles.form}>
                    <div className={styles.avatarSection}>
                        <div
                            className={styles.avatar}
                            onClick={handleAvatarClick}
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" />
                            ) : (
                                <span className={styles.avatarPlaceholder}>
                                    {businessName?.[0] || '🏢'}
                                </span>
                            )}
                            <div className={styles.avatarOverlay}>
                                📷
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <p className={styles.avatarHint}>Click para cambiar imagen</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nombre del Negocio</label>
                        <input
                            type="text"
                            className="form-input"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Impresiones 3D Juan"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? <span className="spinner"></span> : 'Guardar Cambios'}
                    </button>
                </form>
            </section>

            {/* Group Description */}
            <section className={styles.section}>
                <h2>📝 Descripción del Grupo</h2>
                <p className={styles.sectionDesc}>
                    Esta descripción aparece en el grupo de WhatsApp
                </p>

                <div className={styles.descriptionEditor}>
                    <textarea
                        className={styles.textarea}
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        rows={15}
                    />

                    <div className={styles.descriptionActions}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={resetDescription}
                        >
                            🔄 Restaurar predeterminada
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleDescriptionUpdate}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner"></span> : '📤 Actualizar en WhatsApp'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Password Change */}
            <section className={styles.section}>
                <h2>🔐 Cambiar Contraseña</h2>

                <form onSubmit={handlePasswordChange} className={styles.form}>
                    <div className="form-group">
                        <label className="form-label">Nueva Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmar Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la contraseña"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !newPassword || !confirmPassword}
                    >
                        {loading ? <span className="spinner"></span> : 'Cambiar Contraseña'}
                    </button>
                </form>
            </section>

            {/* Account Info */}
            <section className={styles.section}>
                <h2>👤 Información de Cuenta</h2>

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email</span>
                        <span className={styles.infoValue}>{user?.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Grupo de WhatsApp</span>
                        <span className={styles.infoValue}>{tenant?.whatsapp_group_name || 'No configurado'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Estado WhatsApp</span>
                        <span className={`${styles.infoValue} ${tenant?.whatsapp_connected ? styles.connected : styles.disconnected}`}>
                            {tenant?.whatsapp_connected ? '✅ Conectado' : '❌ Desconectado'}
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
}
