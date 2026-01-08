'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './dashboard.module.css';

export default function DashboardClient({ user, tenant }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isConfigured = tenant?.whatsapp_connected && tenant?.trello_api_key;

    return (
        <>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.logo}>🖨️</span>
                    <span className={styles.logoText}>Eureka3D</span>
                </div>

                <nav className={styles.nav}>
                    <a href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
                        <span>📊</span>
                        Dashboard
                    </a>
                    <a href="/dashboard/pedidos" className={styles.navItem}>
                        <span>📋</span>
                        Pedidos
                    </a>
                    <a href="/dashboard/conexion" className={styles.navItem}>
                        <span>🔗</span>
                        Conexión
                    </a>
                    <a href="/dashboard/configuracion" className={styles.navItem}>
                        <span>⚙️</span>
                        Configuración
                    </a>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                            {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || '?'}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>
                                {user?.user_metadata?.full_name || 'Usuario'}
                            </span>
                            <span className={styles.userEmail}>{user?.email}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className={styles.logoutBtn}
                        disabled={loading}
                    >
                        {loading ? '...' : '🚪'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1>Dashboard</h1>
                        <p>Bienvenido, {user?.user_metadata?.full_name || 'Usuario'}</p>
                    </div>
                </header>

                {/* Status Cards */}
                <div className={styles.statusGrid}>
                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>
                            {tenant?.whatsapp_connected ? '✅' : '❌'}
                        </div>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>WhatsApp</span>
                            <span className={styles.statusValue}>
                                {tenant?.whatsapp_connected ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>
                            {tenant?.trello_api_key ? '✅' : '❌'}
                        </div>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>Trello</span>
                            <span className={styles.statusValue}>
                                {tenant?.trello_api_key ? 'Configurado' : 'Sin configurar'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.statusCard}>
                        <div className={styles.statusIcon}>📋</div>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>Pedidos hoy</span>
                            <span className={styles.statusValue}>-</span>
                        </div>
                    </div>
                </div>

                {/* Setup Required */}
                {!isConfigured && (
                    <div className={styles.setupCard}>
                        <div className={styles.setupIcon}>🚀</div>
                        <div className={styles.setupContent}>
                            <h3>Completa la configuración</h3>
                            <p>Para empezar a recibir pedidos, necesitas:</p>
                            <ul className={styles.setupList}>
                                <li className={tenant?.trello_api_key ? styles.completed : ''}>
                                    {tenant?.trello_api_key ? '✅' : '⬜'} Configurar Trello
                                </li>
                                <li className={tenant?.whatsapp_connected ? styles.completed : ''}>
                                    {tenant?.whatsapp_connected ? '✅' : '⬜'} Conectar WhatsApp
                                </li>
                            </ul>
                            <a href="/dashboard/conexion" className="btn btn-primary">
                                Comenzar Configuración →
                            </a>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {isConfigured && (
                    <div className={styles.quickActions}>
                        <h2>Acciones Rápidas</h2>
                        <div className={styles.actionsGrid}>
                            <a href="/dashboard/pedidos" className={styles.actionCard}>
                                <span className={styles.actionIcon}>📋</span>
                                <span>Ver Pedidos</span>
                            </a>
                            <a href="/dashboard/conexion" className={styles.actionCard}>
                                <span className={styles.actionIcon}>🔄</span>
                                <span>Estado de Conexión</span>
                            </a>
                            <a href="/dashboard/configuracion" className={styles.actionCard}>
                                <span className={styles.actionIcon}>⚙️</span>
                                <span>Configuración</span>
                            </a>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
