import createClient from 'openapi-fetch';
import type { components, paths } from '$lib/apis/jellyfin/jellyfin.generated';
import { PUBLIC_JELLYFIN_API_KEY, PUBLIC_JELLYFIN_URL } from '$env/static/public';
import { request } from '$lib/utils';
import type { DeviceProfile } from '$lib/apis/jellyfin/playback-profiles';

export type JellyfinItem = components['schemas']['BaseItemDto'];

export const JELLYFIN_DEVICE_ID = 'Reiverr Client';
export const JELLYFIN_USER_ID = '75dcb061c9404115a7acdc893ea6bbbc';

export const JellyfinApi = createClient<paths>({
	baseUrl: PUBLIC_JELLYFIN_URL,
	headers: {
		Authorization: `MediaBrowser DeviceId="${JELLYFIN_DEVICE_ID}", Token="${PUBLIC_JELLYFIN_API_KEY}"`
	}
});

export const getJellyfinContinueWatching = (): Promise<JellyfinItem[]> =>
	JellyfinApi.get('/Users/{userId}/Items/Resume', {
		params: {
			path: {
				userId: JELLYFIN_USER_ID
			},
			query: {
				mediaTypes: ['Video'],
				fields: ['ProviderIds']
			}
		}
	}).then((r) => r.data?.Items || []);

export const getJellyfinNextUp = () =>
	JellyfinApi.get('/Shows/NextUp', {
		params: {
			query: {
				userId: JELLYFIN_USER_ID,
				fields: ['ProviderIds']
			}
		}
	}).then((r) => r.data?.Items || []);

export const getJellyfinItems = () =>
	JellyfinApi.get('/Users/{userId}/Items', {
		params: {
			path: {
				userId: JELLYFIN_USER_ID
			},
			query: {
				hasTmdbId: true,
				recursive: true,
				includeItemTypes: ['Movie', 'Series'],
				fields: ['ProviderIds']
			}
		}
	}).then((r) => r.data?.Items || []);

// export const getJellyfinSeries = () =>
// 	JellyfinApi.get('/Users/{userId}/Items', {
// 		params: {
// 			path: {
// 				userId: JELLYFIN_USER_ID
// 			},
// 			query: {
// 				hasTmdbId: true,
// 				recursive: true,
// 				includeItemTypes: ['Series'],
// 			}
// 		}
// 	}).then((r) => r.data?.Items || []);

export const getJellyfinEpisodes = () =>
	JellyfinApi.get('/Users/{userId}/Items', {
		params: {
			path: {
				userId: JELLYFIN_USER_ID
			},
			query: {
				recursive: true,
				includeItemTypes: ['Episode']
			}
		},
		headers: {
			'cache-control': 'max-age=10'
		}
	}).then((r) => r.data?.Items || []);

export const getJellyfinEpisodesBySeries = (seriesId: string) =>
	getJellyfinEpisodes().then((items) => items.filter((i) => i.SeriesId === seriesId) || []);

export const getJellyfinItemByTmdbId = (tmdbId: string) =>
	getJellyfinItems().then((items) => items.find((i) => i.ProviderIds?.Tmdb == tmdbId));

export const getJellyfinItem = (itemId: string) =>
	JellyfinApi.get('/Users/{userId}/Items/{itemId}', {
		params: {
			path: {
				itemId,
				userId: JELLYFIN_USER_ID
			}
		}
	}).then((r) => r.data);

export const requestJellyfinItemByTmdbId = () =>
	request((tmdbId: string) => getJellyfinItemByTmdbId(tmdbId));

export const getJellyfinPlaybackInfo = (itemId: string, playbackProfile: DeviceProfile) =>
	JellyfinApi.post('/Items/{itemId}/PlaybackInfo', {
		params: {
			path: {
				itemId: itemId
			},
			query: {
				userId: JELLYFIN_USER_ID,
				startTimeTicks: 0,
				autoOpenLiveStream: true,
				maxStreamingBitrate: 140000000
			}
		},
		body: {
			DeviceProfile: playbackProfile
		}
	}).then((r) => ({
		playbackUrl: r.data?.MediaSources?.[0]?.TranscodingUrl,
		mediaSourceId: r.data?.MediaSources?.[0]?.Id,
		playSessionId: r.data?.PlaySessionId
	}));

export const reportJellyfinPlaybackStarted = (
	itemId: string,
	sessionId: string,
	mediaSourceId: string,
	audioStreamIndex?: number,
	subtitleStreamIndex?: number
) =>
	JellyfinApi.post('/Sessions/Playing', {
		body: {
			CanSeek: true,
			ItemId: itemId,
			PlaySessionId: sessionId,
			MediaSourceId: mediaSourceId,
			AudioStreamIndex: 1,
			SubtitleStreamIndex: -1
		}
	});

export const reportJellyfinPlaybackProgress = (
	itemId: string,
	sessionId: string,
	isPaused: boolean,
	positionTicks: number
) =>
	JellyfinApi.post('/Sessions/Playing/Progress', {
		body: {
			ItemId: itemId,
			PlaySessionId: sessionId,
			IsPaused: isPaused,
			PositionTicks: Math.round(positionTicks),
			CanSeek: true,
			MediaSourceId: itemId
		}
	});

export const reportJellyfinPlaybackStopped = (
	itemId: string,
	sessionId: string,
	positionTicks: number
) =>
	JellyfinApi.post('/Sessions/Playing/Stopped', {
		body: {
			ItemId: itemId,
			PlaySessionId: sessionId,
			PositionTicks: Math.round(positionTicks),
			MediaSourceId: itemId
		}
	});