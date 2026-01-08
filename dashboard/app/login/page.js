// Prevent static generation - this page uses client-side Supabase
export const dynamic = 'force-dynamic';

import LoginClient from './LoginClient';

export default function LoginPage() {
    return <LoginClient />;
}
