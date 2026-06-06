import { useState } from 'react';
import type { BaseItemDto, RemoteSearchResult } from '@jellyfin/sdk/lib/generated-client/models';
import { getApi } from '@/api/getApi';
import { getItemLookupApi } from '@jellyfin/sdk/lib/utils/api/item-lookup-api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Check } from 'lucide-react';

interface RemoteSearchResultWithId extends RemoteSearchResult {
    Id?: string | null;
}

interface IdentifyDialogProps {
    item: BaseItemDto;
    trigger: React.ReactNode;
}

const IdentifyDialog = ({ item, trigger }: IdentifyDialogProps) => {
    const { t } = useTranslation('item');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [searchTitle, setSearchTitle] = useState(item.Name || '');
    const [searchYear, setSearchYear] = useState(item.ProductionYear ? String(item.ProductionYear) : '');
    const [results, setResults] = useState<RemoteSearchResultWithId[]>([]);
    const [searching, setSearching] = useState(false);
    const [applyingId, setApplyingId] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTitle.trim()) return;

        setSearching(true);
        setResults([]);
        try {
            const api = getApi();
            const lookupApi = getItemLookupApi(api);
            let response;

            if (item.Type === 'Movie') {
                response = await lookupApi.getMovieRemoteSearchResults({
                    movieInfoRemoteSearchQuery: {
                        SearchInfo: {
                            Name: searchTitle,
                            Year: searchYear ? parseInt(searchYear, 10) : undefined,
                        },
                        ItemId: item.Id!,
                    },
                });
            } else if (item.Type === 'Series') {
                response = await lookupApi.getSeriesRemoteSearchResults({
                    seriesInfoRemoteSearchQuery: {
                        SearchInfo: {
                            Name: searchTitle,
                            Year: searchYear ? parseInt(searchYear, 10) : undefined,
                        },
                        ItemId: item.Id!,
                    },
                });
            }

            const searchResults = response?.data || [];
            setResults(searchResults);
            if (searchResults.length === 0) {
                toast.error(t('no_results_found'));
            }
        } catch (error) {
            console.error('Remote search failed:', error);
            toast.error(t('search_error', { defaultValue: 'Error searching metadata.' }));
        } finally {
            setSearching(false);
        }
    };

    const handleApply = async (result: RemoteSearchResultWithId) => {
        if (!item.Id || !result.Id) return;

        setApplyingId(result.Id);
        try {
            const api = getApi();
            const lookupApi = getItemLookupApi(api);
            await lookupApi.applySearchCriteria({
                itemId: item.Id,
                remoteSearchResult: result,
                replaceAllImages: true,
            });
            toast.success(t('identify_success', { defaultValue: 'Metadata updated successfully!' }));
            // Invalidate query cache to reload current item detail page
            void queryClient.invalidateQueries({ queryKey: ['item', item.Id] });
            setOpen(false);
        } catch (error) {
            console.error('Failed to apply search criteria:', error);
            toast.error(t('apply_error', { defaultValue: 'Error applying metadata.' }));
        } finally {
            setApplyingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('identify', { defaultValue: 'Identify' })}</DialogTitle>
                    <DialogDescription>
                        {t('identify_description', { defaultValue: 'Search external providers to match and identify correct metadata.' })}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSearch} className="flex gap-4 items-end mb-4">
                    <div className="flex-1 flex flex-col gap-1.5">
                        <Label htmlFor="searchTitle" className="text-xs font-semibold text-muted-foreground">
                            {t('title')}
                        </Label>
                        <Input
                            id="searchTitle"
                            type="text"
                            value={searchTitle}
                            onChange={(e) => setSearchTitle(e.target.value)}
                            placeholder="Title"
                        />
                    </div>
                    <div className="w-24 flex flex-col gap-1.5">
                        <Label htmlFor="searchYear" className="text-xs font-semibold text-muted-foreground">
                            {t('release_year')}
                        </Label>
                        <Input
                            id="searchYear"
                            type="number"
                            value={searchYear}
                            onChange={(e) => setSearchYear(e.target.value)}
                            placeholder="Year"
                        />
                    </div>
                    <Button type="submit" disabled={searching}>
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        {t('search')}
                    </Button>
                </form>

                <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-md p-2 bg-muted/20">
                    {searching && (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span>{t('searching')}</span>
                        </div>
                    )}

                    {!searching && results.length === 0 && (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                            {t('no_results_found')}
                        </div>
                    )}

                    {!searching && results.length > 0 && (
                        <ul className="flex flex-col gap-2">
                            {results.map((result) => {
                                const yearStr = result.ProductionYear ? ` (${result.ProductionYear})` : '';
                                const isApplying = applyingId === result.Id;

                                return (
                                    <li
                                        key={result.Id}
                                        className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate">
                                                {result.Name}
                                                {yearStr}
                                            </span>
                                            {result.ProviderIds && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {Object.entries(result.ProviderIds)
                                                        .map(([provider, id]) => `${provider}: ${id}`)
                                                        .join(' | ')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            disabled={isApplying || applyingId !== null}
                                            onClick={() => handleApply(result)}
                                        >
                                            {isApplying ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <Check className="h-4 w-4 mr-1" />
                                            )}
                                            {t('select', { defaultValue: 'Select' })}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default IdentifyDialog;
