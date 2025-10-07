import { Injectable, Logger } from '@nestjs/common';
import { youtubeSearchResponseSchema } from '@playall/types';

type YoutubeSearchItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  };
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  async search(query: string, apiKey?: string) {
    if (!query.trim()) {
      return youtubeSearchResponseSchema.parse({ items: [] });
    }

    if (!apiKey) {
      this.logger.warn('Missing YOUTUBE_API_KEY, returning empty search result');
      return youtubeSearchResponseSchema.parse({ items: [] });
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      part: 'snippet',
      type: 'video',
      maxResults: '10',
      safeSearch: 'moderate'
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);

    if (!response.ok) {
      this.logger.error('YouTube API request failed', { status: response.status });
      return youtubeSearchResponseSchema.parse({ items: [] });
    }

    const json = (await response.json()) as { items?: YoutubeSearchItem[] };

    const items = (json.items ?? []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        'https://i.ytimg.com/vi/00000000000/default.jpg',
      durationSeconds: null
    }));

    return youtubeSearchResponseSchema.parse({ items });
  }
}
