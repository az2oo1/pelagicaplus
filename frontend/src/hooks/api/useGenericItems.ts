import { getApi } from '@/api/getApi';
import type { BaseItemDto, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { useQuery } from '@tanstack/react-query';
import { getUserId } from '@/utils/localstorageCredentials';
import type { SectionItemsConfig } from './useConfig';
import { ItemFilter, type BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';

interface GenericItemsOptions {
    sortBy?: ItemSortBy[];
    sortOrder?: SortOrder[];
    limit?: number;
    startIndex?: number;
}

interface GenericItemsResponse {
    items: BaseItemDto[];
    totalCount: number;
}

export function useGenericItems(configJson: string, options?: GenericItemsOptions) {
    return useQuery<GenericItemsResponse>({
        queryKey: ['generic-items', configJson, options],
        queryFn: async () => {
            const api = getApi();
            const itemsApi = getItemsApi(api);
            const config = JSON.parse(configJson) as SectionItemsConfig;

            const sectionTypes = config?.types?.length
                ? config.types
                : (['Movie', 'Series'] as BaseItemKind[]);

            const filters: ItemFilter[] = [];
            if (config?.isInKefinTweaksWatchlist) filters.push(ItemFilter.Likes);
            if (config?.isUnplayed) filters.push(ItemFilter.IsUnplayed);

            // Merge options from generic pagination (options) and config (config)
            // Options from pagination (ItemsListPage) take precedence for sorting if they aren't the default, but actually ItemsListPage always passes Name Ascending by default.
            // Let's use the options passed by the hook caller, but default to config if it exists.
            // Actually, we want to allow users to override the sort in the UI. 
            // So if `options.sortBy` is provided, we use it.

            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                parentId: config?.libraryId,
                sortBy: options?.sortBy || config?.sortBy || ['Random'],
                sortOrder: options?.sortOrder ? options.sortOrder : config?.sortOrder ? [config.sortOrder] : ['Descending'],
                limit: options?.limit || config?.limit || 50,
                startIndex: options?.startIndex || 0,
                recursive: true,
                includeItemTypes: sectionTypes,
                genres: config?.genres,
                tags: config?.tags,
                isFavorite: config?.isFavorite ?? undefined,
                enableUserData: true,
                fields: ['Genres', 'PrimaryImageAspectRatio', 'MediaStreams', 'MediaSources'],
                filters,
                locationTypes: ['FileSystem'],
            });

            return {
                items: (response.data?.Items ?? []) as BaseItemDto[],
                totalCount: response.data?.TotalRecordCount ?? 0,
            };
        },
        enabled: !!configJson,
    });
}
