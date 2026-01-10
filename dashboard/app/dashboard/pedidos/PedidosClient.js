'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './pedidos.module.css';

export default function PedidosClient() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cards, setCards] = useState([]);
    const [lists, setLists] = useState([]);
    const [filter, setFilter] = useState('all'); // all, today, week, overdue

    const supabase = createClient();

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/trello/cards');
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error cargando pedidos');
            }

            setCards(data.cards || []);
            setLists(data.lists || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getListName = (listId) => {
        const list = lists.find(l => l.id === listId);
        return list?.name || 'Sin lista';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Sin fecha';
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return '🔴 Hoy';
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return '🟡 Mañana';
        }
        if (date < today) {
            return '⚠️ Vencido';
        }

        return date.toLocaleDateString('es-VE', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const isOverdue = (dateStr) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    const isToday = (dateStr) => {
        if (!dateStr) return false;
        return new Date(dateStr).toDateString() === new Date().toDateString();
    };

    const isThisWeek = (dateStr) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return date >= today && date <= weekEnd;
    };

    const filteredCards = cards.filter(card => {
        switch (filter) {
            case 'today':
                return isToday(card.due);
            case 'week':
                return isThisWeek(card.due);
            case 'overdue':
                return isOverdue(card.due);
            default:
                return true;
        }
    });

    const stats = {
        total: cards.length,
        today: cards.filter(c => isToday(c.due)).length,
        overdue: cards.filter(c => isOverdue(c.due)).length,
        week: cards.filter(c => isThisWeek(c.due)).length,
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <span className="spinner" style={{ width: 40, height: 40 }}></span>
                    <p>Cargando pedidos...</p>
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
                <h1>📋 Pedidos Pendientes</h1>
                <button onClick={loadCards} className="btn btn-ghost">
                    🔄 Actualizar
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Stats */}
            <div className={styles.stats}>
                <div
                    className={`${styles.statCard} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <span className={styles.statNumber}>{stats.total}</span>
                    <span className={styles.statLabel}>Total</span>
                </div>
                <div
                    className={`${styles.statCard} ${filter === 'today' ? styles.active : ''}`}
                    onClick={() => setFilter('today')}
                >
                    <span className={styles.statNumber}>{stats.today}</span>
                    <span className={styles.statLabel}>Hoy</span>
                </div>
                <div
                    className={`${styles.statCard} ${filter === 'week' ? styles.active : ''}`}
                    onClick={() => setFilter('week')}
                >
                    <span className={styles.statNumber}>{stats.week}</span>
                    <span className={styles.statLabel}>Esta semana</span>
                </div>
                <div
                    className={`${styles.statCard} ${styles.danger} ${filter === 'overdue' ? styles.active : ''}`}
                    onClick={() => setFilter('overdue')}
                >
                    <span className={styles.statNumber}>{stats.overdue}</span>
                    <span className={styles.statLabel}>Vencidos</span>
                </div>
            </div>

            {/* Cards List */}
            {filteredCards.length === 0 ? (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📭</span>
                    <h3>No hay pedidos</h3>
                    <p>
                        {filter === 'all'
                            ? 'Envía un mensaje al grupo de WhatsApp para crear un pedido'
                            : 'No hay pedidos con este filtro'}
                    </p>
                </div>
            ) : (
                <div className={styles.cardsList}>
                    {filteredCards.map(card => (
                        <div
                            key={card.id}
                            className={`${styles.card} ${isOverdue(card.due) ? styles.overdue : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>{card.name}</h3>
                                <span className={`${styles.cardDate} ${isOverdue(card.due) ? styles.overdueText : ''}`}>
                                    {formatDate(card.due)}
                                </span>
                            </div>

                            {card.desc && (
                                <p className={styles.cardDesc}>
                                    {card.desc.length > 150
                                        ? card.desc.substring(0, 150) + '...'
                                        : card.desc}
                                </p>
                            )}

                            <div className={styles.cardFooter}>
                                <span className={styles.cardList}>
                                    📋 {getListName(card.listId)}
                                </span>
                                <a
                                    href={`https://trello.com/c/${card.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.cardLink}
                                >
                                    Ver en Trello →
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
