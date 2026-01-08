// Prevent static generation - this page needs runtime auth
export const dynamic = 'force-dynamic';

import ConexionClient from './ConexionClient';

export default function ConexionPage() {
    return <ConexionClient />;
}
