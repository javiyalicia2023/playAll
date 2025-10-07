import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { youtubeSearchResponseSchema } from '@playall/types';

const MOCK_RESULTS = youtubeSearchResponseSchema.parse({
  items: [
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'Sample Track',
      channelTitle: 'PlayAll',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      durationSeconds: 213
    }
  ]
});

function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(private readonly http: HttpService) {}

  async searchVideos(query: string) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      this.logger.warn('YOUTUBE_API_KEY not set, returning mock results');
      return MOCK_RESULTS;
    }

    const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
    const params = {
      key: apiKey,
      part: 'snippet',
      type: 'video',
      maxResults: '10',
      q: query
    };

    const searchResponse = await firstValueFrom(this.http.get(searchUrl, { params }));
    const items = searchResponse.data.items as Array<{ id: { videoId: string }; snippet: any }>;
    const videoIds = items.map((item) => item.id.videoId).join(',');

    let durations: Record<string, number | null> = {};
    if (videoIds) {
      const videosResponse = await firstValueFrom(
        this.http.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            key: apiKey,
            part: 'contentDetails',
            id: videoIds
          }
        })
      );
      durations = Object.fromEntries(
        (videosResponse.data.items as Array<{ id: string; contentDetails: { duration: string } }>).map((video) => [
          video.id,
          parseDuration(video.contentDetails.duration)
        ])
      );
    }

    return youtubeSearchResponseSchema.parse({
      items: items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? '',
        durationSeconds: durations[item.id.videoId] ?? null
      }))
    });
  }
}
