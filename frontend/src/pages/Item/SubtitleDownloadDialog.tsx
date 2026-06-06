import type { BaseItemDto, MediaStream } from '@jellyfin/sdk/lib/generated-client/models';
import type { RemoteSubtitleInfo } from '@jellyfin/sdk/lib/generated-client/models';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Captions,
    Download,
    ExternalLink,
    FileText,
    Loader2,
    Search,
    Globe,
    FileDown,
    Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { getAccessToken, getServerUrl } from '../../utils/localstorageCredentials';
import { getApi } from '@/api/getApi';
import { getSubtitleApi } from '@jellyfin/sdk/lib/utils/api/subtitle-api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SubtitleDownloadDialogProps {
    item: BaseItemDto;
    trigger?: React.ReactNode;
}

interface SubtitleEntry {
    stream: MediaStream;
    mediaSourceId: string;
    rawUrl?: string;
    convertedUrl: string | null;
    filename: string;
    isImageBased: boolean;
}

const IMAGE_BASED_CODECS = new Set([
    'pgssub',
    'pgs',
    'dvdsub',
    'dvbsub',
    'vobsub',
    'xsub',
    'hdmv_pgs_subtitle',
    'dvb_subtitle',
]);

const codecToFormat = (codec: string): string => {
    const c = codec.toLowerCase();
    if (c === 'subrip' || c === 'srt') return 'srt';
    if (c === 'webvtt' || c === 'vtt') return 'vtt';
    if (c === 'ass') return 'ass';
    if (c === 'ssa') return 'ssa';
    if (c === 'mov_text' || c === 'tx3g') return 'srt'; // server can convert these to srt
    if (c === 'ttml' || c === 'dfxp') return 'srt';
    // Fallback: ask the server for srt and let it convert if possible.
    return 'srt';
};

const buildSubtitleEntries = (item: BaseItemDto): SubtitleEntry[] => {
    const base = getServerUrl();
    const entries: SubtitleEntry[] = [];

    for (const source of item.MediaSources ?? []) {
        if (!source.Id) continue;
        for (const stream of source.MediaStreams ?? []) {
            if (stream.Type !== 'Subtitle' || stream.Index == null) continue;

            const codec = (stream.Codec || '').toLowerCase();
            const isImageBased = IMAGE_BASED_CODECS.has(codec);
            // Image-based subs can't be served via the text Stream endpoint at all.
            const targetFormat = isImageBased ? null : codecToFormat(codec);

            const convertedUrl = targetFormat
                ? `${base}/Videos/${item.Id}/${source.Id}/Subtitles/${stream.Index}/Stream.${targetFormat}`
                : null;

            const rawUrl =
                stream.IsExternal && stream.DeliveryUrl
                    ? stream.DeliveryUrl.startsWith('http')
                        ? stream.DeliveryUrl
                        : `${base}${stream.DeliveryUrl.startsWith('/') ? '' : '/'}${stream.DeliveryUrl}`
                    : undefined;

            const langPart = stream.Language || 'und';
            const labelPart = stream.IsForced ? '.forced' : stream.IsDefault ? '.default' : '';
            const ext = targetFormat || codec || 'sub';
            const filename = `${item.Name || item.Id}.${langPart}${labelPart}.${ext}`;

            entries.push({
                stream,
                mediaSourceId: source.Id,
                rawUrl,
                convertedUrl,
                filename,
                isImageBased,
            });
        }
    }

    return entries;
};

const triggerDownload = async (url: string, filename: string) => {
    const token = getAccessToken();
    const response = await fetch(url, {
        headers: token ? { Authorization: `MediaBrowser Token="${token}"` } : {},
    });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
};

const LANGUAGES = [
    { code: 'ara', name: 'Arabic (العربية)' },
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish (Español)' },
    { code: 'fre', name: 'French (Français)' },
    { code: 'ger', name: 'German (Deutsch)' },
    { code: 'ita', name: 'Italian (Italiano)' },
    { code: 'por', name: 'Portuguese (Português)' },
    { code: 'rus', name: 'Russian (Русский)' },
    { code: 'chi', name: 'Chinese (中文)' },
    { code: 'jpn', name: 'Japanese (日本語)' },
    { code: 'kor', name: 'Korean (한국어)' },
    { code: 'tur', name: 'Turkish (Türkçe)' },
];

const SubtitleDownloadDialog = ({ item, trigger }: SubtitleDownloadDialogProps) => {
    const { t } = useTranslation('item');
    const queryClient = useQueryClient();
    const token = getAccessToken();

    const entries = useMemo(() => buildSubtitleEntries(item), [item]);
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    // Online search state
    const [selectedLang, setSelectedLang] = useState('ara');
    const [onlineResults, setOnlineResults] = useState<RemoteSubtitleInfo[]>([]);
    const [searchingOnline, setSearchingOnline] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownload = async (key: string, url: string, filename: string) => {
        if (loadingKey) return; // prevent concurrent downloads
        setLoadingKey(key);
        try {
            await triggerDownload(url, filename);
        } catch (error) {
            console.error('Subtitle download failed:', error);
            toast.error(t('download_error', { defaultValue: 'Failed to download subtitle file.' }));
        } finally {
            setLoadingKey(null);
        }
    };

    const handleSearchOnline = async () => {
        if (!item.Id) return;
        setSearchingOnline(true);
        setOnlineResults([]);
        try {
            const api = getApi();
            const subtitleApi = getSubtitleApi(api);
            const response = await subtitleApi.searchRemoteSubtitles({
                itemId: item.Id,
                language: selectedLang,
            });
            setOnlineResults(response.data || []);
            if ((response.data || []).length === 0) {
                toast.info(t('no_online_subtitles_found'));
            }
        } catch (error) {
            console.error('Failed to search remote subtitles:', error);
            toast.error(t('search_error', { defaultValue: 'Failed to search remote subtitles.' }));
        } finally {
            setSearchingOnline(false);
        }
    };

    const handleDownloadToServer = async (subtitleId: string) => {
        if (!item.Id || downloadingId) return;
        setDownloadingId(subtitleId);
        try {
            const api = getApi();
            const subtitleApi = getSubtitleApi(api);
            await subtitleApi.downloadRemoteSubtitles({
                itemId: item.Id,
                subtitleId,
            });
            toast.success(t('download_success'));
            // Invalidate query cache to reload current item details, which will update our entries
            void queryClient.invalidateQueries({ queryKey: ['item', item.Id] });
        } catch (error) {
            console.error('Failed to download remote subtitle to server:', error);
            toast.error(t('download_error', { defaultValue: 'Failed to download subtitle.' }));
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="icon" title={t('subtitles')}>
                        <Captions />
                        {t('subtitles')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('subtitles')}</DialogTitle>
                    <DialogDescription>{t('subtitle_download_description')}</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="local" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid grid-cols-2 mb-4 shrink-0">
                        <TabsTrigger value="local">{t('local_subtitles')}</TabsTrigger>
                        <TabsTrigger value="online">{t('online_subtitles')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="local" className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none">
                        {entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                {t('no_subtitles_available')}
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-2 pr-1">
                                {entries.map((entry) => {
                                    const { stream } = entry;
                                    const title =
                                        stream.DisplayTitle ||
                                        stream.Title ||
                                        stream.Language ||
                                        t('unknown_subtitle');

                                    const entryKey = `${entry.mediaSourceId}-${stream.Index}`;
                                    const rawKey = `${entryKey}-raw`;
                                    const convertedKey = `${entryKey}-converted`;
                                    const isRawLoading = loadingKey === rawKey;
                                    const isConvertedLoading = loadingKey === convertedKey;
                                    const anyLoading = loadingKey !== null;

                                    const authenticatedUrl = entry.convertedUrl
                                        ? `${entry.convertedUrl}${entry.convertedUrl.includes('?') ? '&' : '?'}api_key=${token}`
                                        : '';

                                    return (
                                        <li
                                            key={entryKey}
                                            className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-muted/10 transition-colors"
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-sm truncate">{title}</span>
                                                <span className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                                                    <span className="font-semibold">{stream.Codec?.toUpperCase()}</span>
                                                    {stream.IsExternal && <span>{t('external')}</span>}
                                                    {stream.IsForced && <span className="text-red-500 font-semibold">{t('forced')}</span>}
                                                    {stream.IsDefault && <span className="text-primary font-semibold">{t('default')}</span>}
                                                    {entry.isImageBased && <span className="text-amber-500">{t('image_based')}</span>}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                {entry.rawUrl && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleDownload(
                                                                rawKey,
                                                                entry.rawUrl!,
                                                                entry.filename
                                                            )
                                                        }
                                                        disabled={anyLoading}
                                                        title={t('download_original_file')}
                                                    >
                                                        {isRawLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <FileText className="h-4 w-4" />
                                                        )}
                                                        <span className="ml-1.5 hidden sm:inline">{t('original')}</span>
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        entry.convertedUrl &&
                                                        handleDownload(
                                                            convertedKey,
                                                            entry.convertedUrl,
                                                            entry.filename
                                                        )
                                                    }
                                                    disabled={
                                                        (!entry.convertedUrl && !entry.rawUrl) || anyLoading
                                                    }
                                                    title={t('download')}
                                                >
                                                    {isConvertedLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                    <span className="ml-1.5 hidden sm:inline">{t('download')}</span>
                                                </Button>
                                                {entry.convertedUrl && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="ghost"
                                                        title={t('open_in_new_tab')}
                                                    >
                                                        <a
                                                            href={authenticatedUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </TabsContent>

                    <TabsContent value="online" className="flex-1 flex flex-col min-h-0 focus-visible:outline-none">
                        <div className="flex gap-3 items-end mb-4 shrink-0">
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5" />
                                    {t('language')}
                                </label>
                                <Select value={selectedLang} onValueChange={setSelectedLang}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LANGUAGES.map((lang) => (
                                            <SelectItem key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSearchOnline} disabled={searchingOnline} className="px-4">
                                {searchingOnline ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : (
                                    <Search className="h-4 w-4 mr-1.5" />
                                )}
                                {t('search')}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 border rounded-md p-2 bg-muted/20 pr-1">
                            {searchingOnline && (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span>{t('searching')}</span>
                                </div>
                            )}

                            {!searchingOnline && onlineResults.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                                    <Info className="h-5 w-5 text-muted-foreground/75" />
                                    <span>{t('no_online_subtitles_found')}</span>
                                </div>
                            )}

                            {!searchingOnline && onlineResults.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {onlineResults.map((result) => {
                                        const isDownloading = downloadingId === result.Id;
                                        const anyDownloading = downloadingId !== null;

                                        return (
                                            <li
                                                key={result.Id}
                                                className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-muted/10 transition-colors"
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm truncate" title={result.Name || ''}>
                                                        {result.Name || t('unknown_subtitle')}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                        {result.Format && (
                                                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-medium">
                                                                {result.Format.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {result.ProviderName && (
                                                            <span>Provider: {result.ProviderName}</span>
                                                        )}
                                                        {result.DownloadCount != null && (
                                                            <span>Downloads: {result.DownloadCount}</span>
                                                        )}
                                                        {result.CommunityRating != null && (
                                                            <span>Rating: {result.CommunityRating.toFixed(1)}⭐</span>
                                                        )}
                                                        {result.Forced && (
                                                            <span className="bg-red-500/20 text-red-600 font-bold px-1 py-0.2 rounded text-[10px]">
                                                                FORCED
                                                            </span>
                                                        )}
                                                        {result.HearingImpaired && (
                                                            <span className="bg-yellow-500/20 text-yellow-600 font-bold px-1 py-0.2 rounded text-[10px]">
                                                                SDH
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={anyDownloading}
                                                    onClick={() => result.Id && handleDownloadToServer(result.Id)}
                                                    className="shrink-0"
                                                >
                                                    {isDownloading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <FileDown className="h-4 w-4" />
                                                    )}
                                                    <span className="ml-1.5 hidden sm:inline">{t('download_to_server')}</span>
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default SubtitleDownloadDialog;
