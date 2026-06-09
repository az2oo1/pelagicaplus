import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import type { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';

interface TrailerItemsOptions {
    limit?: number;
    types?: ('Movie' | 'Series')[];
}

export function useTrailerItems(options?: TrailerItemsOptions) {
    const limit = options?.limit || 20;
    const types = options?.types || ['Movie'];

    return useQuery<BaseItemDto[]>({
        queryKey: ['trailerItems', options],
        queryFn: async () => {
            const api = getApi();
            const itemsApi = getItemsApi(api);

            const response = await itemsApi.getItems({
                includeItemTypes: types as BaseItemKind[],
                recursive: true,
                sortBy: ['PremiereDate'],
                sortOrder: ['Descending'],
                limit,
                fields: ['RemoteTrailers'],
                locationTypes: ['FileSystem'],
            });

            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}
