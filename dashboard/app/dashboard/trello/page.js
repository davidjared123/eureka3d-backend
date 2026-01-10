// Prevent static generation
export const dynamic = 'force-dynamic';

import TrelloClient from './TrelloClient';

export default function TrelloPage() {
    return <TrelloClient />;
}
