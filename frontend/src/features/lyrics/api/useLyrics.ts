import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getLyricsApi } from '@jellyfin/sdk/lib/utils/api/lyrics-api';
import type { LyricDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';

export function useLyrics(itemId: string | null | undefined) {
    return useQuery<LyricDto>({
        queryKey: ['lyrics', itemId],
        queryFn: async (): Promise<LyricDto> => {
            const api = getApi();
            const lyricsApi = getLyricsApi(api);
            const response = await lyricsApi.getLyrics({ itemId: itemId! });
            return response.data;
        },
        enabled: !!itemId,
        staleTime: 5 * 60_000,
        retry: (failureCount, error) => {
            if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as { status: number }).status;
                if (status === 404) {
                    return false;
                }
            }

            return getRetryConfig().retry(failureCount, error);
        },
    });
}
