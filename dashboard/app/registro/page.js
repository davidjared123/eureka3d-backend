// Prevent static generation - this page uses client-side Supabase
export const dynamic = 'force-dynamic';

import RegistroClient from './RegistroClient';

export default function RegistroPage() {
    return <RegistroClient />;
}
