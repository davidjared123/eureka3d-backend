import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import styles from './dashboard.module.css';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Buscar tenant del usuario
    const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return (
        <div className={styles.container}>
            <DashboardClient user={user} tenant={tenant} />
        </div>
    );
}
