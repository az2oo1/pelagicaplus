import { useParams, useSearchParams } from 'react-router';
import { useStudioItems } from '../../hooks/api/useStudioItems';
import ItemsListPage from './ItemsListPage';
import Page from '../Page';

import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';

const StudioPage = () => {
    const { studioId } = useParams<{ studioId: string }>();
    const [searchParams] = useSearchParams();
    const studioName = searchParams.get('name') || 'Studio';

    const mockItem = {
        Id: studioId,
        Name: studioName,
        Type: 'Studio' as BaseItemKind,
    };

    return (
        <Page
            title={studioName}
            className="flex-1 flex flex-col"
            overlayHeader={false}
            pagePadding={true}
        >
            <ItemsListPage item={mockItem} useItems={useStudioItems} />
        </Page>
    );
};

export default StudioPage;
