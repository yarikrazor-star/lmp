
(function () {
    'use strict';

    if (typeof Lampa === 'undefined' || window.youtube_plugin_ready) return;
    window.youtube_plugin_ready = true;

    var LIMIT_VIDEOS = 12;
    var LIMIT_CHANNELS = 10;
    var FETCH_MAX = 50; 
    
    // Стандартні ключі для ТБ додатків. Якщо Google їх блокує (restricted_client), 
    // користувач має ввести власні в налаштуваннях.
    var DEFAULT_CLIENT_ID = '861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com';
    var DEFAULT_CLIENT_SECRET = 'fkzffq3uC2H-QyHqG2B-sQoX';

    // =================================================================
    // YOUTUBE API
    // =================================================================
    var youtubeApiInstance = null;
    function getYouTubeAPI() {
        if (!youtubeApiInstance) youtubeApiInstance = new YouTubeAPI();
        return youtubeApiInstance;
    }

    function YouTubeAPI() {
        this.apiKey = Lampa.Storage.get('youtube_api_key', '');
        this.region = Lampa.Storage.get('youtube_region', 'UA');
        this.searchController = null;
        this.cacheTimeout = (Lampa.Storage.get('youtube_cache_timeout', 5) || 5) * 60 * 1000;
        this.cachedFavCategory = null; 
    }

    YouTubeAPI.prototype.decodeHTML = function(html) {
        if (!html) return '';
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };

    YouTubeAPI.prototype.formatViews = function(count) {
        if (!count) return '';
        var num = parseInt(count);
        if (isNaN(num)) return '';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    YouTubeAPI.prototype.getDurationSeconds = function(duration) {
        if (!duration) return 0;
        var match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        var h = parseInt(match[1] || 0), m = parseInt(match[2] || 0), s = parseInt(match[3] || 0);
        return h * 3600 + m * 60 + s;
    };

    YouTubeAPI.prototype.formatDuration = function(duration) {
        if (!duration) return '';
        var match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '';
        var h = parseInt(match[1] || 0), m = parseInt(match[2] || 0), s = parseInt(match[3] || 0);
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        return h > 0 ? (h + ':' + pad(m) + ':' + pad(s)) : (m + ':' + pad(s));
    };

    YouTubeAPI.prototype.handleError = function(err) {
        console.error('YouTube API Error:', err);
        if (err && err.code === 401) {
            Lampa.Noty.show('Помилка авторизації. Спробуйте оновити токен або вийти з акаунту в налаштуваннях.');
        } else if (err && err.message) {
            Lampa.Noty.show('Помилка YouTube API: ' + err.message);
        } else {
            Lampa.Noty.show('Помилка YouTube API');
        }
        return { items: [], next: null };
    };

    YouTubeAPI.prototype.getValidToken = function() {
        var accessToken = Lampa.Storage.get('youtube_access_token');
        var refreshToken = Lampa.Storage.get('youtube_refresh_token');
        var expires = Lampa.Storage.get('youtube_token_expires', 0);
        var clientId = Lampa.Storage.get('youtube_client_id') || DEFAULT_CLIENT_ID;
        var clientSecret = Lampa.Storage.get('youtube_client_secret') || DEFAULT_CLIENT_SECRET;
        
        if (!refreshToken || !clientId) return Promise.resolve(null);
        
        if (Date.now() < expires - 60000 && accessToken) {
            return Promise.resolve(accessToken);
        }
        
        var body = 'client_id=' + encodeURIComponent(clientId) + 
                   (clientSecret ? '&client_secret=' + encodeURIComponent(clientSecret) : '') +
                   '&refresh_token=' + encodeURIComponent(refreshToken) + 
                   '&grant_type=refresh_token';
                   
        return fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.access_token) {
                Lampa.Storage.set('youtube_access_token', data.access_token);
                Lampa.Storage.set('youtube_token_expires', Date.now() + (data.expires_in * 1000));
                return data.access_token;
            }
            return null;
        }).catch(function() { return null; });
    };

    YouTubeAPI.prototype.fetchWithAuth = function(url, options) {
        return this.getValidToken().then(function(token) {
            var opts = options || {};
            if (token) {
                opts.headers = opts.headers || {};
                opts.headers['Authorization'] = 'Bearer ' + token;
                // Фікс помилки "different projects"
                url = url.replace(/([?&])key=[^&]+(&|$)/, function(m, p1, p2) {
                    return p2 === '&' ? p1 : '';
                });
            }
            return fetch(url, opts);
        });
    };

    // Отримання рекомендацій для Головної (на основі лайків)
    YouTubeAPI.prototype.getRecommendations = function(pageToken, categoryId) {
        var self = this;
        if (categoryId) return this.getTrending(pageToken, categoryId);

        var accessToken = Lampa.Storage.get('youtube_access_token');
        if (!accessToken) return this.getTrending(pageToken, null); 
        
        var fetchRecs = function(favCatId) {
            var url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=' + self.region + '&maxResults=' + FETCH_MAX;
            if (self.apiKey) url += '&key=' + self.apiKey;
            if (favCatId) url += '&videoCategoryId=' + favCatId;
            if (pageToken) url += '&pageToken=' + pageToken;
            
            return self.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
                if (data.error) return self.handleError(data.error);
                var items = data.items || [];
                var videos = [];
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    var durStr = (it.contentDetails && it.contentDetails.duration) ? it.contentDetails.duration : '';
                    if (self.getDurationSeconds(durStr) > 61) {
                        videos.push({
                            id: it.id, 
                            title: self.decodeHTML(it.snippet.title), 
                            channel: self.decodeHTML(it.snippet.channelTitle),
                            channelId: it.snippet.channelId, 
                            thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || '',
                            views: self.formatViews((it.statistics && it.statistics.viewCount) || 0), 
                            duration: self.formatDuration(durStr)
                        });
                    }
                }
                return { items: videos, next: data.nextPageToken };
            }).catch(function(e) { return self.handleError(e); });
        };
        
        if (self.cachedFavCategory) {
            return fetchRecs(self.cachedFavCategory);
        } else {
            var likeUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=15';
            if (self.apiKey) likeUrl += '&key=' + self.apiKey;
            
            return self.fetchWithAuth(likeUrl).then(function(r) { return r.json(); }).then(function(data) {
                if (data.items && data.items.length > 0) {
                    var catCounts = {};
                    var bestCat = null;
                    var maxCount = 0;
                    for (var i = 0; i < data.items.length; i++) {
                        var cat = data.items[i].snippet.categoryId;
                        if (cat) {
                            catCounts[cat] = (catCounts[cat] || 0) + 1;
                            if (catCounts[cat] > maxCount) {
                                maxCount = catCounts[cat];
                                bestCat = cat;
                            }
                        }
                    }
                    self.cachedFavCategory = bestCat;
                    return fetchRecs(bestCat);
                } else {
                    return fetchRecs(null);
                }
            }).catch(function() { return fetchRecs(null); });
        }
    };

    YouTubeAPI.prototype.getTrending = function(pageToken, categoryId) {
        var url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=' + this.region + '&maxResults=' + FETCH_MAX;
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (categoryId) url += '&videoCategoryId=' + categoryId;
        if (pageToken) url += '&pageToken=' + pageToken;

        var self = this;
        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return self.handleError(data.error);
            var items = data.items || [];
            var videos = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var durStr = (it.contentDetails && it.contentDetails.duration) ? it.contentDetails.duration : '';
                if (self.getDurationSeconds(durStr) > 61) {
                    videos.push({
                        id: it.id, 
                        title: self.decodeHTML(it.snippet.title), 
                        channel: self.decodeHTML(it.snippet.channelTitle),
                        channelId: it.snippet.channelId, 
                        thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || '',
                        views: self.formatViews((it.statistics && it.statistics.viewCount) || 0), 
                        duration: self.formatDuration(durStr)
                    });
                }
            }
            return { items: videos, next: data.nextPageToken };
        }).catch(function(e) { return self.handleError(e); });
    };

    YouTubeAPI.prototype.getLikedVideos = function(pageToken) {
        var url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=' + FETCH_MAX;
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;
        
        var self = this;
        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return self.handleError(data.error);
            var items = data.items || [];
            var videos = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var durStr = (it.contentDetails && it.contentDetails.duration) ? it.contentDetails.duration : '';
                videos.push({
                    id: it.id, 
                    title: self.decodeHTML(it.snippet.title), 
                    channel: self.decodeHTML(it.snippet.channelTitle),
                    channelId: it.snippet.channelId, 
                    thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || '',
                    views: self.formatViews((it.statistics && it.statistics.viewCount) || 0), 
                    duration: self.formatDuration(durStr)
                });
            }
            return { items: videos, next: data.nextPageToken };
        }).catch(function(e) { return self.handleError(e); });
    };

    YouTubeAPI.prototype.getSubscriptions = function(pageToken) {
        var url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=' + FETCH_MAX;
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;

        var self = this;
        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return self.handleError(data.error);
            var items = data.items || [];
            var channels = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                channels.push({
                    id: (it.snippet && it.snippet.resourceId && it.snippet.resourceId.channelId) || '', 
                    title: self.decodeHTML(it.snippet.title), 
                    isChannel: true,
                    thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || ''
                });
            }
            return { items: channels, next: data.nextPageToken };
        }).catch(function(e) { return self.handleError(e); });
    };

    // Отримання ТІЛЬКИ відео з підписок
    YouTubeAPI.prototype.getSubscriptionVideos = function(pageToken) {
        var self = this;
        var url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&order=unread&maxResults=10';
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;

        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return { items: [], next: null };
            var playlistIds = [];
            var items = data.items || [];
            
            for (var i = 0; i < items.length; i++) {
                var chId = (items[i].snippet && items[i].snippet.resourceId && items[i].snippet.resourceId.channelId) || '';
                if (chId) playlistIds.push(chId.replace(/^UC/, 'UU'));
            }
            
            if (!playlistIds.length) return { items: [], next: data.nextPageToken };

            var promises = [];
            for (var j = 0; j < playlistIds.length; j++) {
                var pUrl = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=2&playlistId=' + playlistIds[j];
                promises.push(self.fetchWithAuth(pUrl).then(function(r) { return r.json(); }));
            }
            
            return Promise.all(promises).then(function(results) {
                var rawVideos = [];
                for (var k = 0; k < results.length; k++) {
                    var pData = results[k];
                    if (pData && pData.items) {
                        for (var m = 0; m < pData.items.length; m++) rawVideos.push(pData.items[m]);
                    }
                }
                
                rawVideos.sort(function(a, b) {
                    return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();
                });
                
                var videoIds = [];
                for (var n = 0; n < rawVideos.length; n++) {
                    if (rawVideos[n].snippet && rawVideos[n].snippet.resourceId && rawVideos[n].snippet.resourceId.videoId) {
                        videoIds.push(rawVideos[n].snippet.resourceId.videoId);
                    }
                }
                
                if (!videoIds.length) return { items: [], next: data.nextPageToken };
                
                var detailsPromises = [];
                for (var b = 0; b < videoIds.length; b+=50) {
                    var chunk = videoIds.slice(b, b+50);
                    var detailsUrl = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=' + chunk.join(',');
                    detailsPromises.push(self.fetchWithAuth(detailsUrl).then(function(r) { return r.json(); }));
                }
                
                return Promise.all(detailsPromises).then(function(dResults) {
                    var detailsMap = {};
                    for(var dr=0; dr<dResults.length; dr++) {
                        var vItems = dResults[dr].items || [];
                        for (var x = 0; x < vItems.length; x++) detailsMap[vItems[x].id] = vItems[x];
                    }
                    
                    var finalVideos = [];
                    var addedVids = {};
                    for (var y = 0; y < rawVideos.length; y++) {
                        var it2 = rawVideos[y];
                        var vid = it2.snippet.resourceId.videoId;
                        if (addedVids[vid]) continue;
                        
                        var d = detailsMap[vid];
                        var durSec = (d && d.contentDetails && d.contentDetails.duration) ? self.getDurationSeconds(d.contentDetails.duration) : 0;
                        if (d && durSec > 61) {
                            finalVideos.push({
                                id: vid, 
                                channelId: it2.snippet.channelId, 
                                title: self.decodeHTML(it2.snippet.title),
                                channel: self.decodeHTML(it2.snippet.channelTitle), 
                                thumbnail: (it2.snippet.thumbnails && it2.snippet.thumbnails.medium && it2.snippet.thumbnails.medium.url) || '',
                                views: self.formatViews((d.statistics && d.statistics.viewCount) || 0), 
                                duration: self.formatDuration((d.contentDetails && d.contentDetails.duration) || '')
                            });
                            addedVids[vid] = true;
                        }
                    }
                    return { items: finalVideos, next: data.nextPageToken };
                });
            });
        }).catch(function() { return { items: [], next: null }; });
    };

    YouTubeAPI.prototype.searchChannels = function(query, pageToken) {
        var url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=' + FETCH_MAX + '&q=' + encodeURIComponent(query);
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;

        var self = this;
        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return { items: [], next: null };
            var items = data.items || [];
            var channels = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                channels.push({
                    id: (it.id && it.id.channelId) || '', 
                    title: self.decodeHTML(it.snippet.title), 
                    isChannel: true,
                    thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || ''
                });
            }
            return { items: channels, next: data.nextPageToken };
        }).catch(function() { return { items: [], next: null }; });
    };

    YouTubeAPI.prototype.searchVideos = function(query, pageToken) {
        if (this.searchController && !pageToken) {
            try { this.searchController.abort(); } catch(e) {}
        }
        
        var fetchOptions = {};
        if (window.AbortController && !pageToken) {
            this.searchController = new window.AbortController();
            fetchOptions.signal = this.searchController.signal;
        }

        var url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=' + FETCH_MAX + '&q=' + encodeURIComponent(query);
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;

        var self = this;
        return this.fetchWithAuth(url, fetchOptions).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return self.handleError(data.error);
            var items = data.items || [];
            var videoIds = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].id && items[i].id.videoId) videoIds.push(items[i].id.videoId);
            }
            if (!videoIds.length) return { items: [], next: data.nextPageToken };

            var detailsUrl = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=' + videoIds.join(',');
            if (self.apiKey) detailsUrl += '&key=' + self.apiKey;
            
            return self.fetchWithAuth(detailsUrl, fetchOptions)
                .then(function(r) { return r.json(); }).then(function(vData) {
                    var detailsMap = {};
                    var vItems = vData.items || [];
                    for (var j = 0; j < vItems.length; j++) detailsMap[vItems[j].id] = vItems[j];

                    var videos = [];
                    for (var k = 0; k < items.length; k++) {
                        var it = items[k];
                        var vid = it.id && it.id.videoId;
                        var d = detailsMap[vid];
                        var durSec = (d && d.contentDetails && d.contentDetails.duration) ? self.getDurationSeconds(d.contentDetails.duration) : 0;
                        if (d && durSec > 61) {
                            videos.push({
                                id: vid, 
                                channelId: it.snippet.channelId, 
                                title: self.decodeHTML(it.snippet.title),
                                channel: self.decodeHTML(it.snippet.channelTitle), 
                                thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || '',
                                views: self.formatViews((d.statistics && d.statistics.viewCount) || 0), 
                                duration: self.formatDuration((d.contentDetails && d.contentDetails.duration) || '')
                            });
                        }
                    }
                    return { items: videos, next: data.nextPageToken };
                });
        }).catch(function(e) { if (e.name === 'AbortError') throw e; return { items: [], next: null }; });
    };

    YouTubeAPI.prototype.getChannelVideos = function(channelId, pageToken) {
        var playlistId = channelId.replace(/^UC/, 'UU');
        var url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=' + FETCH_MAX + '&playlistId=' + playlistId;
        if (this.apiKey) url += '&key=' + this.apiKey;
        if (pageToken) url += '&pageToken=' + pageToken;

        var self = this;
        return this.fetchWithAuth(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.error) return { items: [], next: null };
            var items = data.items || [];
            var videoIds = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].snippet && items[i].snippet.resourceId && items[i].snippet.resourceId.videoId) {
                    videoIds.push(items[i].snippet.resourceId.videoId);
                }
            }
            if (!videoIds.length) return { items: [], next: data.nextPageToken };

            var detailsUrl = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=' + videoIds.join(',');
            if (self.apiKey) detailsUrl += '&key=' + self.apiKey;
            
            return self.fetchWithAuth(detailsUrl)
                .then(function(r) { return r.json(); }).then(function(vData) {
                    var detailsMap = {};
                    var vItems = vData.items || [];
                    for (var j = 0; j < vItems.length; j++) detailsMap[vItems[j].id] = vItems[j];

                    var videos = [];
                    for (var k = 0; k < items.length; k++) {
                        var it = items[k];
                        var vid = it.snippet.resourceId.videoId;
                        var d = detailsMap[vid];
                        var durSec = (d && d.contentDetails && d.contentDetails.duration) ? self.getDurationSeconds(d.contentDetails.duration) : 0;
                        if (d && durSec > 61) {
                            videos.push({
                                id: vid, 
                                channelId: channelId, 
                                title: self.decodeHTML(it.snippet.title),
                                channel: self.decodeHTML(it.snippet.channelTitle), 
                                thumbnail: (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || '',
                                views: self.formatViews((d.statistics && d.statistics.viewCount) || 0), 
                                duration: self.formatDuration((d.contentDetails && d.contentDetails.duration) || '')
                            });
                        }
                    }
                    return { items: videos, next: data.nextPageToken };
                });
        }).catch(function() { return { items: [], next: null }; });
    };

    YouTubeAPI.prototype.getTrailerCache = function(movieId) { 
        try { 
            var c = Lampa.Storage.get('yt_trailer_' + movieId); 
            return c && c.ts > Date.now() - this.cacheTimeout ? c.data : null; 
        } catch(e) { return null; } 
    };
    
    YouTubeAPI.prototype.saveTrailerCache = function(movieId, data) { 
        try { Lampa.Storage.set('yt_trailer_' + movieId, { ts: Date.now(), data: data }); } catch(e) {} 
    };
    
    YouTubeAPI.prototype.clearCache = function() { Lampa.Noty.show('Функція в розробці'); };

    // =================================================================
    // UI CARD COMPONENT
    // =================================================================
    function KinoCard(data, youtubeInstance, playlistItems) {
        this.data = data;
        this.youtube = youtubeInstance;
        this.playlistItems = playlistItems || [];
    }
    
    KinoCard.prototype.render = function(scrollHandler) {
        var self = this;
        if (!KinoCard.template) KinoCard.template = Lampa.Template.get('youtube_card', {});
        var card = KinoCard.template.clone();
        var img = card.find('.ytube-card__img')[0];
        if (img) img.loading = 'lazy';
        
        card.find('.ytube-title').text(this.data.title);

        if (this.data.isChannel) {
            card.addClass('ytube-card-channel');
            card.find('.ytube-date, .ytube-duration').hide();
        } else {
            var dateParts = [];
            if (this.data.channel) dateParts.push(this.data.channel);
            if (this.data.views) dateParts.push(this.data.views + ' пер.');
            card.find('.ytube-date').text(dateParts.join(' • '));
            
            var dur = card.find('.ytube-duration');
            if (this.data.duration) {
                dur.text(this.data.duration).show();
            } else {
                dur.hide();
            }
            
            var tHash = Lampa.Utils.hash('yt_' + this.data.id);
            var tData = Lampa.Timeline.view(tHash);
            if (tData && tData.percent > 0) {
                card.find('.ytube-timeline').show();
                card.find('.ytube-timeline-bar').css('width', tData.percent + '%');
            }
        }

        img.src = this.data.thumbnail || ('https://img.youtube.com/vi/' + this.data.id + '/mqdefault.jpg');
        img.onload = function() { card.addClass('ytube-card--loaded'); };
        img.onerror = function() { if (!self.data.isChannel) img.src = 'https://img.youtube.com/vi/' + self.data.id + '/mqdefault.jpg'; };

        card.on('hover:focus', function() { 
            if (scrollHandler) scrollHandler(card); 
        });
        
        card.on('hover:enter', function() { 
            if (self.youtube) {
                if (self.data.isChannel) {
                    self.youtube.openChannel(self.data.id, self.data.title);
                } else {
                    self.youtube.playVideo(self.data, self.playlistItems);
                }
            }
        });
        
        card.on('hover:long contextmenu', function(e) { 
            if (e.type === 'contextmenu') { e.preventDefault(); e.stopPropagation(); }
            if (self.youtube) {
                self.youtube.showVideoMenu(self.data, self.playlistItems);
            }
        });
        
        return card;
    };

    // =================================================================
    // MAIN YOUTUBE COMPONENT
    // =================================================================
    function YouTube() {
        var mainScroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
        var html = $('<div class="youtube-content"></div>');
        var api = getYouTubeAPI();
        var catsDiv;
        var self = this;
        
        // Встановлюємо порядок: Спочатку Підписки, потім Історія, Пошук і т.д.
        var cats = {};
        
        if (Lampa.Storage.get('youtube_refresh_token')) {
            cats.subscriptions = { title: '🔔 Підписки', id: 'subscriptions' };
        }
        cats.history = { title: '📺 Історія', id: 'history' };
        cats.search = { title: '🔍 Пошук', id: 'search' };
        cats.trending = { title: '🔥 Головна', id: '' };
        
        if (Lampa.Storage.get('youtube_refresh_token')) {
            cats.liked = { title: '👍 Сподобалось', id: 'liked' };
        }

        cats.music = { title: '🎵 Музика', id: '10' };
        cats.movies = { title: '🎬 Фільми', id: '1' };
        cats.gaming = { title: '🎮 Ігри', id: '20' };
        cats.sports = { title: '⚽ Спорт', id: '17' };
        cats.news = { title: '📰 Новини', id: '25' };

        var viewState = 'category'; 
        var currentCategory = 'history';
        var searchQuery = '';
        var searchTimeout;

        var listState = {
            history: { items: [], page: 0, limit: LIMIT_VIDEOS, title: 'Історія переглядів' },
            trending: { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false },
            searchCh: { items: [], page: 0, limit: LIMIT_CHANNELS, token: '', isEof: false, title: 'Канали' },
            searchVid: { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: 'Відео' },
            channel: { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, chId: '', chTitle: '' },
            liked: { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: 'Сподобалось' },
            subChannels: { items: [], page: 0, limit: LIMIT_CHANNELS, token: '', isEof: false, title: 'Ваші підписки' },
            subVideos: { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: 'Останні відео' }
        };

        this.findAndOpenChannel = function(channelName) {
            var self = this;
            this.activity.loader(true);
            
            api.searchChannels(channelName).then(function(data) {
                self.activity.loader(false);
                
                if (data.items && data.items.length > 0) {
                    if (data.items.length === 1) {
                        var channel = data.items[0];
                        self.openChannel(channel.id, channel.title);
                    } else {
                        var selectItems = data.items.map(function(ch) {
                            return { title: ch.title, channel: ch };
                        });
                        
                        Lampa.Select.show({
                            title: 'Виберіть канал: ' + channelName,
                            items: selectItems,
                            onSelect: function(item) {
                                Lampa.Controller.toggle('content');
                                setTimeout(function() { self.openChannel(item.channel.id, item.channel.title); }, 50);
                            },
                            onBack: function() { Lampa.Controller.toggle('content'); }
                        });
                    }
                } else {
                    Lampa.Noty.show('Канал не знайдено');
                }
            }).catch(function() {
                self.activity.loader(false);
                Lampa.Noty.show('Помилка пошуку каналу');
            });
        };

        this.showVideoMenu = function(item, playlistItems) {
            var self = this;
            var items = [];
            
            if (item.isChannel) {
                items.push({ title: '👤 Відкрити канал', action: 'channel' });
                
                Lampa.Select.show({
                    title: item.title,
                    items: items,
                    onSelect: function(a) {
                        Lampa.Controller.toggle('content');
                        if (a.action === 'channel') {
                            setTimeout(function() {
                                if (item.id) self.openChannel(item.id, item.title);
                                else Lampa.Noty.show('Канал не знайдено');
                            }, 50);
                        }
                    },
                    onBack: function() { Lampa.Controller.toggle('content'); }
                });
            } else {
                items.push({ title: '▶ Дивитись відео', action: 'play' });
                
                var vHash = Lampa.Utils.hash('yt_' + item.id);
                var tlData = Lampa.Timeline.view(vHash);
                if (tlData && tlData.percent > 0) {
                    items.push({ title: '🔄 Скинути таймкод', action: 'clear_time' });
                }
                
                if (item.channelId) {
                    items.push({ title: '👤 Відкрити канал автора', action: 'channel' });
                } else {
                    items.push({ title: '🔍 Знайти канал автора', action: 'find_channel' });
                }
                
                Lampa.Select.show({
                    title: 'Дії з відео',
                    items: items,
                    onSelect: function(a) {
                        Lampa.Controller.toggle('content');
                        
                        if (a.action === 'play') {
                            setTimeout(function() { self.playVideo(item, playlistItems || []); }, 50);
                        }
                        else if (a.action === 'clear_time') {
                            var cHash = Lampa.Utils.hash('yt_' + item.id);
                            var cTlData = Lampa.Timeline.view(cHash);
                            cTlData.percent = 0; cTlData.time = 0; cTlData.duration = 0;
                            Lampa.Timeline.update(cTlData);
                            Lampa.Noty.show('Таймкод скинуто');
                            setTimeout(function() { self.renderCurrentView(); }, 50);
                        }
                        else if (a.action === 'channel') {
                            setTimeout(function() {
                                if (item.channelId) self.openChannel(item.channelId, item.channel || 'Канал');
                                else Lampa.Noty.show('Канал не знайдено');
                            }, 50);
                        }
                        else if (a.action === 'find_channel') {
                            setTimeout(function() {
                                if (item.channel) self.findAndOpenChannel(item.channel);
                                else self.findAndOpenChannel(item.title);
                            }, 50);
                        }
                    },
                    onBack: function() { Lampa.Controller.toggle('content'); }
                });
            }
        };

        this.create = function () {
            catsDiv = $('<div class="youtube-categories"></div>');
            Object.keys(cats).forEach(function(cat) {
                var el = $('<div class="youtube-category selector" data-id="' + cat + '"><div class="youtube-category__text">' + cats[cat].title + '</div></div>');
                el.on('hover:enter', function() { self.handleCategoryClick(cat); });
                catsDiv.append(el);
            });
            html.append(catsDiv, mainScroll.render());
            
            var initialCat = Lampa.Storage.get('youtube_refresh_token') ? 'subscriptions' : 'history';
            this.handleCategoryClick(initialCat);
            return this.render();
        };

        this.ensureData = function(key, fetchFn) {
            var st = listState[key];
            var needed = (st.page + 1) * st.limit;
            
            var fetchLoop = function() {
                if (st.items.length < needed && !st.isEof) {
                    return fetchFn(st.token).then(function(res) {
                        if (res && res.items && res.items.length) {
                            var existingIds = {};
                            for (var i = 0; i < st.items.length; i++) existingIds[st.items[i].id] = true;
                            for (var j = 0; j < res.items.length; j++) {
                                if (!existingIds[res.items[j].id]) st.items.push(res.items[j]);
                            }
                        }
                        st.token = (res && res.next) ? res.next : '';
                        if (!res || !res.next) st.isEof = true;
                        return fetchLoop();
                    });
                }
                return Promise.resolve();
            };
            return fetchLoop();
        };

        this.handleCategoryClick = function(catKey) {
            currentCategory = catKey;
            catsDiv.find('.youtube-category').removeClass('active');
            catsDiv.find('[data-id="' + catKey + '"]').addClass('active');
            
            if (catKey === 'search') {
                viewState = 'search';
                this.showSearchInput();
            } else if (catKey === 'history') {
                viewState = 'history';
                listState.history.items = Lampa.Storage.get('youtube_history', []);
                listState.history.page = 0;
                this.renderCurrentView();
            } else if (catKey === 'subscriptions') {
                viewState = 'subscriptions';
                listState.subChannels = { items: [], page: 0, limit: LIMIT_CHANNELS, token: '', isEof: false, title: 'Ваші підписки' };
                listState.subVideos = { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: 'Останні відео' };
                this.activity.loader(true);
                Promise.all([
                    this.ensureData('subChannels', function(t) { return api.getSubscriptions(t); }),
                    this.ensureData('subVideos', function(t) { return api.getSubscriptionVideos(t); })
                ]).then(function() { self.renderCurrentView(); });
            } else if (catKey === 'liked') {
                viewState = 'liked';
                listState.liked = { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: cats[catKey].title };
                this.activity.loader(true);
                this.ensureData('liked', function(t) { return api.getLikedVideos(t); }).then(function() { self.renderCurrentView(); });
            } else {
                viewState = 'category';
                listState.trending = { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false };
                this.activity.loader(true);
                this.ensureData('trending', function(t) { return api.getRecommendations(t, cats[catKey].id); })
                    .then(function() { self.renderCurrentView(); });
            }
        };

        this.showSearchInput = function () {
            mainScroll.clear();
            Lampa.Input.edit({ value: searchQuery, free: true, nosave: true }, function(val) {
                clearTimeout(searchTimeout);
                if (!val || !val.trim()) { self.handleCategoryClick('history'); return; }
                if (val.trim().length < 3) { Lampa.Noty.show('Введіть щонайменше 3 символи'); return; }
                
                searchQuery = val.trim();
                listState.searchCh = { items: [], page: 0, limit: LIMIT_CHANNELS, token: '', isEof: false, title: 'Канали' };
                listState.searchVid = { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, title: 'Відео' };
                
                self.activity.loader(true);
                Promise.all([
                    self.ensureData('searchCh', function(t) { return api.searchChannels(searchQuery, t); }),
                    self.ensureData('searchVid', function(t) { return api.searchVideos(searchQuery, t); })
                ]).then(function() { self.renderCurrentView(); });
            });
        };

        this.openChannel = function(chId, chTitle) {
            viewState = 'channel';
            listState.channel = { items: [], page: 0, limit: LIMIT_VIDEOS, token: '', isEof: false, chId: chId, chTitle: chTitle };
            this.activity.loader(true);
            this.ensureData('channel', function(t) { return api.getChannelVideos(chId, t); })
                .then(function() { self.renderCurrentView(); });
        };

        this.renderCurrentView = function() {
            mainScroll.clear();
            
            if (typeof mainScroll.minus === 'function') mainScroll.minus();
            if (typeof mainScroll.reset === 'function') mainScroll.reset();
            var bodyEl = mainScroll.render().find('.scroll__body');
            if (bodyEl.length) bodyEl.css('transform', 'translate3d(0px, 0px, 0px)');
            
            var scrollHandler = function(el) { mainScroll.update(el); };
            var sections = [];

            var addSection = function(stKey, customTitle, isChannels) {
                var st = listState[stKey];
                var start = st.page * st.limit;
                var slice = st.items.slice(start, start + st.limit);
                
                if (slice.length) {
                    sections.push({
                        stKey: stKey,
                        title: customTitle || st.title, 
                        items: slice, 
                        fullItems: st.items, // Передаємо весь завантажений масив для плейлисту
                        isChannels: isChannels || false,
                        hasPrev: st.page > 0, 
                        hasNext: stKey === 'history' ? (st.items.length > start + st.limit) : (st.items.length > start + st.limit || !st.isEof),
                        onPrev: function() { 
                            if (st.page > 0) {
                                st.page--; 
                                self.renderCurrentView(); 
                            }
                        },
                        onNext: function() { 
                            var prevPage = st.page;
                            st.page++; 
                            self.activity.loader(true);
                            
                            var p;
                            if (stKey === 'trending') p = self.ensureData(stKey, function(t) { return api.getRecommendations(t, cats[currentCategory].id); });
                            else if (stKey === 'searchCh') p = self.ensureData(stKey, function(t) { return api.searchChannels(searchQuery, t); });
                            else if (stKey === 'searchVid') p = self.ensureData(stKey, function(t) { return api.searchVideos(searchQuery, t); });
                            else if (stKey === 'channel') p = self.ensureData(stKey, function(t) { return api.getChannelVideos(st.chId, t); });
                            else if (stKey === 'liked') p = self.ensureData(stKey, function(t) { return api.getLikedVideos(t); });
                            else if (stKey === 'subChannels') p = self.ensureData(stKey, function(t) { return api.getSubscriptions(t); });
                            else if (stKey === 'subVideos') p = self.ensureData(stKey, function(t) { return api.getSubscriptionVideos(t); });
                            else p = Promise.resolve();
                            
                            p.then(function() {
                                var newStart = st.page * st.limit;
                                var newSlice = st.items.slice(newStart, newStart + st.limit);
                                
                                if (newSlice.length === 0) {
                                    st.page = prevPage;
                                    st.isEof = true;
                                    Lampa.Noty.show('Більше немає результатів');
                                }
                                self.renderCurrentView(); 
                            }).catch(function() {
                                st.page = prevPage;
                                Lampa.Noty.show('Помилка завантаження');
                                self.renderCurrentView(); 
                            });
                        }
                    });
                }
                return slice.length > 0;
            };

            if (viewState === 'history') {
                if (!addSection('history')) mainScroll.append($('<div class="yt-empty">Історія порожня</div>'));
            } else if (viewState === 'category') {
                var homeTitle = (cats[currentCategory].id === '' && api.cachedFavCategory) ? 'Рекомендовано для вас' : cats[currentCategory].title;
                if (!addSection('trending', homeTitle)) mainScroll.append($('<div class="yt-empty">Немає відео</div>'));
            } else if (viewState === 'subscriptions') {
                var hasCh = addSection('subChannels', 'Ваші підписки', true);
                var hasVid = addSection('subVideos', 'Останні відео');
                if (!hasCh && !hasVid) mainScroll.append($('<div class="yt-empty">Немає підписок</div>'));
            } else if (viewState === 'liked') {
                if (!addSection('liked', 'Сподобалось')) mainScroll.append($('<div class="yt-empty">Немає відео</div>'));
            } else if (viewState === 'search') {
                var hasCh2 = addSection('searchCh', null, true);
                var hasVid2 = addSection('searchVid');
                if (!hasCh2 && !hasVid2) mainScroll.append($('<div class="yt-empty">Нічого не знайдено</div>'));
            } else if (viewState === 'channel') {
                if (!addSection('channel', 'Останні відео: ' + listState.channel.chTitle)) mainScroll.append($('<div class="yt-empty">Немає відео (або тільки Shorts)</div>'));
            }

            sections.forEach(function(sec) {
                mainScroll.append($('<div class="yt-section-title">' + sec.title + '</div>'));
                
                if (sec.stKey !== 'history' && (sec.hasPrev || sec.hasNext)) {
                    var pagDiv = $('<div class="yt-pagination-wrapper"></div>');
                    
                    var btnPrev = $('<div class="yt-btn-pagination">Попередні</div>');
                    if (sec.hasPrev) {
                        btnPrev.addClass('selector');
                        btnPrev.on('hover:focus', function() { scrollHandler($(this)); });
                        btnPrev.on('hover:enter', sec.onPrev);
                    } else {
                        btnPrev.addClass('disabled');
                    }
                    
                    var btnNext = $('<div class="yt-btn-pagination">Наступні</div>');
                    if (sec.hasNext) {
                        btnNext.addClass('selector');
                        btnNext.on('hover:focus', function() { scrollHandler($(this)); });
                        btnNext.on('hover:enter', sec.onNext);
                    } else {
                        btnNext.addClass('disabled');
                    }
                    
                    pagDiv.append(btnPrev, btnNext);
                    mainScroll.append(pagDiv);
                }

                var grid = $('<div class="youtube-grid ' + (sec.isChannels ? 'youtube-grid--channels' : '') + '"></div>');
                sec.items.forEach(function(item) {
                    var card = new KinoCard(item, self, sec.fullItems);
                    grid.append(card.render(scrollHandler));
                });
                mainScroll.append(grid);
            });

            this.finalizeRender();
        };

        this.finalizeRender = function() {
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(mainScroll.render());
                    var elements = mainScroll.render().find('.selector');
                    Lampa.Controller.collectionFocus(elements.length ? elements.eq(0)[0] : false, mainScroll.render());
                },
                left: function() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function() { if (Navigator.canmove('right')) Navigator.move('right'); },
                up: function() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('youtube_categories'); },
                down: function() { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: self.customBack.bind(self)
            });
            
            Lampa.Controller.toggle('content');
            setTimeout(function() { self.activity.loader(false); }, 50); 
        };

        this.playVideo = function (video, playlistItems) {
            // ФІКС 13.0: Захист від подвійного кліку для запобігання появі "фонового" плеєру
            if (this.video_playing_lock) return;
            this.video_playing_lock = true;
            var self = this;
            setTimeout(function() { self.video_playing_lock = false; }, 800);

            playlistItems = playlistItems || [];
            
            var videoToSave = {
                id: video.id,
                title: video.title,
                channel: video.channel || '',
                channelId: video.channelId || '',
                thumbnail: video.thumbnail || '',
                duration: video.duration || '',
                views: video.views || ''
            };
            
            var h = Lampa.Storage.get('youtube_history', []).filter(function(i) { return i.id !== video.id; });
            h.unshift(videoToSave); 
            Lampa.Storage.set('youtube_history', h.slice(0, 50));
            
            if (viewState === 'history') {
                listState.history.items = h; 
            }

            try {
                var playerItems = [];
                for (var i = 0; i < playlistItems.length; i++) {
                    if (!playlistItems[i].isChannel) {
                        var pHash = Lampa.Utils.hash('yt_' + playlistItems[i].id);
                        playerItems.push({
                            title: playlistItems[i].title,
                            url: 'https://www.youtube.com/watch?v=' + playlistItems[i].id,
                            youtube: true,
                            timeline: Lampa.Timeline.view(pHash)
                        });
                    }
                }

                if (playerItems.length === 0) {
                    var vHash = Lampa.Utils.hash('yt_' + video.id);
                    playerItems = [{ 
                        title: video.title, 
                        url: 'https://www.youtube.com/watch?v=' + video.id, 
                        youtube: true,
                        timeline: Lampa.Timeline.view(vHash)
                    }];
                }

                var currentIndex = 0;
                for (var j = 0; j < playerItems.length; j++) {
                    if (playerItems[j].url.indexOf(video.id) !== -1) {
                        currentIndex = j;
                        break;
                    }
                }

                // ФІКС 13.0: Lampa сама чудово знищує старе відео при виклику .play()
                // Тут ми не використовуємо destroy() (який ламає інтерфейс), а просто замінюємо плейлист.
                Lampa.Player.play(playerItems[currentIndex]);
                
                if (playerItems.length > 0) {
                    Lampa.Player.playlist(playerItems); 
                }

            } catch (e) { 
                Lampa.Noty.show('Помилка відтворення'); 
            }
        };

        this.customBack = function() {
            if (viewState === 'channel') {
                viewState = 'search';
                this.handleCategoryClick('search'); 
                if (searchQuery) this.renderCurrentView(); 
                return;
            }
            Lampa.Activity.backward();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            
            if (viewState === 'history') {
                listState.history.items = Lampa.Storage.get('youtube_history', []);
                this.renderCurrentView();
            }

            var nav = { 
                left: function() { if (Navigator.canmove('left')) Navigator.move('left'); }, 
                right: function() { if (Navigator.canmove('right')) Navigator.move('right'); } 
            };
            Lampa.Controller.add('youtube_categories', { 
                toggle: function() { 
                    Lampa.Controller.collectionSet(catsDiv); 
                    var activeCat = catsDiv.find('.active');
                    Lampa.Controller.collectionFocus(activeCat.length ? activeCat[0] : false, catsDiv); 
                }, 
                left: nav.left, right: nav.right, 
                down: function() { Lampa.Controller.toggle('content'); }, 
                up: function() { Lampa.Controller.toggle('head'); }, 
                back: this.customBack.bind(this) 
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function() { clearTimeout(searchTimeout); };
        this.stop = function() {};
        this.render = function() { return html[0]; };
        this.destroy = function () {
            clearTimeout(searchTimeout);
            Lampa.Controller.remove('youtube_categories'); Lampa.Controller.remove('content');
            mainScroll.destroy(); html.remove(); catsDiv = null;
        };
    }

    Lampa.Component.add('youtube', YouTube);
    Lampa.Template.add('youtube_card', '' +
        '<div class="ytube-card selector">' +
            '<div class="ytube-card__view">' +
                '<img src="./img/img_load.svg" class="ytube-card__img" loading="lazy">' +
                '<div class="ytube-duration" style="display:none;"></div>' +
                '<div class="ytube-timeline" style="display:none;"><div class="ytube-timeline-bar"></div></div>' +
            '</div>' +
            '<div class="ytube-title"></div><div class="ytube-date"></div>' +
        '</div>'
    );

    // =================================================================
    // OAUTH AUTHORIZATION
    // =================================================================
    function startOAuth() {
        var clientId = Lampa.Storage.get('youtube_client_id', '') || DEFAULT_CLIENT_ID;
        var clientSecret = Lampa.Storage.get('youtube_client_secret', '') || DEFAULT_CLIENT_SECRET;
        
        var body = 'client_id=' + encodeURIComponent(clientId) + '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly');
        
        fetch('https://oauth2.googleapis.com/device/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        }).then(function(r) { return r.json(); }).then(function(data) {
            
            if (data.error) {
                if (data.error === 'restricted_client') {
                    Lampa.Modal.open({
                        title: 'Потрібен власний Client ID',
                        html: $('<div style="padding:20px; font-size:16px;">' +
                              '<div style="margin-bottom:15px; color:#ff0000; font-weight:bold;">Стандартний Client ID заблоковано Google для цього пристрою.</div>' +
                              'Щоб авторизуватись, створіть безкоштовні власні дані OAuth:<br><br>' +
                              '<div style="line-height:1.5;">' +
                              '1. Перейдіть з ПК/телефону на <b>console.cloud.google.com</b><br>' +
                              '2. Створіть проект та увімкніть <b>YouTube Data API v3</b><br>' +
                              '3. Перейдіть до "Credentials", створіть <b>OAuth Client ID</b><br>' +
                              '4. ⚠️ <b>ВАЖЛИВО:</b> Виберіть тип <b>"ТБ та пристрої з обмеженим вводом"</b><br>' +
                              '5. Скопіюйте <b>Client ID</b> та <b>Client Secret</b> у налаштування цього плагіну.<br>' +
                              '</div></div>'),
                        size: 'medium',
                        onBack: function() { Lampa.Modal.close(); }
                    });
                    return;
                }
                return Lampa.Noty.show('Помилка: ' + (data.error_description || data.error));
            }
            
            var modalHtml = '<div style="text-align:center; padding: 20px;">' +
                '<div style="font-size:18px; margin-bottom:10px;">Відкрийте на телефоні або ПК:</div>' +
                '<div style="font-size:24px; font-weight:bold; color:#3ea6ff; margin-bottom:20px;">' + data.verification_url + '</div>' +
                '<div style="font-size:18px; margin-bottom:10px;">Введіть цей код:</div>' +
                '<div style="font-size:32px; font-weight:bold; letter-spacing:5px; background:rgba(0,0,0,0.3); padding:10px; border-radius:10px;">' + data.user_code + '</div>' +
                '<div style="margin-top:20px; font-size:14px; color:#aaa;">Очікування авторизації... (не закривайте вікно)</div>' +
                '</div>';
                
            var pollInterval;
            Lampa.Modal.open({
                title: 'Авторизація YouTube',
                html: $(modalHtml),
                size: 'medium',
                onBack: function() {
                    Lampa.Modal.close();
                    clearInterval(pollInterval);
                }
            });
            
            pollInterval = setInterval(function() {
                var pollBody = 'client_id=' + encodeURIComponent(clientId) + 
                               (clientSecret ? '&client_secret=' + encodeURIComponent(clientSecret) : '') +
                               '&device_code=' + encodeURIComponent(data.device_code) + 
                               '&grant_type=urn:ietf:params:oauth:grant-type:device_code';
                fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: pollBody
                }).then(function(r) { return r.json(); }).then(function(pollData) {
                    if (pollData.access_token) {
                        clearInterval(pollInterval);
                        Lampa.Storage.set('youtube_access_token', pollData.access_token);
                        Lampa.Storage.set('youtube_refresh_token', pollData.refresh_token);
                        Lampa.Storage.set('youtube_token_expires', Date.now() + (pollData.expires_in * 1000));
                        Lampa.Modal.close();
                        Lampa.Noty.show('Успішно авторизовано! Перезайдіть у плагін.');
                        
                        var act = Lampa.Activity.active();
                        if (act && act.component === 'youtube') {
                            Lampa.Activity.backward();
                            setTimeout(function(){ Lampa.Activity.push({ url: '', title: 'YouTube', component: 'youtube', page: 1 }); }, 200);
                        }
                    } else if (pollData.error && pollData.error !== 'authorization_pending') {
                        clearInterval(pollInterval);
                        Lampa.Modal.close();
                        Lampa.Noty.show('Помилка авторизації: ' + pollData.error);
                    }
                }).catch(function() {});
            }, (data.interval || 5) * 1000);
        }).catch(function() {
            Lampa.Noty.show('Мережева помилка при ініціалізації авторизації');
        });
    }

    // =================================================================
    // TRAILERS LOGIC
    // =================================================================
    var UKRAINIAN_CHANNELS = ['FilmTrailerUA', 'TrailersUA', 'B&H Film Distribution', 'B&H Film Distribution Company', 'Kinomania Film Distribution', 'Adastra Cinema', 'UFD', 'MULTIPLEX', 'Планета Кіно', 'Planeta Kino', 'Arthouse Traffic', 'ACTION!'];
    
    function sortByUkrainianPriority(videos) { 
        return videos.sort(function(a, b) { 
            var aUkr = UKRAINIAN_CHANNELS.indexOf(a.channel) !== -1 ? 1 : 0;
            var bUkr = UKRAINIAN_CHANNELS.indexOf(b.channel) !== -1 ? 1 : 0;
            return bUkr - aUkr; 
        }); 
    }

    function performSearchTrailer(api, query, movieId, localizedTitle, originalTitle, year) {
        var cachedTrailers = api.getTrailerCache(movieId);
        if (cachedTrailers) { showTrailerResults(api, cachedTrailers, movieId, localizedTitle, originalTitle, year); return; }
        if (api.apiKey) {
            api.searchVideos(query).then(function(data) {
                if (data.items && data.items.length) {
                    var sortedVideos = sortByUkrainianPriority(data.items.slice());
                    api.saveTrailerCache(movieId, sortedVideos);
                    showTrailerResults(api, sortedVideos, movieId, localizedTitle, originalTitle, year);
                } else { Lampa.Noty.show('Трейлерів не знайдено'); }
            });
        } else {
            var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
            if (Lampa.Platform.is('android')) Lampa.Android.openYoutube(youtubeUrl); else window.open(youtubeUrl, '_blank');
        }
    }

    function showTrailerResults(api, videos, movieId, localizedTitle, originalTitle, year) {
        var items = [];
        for (var i = 0; i < videos.length; i++) {
            var v = videos[i];
            items.push({ 
                title: v.title, subtitle: v.channel, id: v.id, 
                url: 'https://www.youtube.com/watch?v=' + v.id, youtube: true, 
                icon: '<img src="' + v.thumbnail + '" class="size-youtube"/>', template: 'selectbox_icon' 
            });
        }
        items.unshift({ title: '🔍 Уточнити пошук', search_refine: true });
        
        Lampa.Select.show({
            title: 'Українські трейлери', items: items,
            onSelect: function(a) {
                Lampa.Controller.toggle('content'); 
                if (a.search_refine) {
                    setTimeout(function() { showSearchOptions(api, movieId, localizedTitle, originalTitle, year); }, 50);
                } else {
                    // ФІКС 13.0: Захист від подвійного кліку
                    if (window.trailer_playing_lock) return;
                    window.trailer_playing_lock = true;
                    setTimeout(function() { window.trailer_playing_lock = false; }, 800);
                    
                    Lampa.Player.play(a);
                    
                    var playlist = [];
                    for (var j = 0; j < items.length; j++) {
                        if (!items[j].search_refine) playlist.push({ title: items[j].title, url: items[j].url, youtube: true });
                    }
                    if (playlist.length > 0) Lampa.Player.playlist(playlist);
                }
            },
            onBack: function() { Lampa.Controller.toggle('content'); }
        });
    }

    function showSearchOptions(api, movieId, localizedTitle, originalTitle, year) {
        var searchOptions = [];
        var savedClarification = Lampa.Storage.get('trailer_clarification', {});
        if (savedClarification[movieId]) searchOptions.push({ title: 'Останній пошук: ' + savedClarification[movieId], query: savedClarification[movieId] + ' трейлер укр' });
        searchOptions.push({ title: originalTitle + ' (' + year + ')', query: originalTitle + ' ' + year + ' трейлер укр' });
        searchOptions.push({ title: localizedTitle, query: localizedTitle + ' трейлер укр' });
        if (originalTitle !== localizedTitle) searchOptions.push({ title: originalTitle, query: originalTitle + ' трейлер укр' });
        searchOptions.push({ title: 'Ввести вручну', custom: true });
        
        Lampa.Select.show({
            title: 'Варіанти пошуку', items: searchOptions,
            onSelect: function(a) {
                Lampa.Controller.toggle('content');
                if (a.custom) {
                    setTimeout(function() {
                        Lampa.Input.edit({ title: 'Введіть назву для пошуку', value: localizedTitle, free: true, nosave: true }, function(newValue) {
                            if (newValue && newValue.trim().length >= 3) {
                                var query = newValue.trim() + ' трейлер укр';
                                var clarifications = Lampa.Storage.get('trailer_clarification', {});
                                clarifications[movieId] = newValue.trim();
                                Lampa.Storage.set('trailer_clarification', clarifications);
                                performSearchTrailer(api, query, movieId, localizedTitle, originalTitle, year);
                            } else if (newValue && newValue.trim().length < 3) { 
                                Lampa.Noty.show('Введіть щонайменше 3 символи'); 
                            }
                        });
                    }, 50);
                } else { 
                    setTimeout(function() { performSearchTrailer(api, a.query, movieId, localizedTitle, originalTitle, year); }, 50); 
                }
            },
            onBack: function() { Lampa.Controller.toggle('content'); }
        });
    }

    function createUkrTrailerButton(movie) {
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var localizedTitle = movie.title || movie.original_title || movie.original_name;
        var originalTitle = movie.original_title || movie.original_name || movie.title;
        var movieId = Lampa.Utils.hash(originalTitle);
        var button = $('<div class="full-start__button selector view--ukr-trailer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" stroke="#0057B8" stroke-width="1.5"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" stroke="#FFD700" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Укр. трейлер</span></div>');
        button.on('hover:enter', function() { performSearchTrailer(getYouTubeAPI(), originalTitle + ' ' + year + ' трейлер укр', movieId, localizedTitle, originalTitle, year); });
        return button;
    }

    function addUkrTrailerButton() {
        var addButtonToCurrentPage = function() { 
            try { 
                var a = Lampa.Activity.active(); 
                if (a && a.component === 'full' && a.card) { 
                    var r = a.activity.render(); 
                    if (r && !r.find('.view--ukr-trailer').length) { 
                        r.find('.view--trailer').after(createUkrTrailerButton(a.card)); Lampa.Layer.update(); 
                    } 
                } 
            } catch (e) {} 
        };
        var removeButtonFromCurrentPage = function() { 
            try { 
                var a = Lampa.Activity.active(); 
                if (a && a.component === 'full') { 
                    var r = a.activity.render(); 
                    if (r) { r.find('.view--ukr-trailer').remove(); Lampa.Layer.update(); } 
                } 
            } catch (e) {} 
        };
        
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' && Lampa.Storage.get('youtube_show_ukr_trailer_button', false)) {
                var movie = e.data.movie;
                var originalTitle = movie.original_title || movie.original_name || movie.title;
                var movieId = Lampa.Utils.hash(originalTitle);
                var api = getYouTubeAPI();
                if (!api.getTrailerCache(movieId) && api.apiKey) {
                    var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
                    api.searchVideos(originalTitle + ' ' + year + ' трейлер укр').then(function(d) {
                        if (d.items && d.items.length) {
                            api.saveTrailerCache(movieId, sortByUkrainianPriority(d.items.slice()));
                        }
                    });
                }
                e.object.activity.render().find('.view--trailer').after(createUkrTrailerButton(movie));
                Lampa.Layer.update();
            }
        });
        window.__youtube_trailer_button = { add: addButtonToCurrentPage, remove: removeButtonFromCurrentPage };
    }

    // =================================================================
    // SETTINGS & MENU & INIT
    // =================================================================
    function addMenuItem() {
        var btn = $('<li class="menu__item selector"><div class="menu__ico"><svg height="44" viewBox="0 0 24 24" fill="none"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/></svg></div><div class="menu__text">YouTube</div></li>');
        btn.on('hover:enter', function() { Lampa.Activity.push({ url: '', title: 'YouTube', component: 'youtube', page: 1 }); });
        $('.menu .menu__list').eq(0).append(btn);
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: 'youtube', name: 'YouTube', icon: '<svg height="44" viewBox="0 0 24 24" fill="none"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/></svg>' });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_api_key', type: 'input', values: '', default: '' }, field: { name: 'YouTube API Ключ', description: 'Ключ YouTube Data API v3 (AIza...)' } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_region', type: 'select', values: { UA: 'Україна', US: 'USA', RU: 'Росія', DE: 'Німеччина', GB: 'Велика Британія', FR: 'Франція', PL: 'Польща' }, default: 'UA' }, field: { name: 'Регіон', description: 'Регіон для трендів' } });
        
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_client_id', type: 'input', values: '', default: '' }, field: { name: 'Власний Client ID (OAuth)', description: 'Вставте ваш Client ID типу "ТБ та пристрої з обмеженим вводом"' } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_client_secret', type: 'input', values: '', default: '' }, field: { name: 'Власний Client Secret (OAuth)', description: 'Вставте ваш Client Secret (якщо є)' } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_auth_btn', type: 'button' }, field: { name: '🔑 Увійти в акаунт (OAuth)', description: 'Авторизація для доступу до підписок та рекомендацій' }, onChange: function() { startOAuth(); } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_logout_btn', type: 'button' }, field: { name: '🚪 Вийти з акаунту', description: 'Видалити дані авторизації (всі токени)' }, onChange: function() { Lampa.Storage.set('youtube_access_token', ''); Lampa.Storage.set('youtube_refresh_token', ''); Lampa.Noty.show('Вийшли з акаунту'); } });

        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_cache_timeout', type: 'select', values: { 1: '1 хвилина', 5: '5 хвилин', 15: '15 хвилин', 30: '30 хвилин', 60: '1 година' }, default: 5 }, field: { name: 'Час кешування', description: 'Як часто оновлювати дані' } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_clear_cache', type: 'trigger', default: false }, field: { name: 'Очистити кеш', description: 'Видалити кешовані дані' }, onChange: function() { getYouTubeAPI().clearCache(); Lampa.Noty.show('Кеш очищено!'); } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_clear_history', type: 'trigger', default: false }, field: { name: 'Очистити історію', description: 'Видалити всю історію переглядів' }, onChange: function() { Lampa.Storage.set('youtube_history', []); Lampa.Noty.show('Історію очищено!'); } });
        Lampa.SettingsApi.addParam({ component: 'youtube', param: { name: 'youtube_show_ukr_trailer_button', type: 'trigger', default: false }, field: { name: 'Кнопка "Укр. трейлер"', description: 'Показувати кнопку пошуку українських трейлерів' }, onChange: function(value) { Lampa.Storage.set('youtube_show_ukr_trailer_button', value); if (value) { if (window.__youtube_trailer_button) window.__youtube_trailer_button.add(); Lampa.Noty.show('Кнопку додано'); } else { if (window.__youtube_trailer_button) window.__youtube_trailer_button.remove(); Lampa.Noty.show('Кнопку видалено'); } } });
    }

    function addStyles() {
        var css = '' +
            '.youtube-content { padding: 10px; }' +
            '.youtube-categories { display: flex; padding: 1.5em 1em; gap: 1em; overflow-x: auto; }' +
            '.youtube-category { flex-shrink: 0; padding: 12px 24px; border-radius: 50px; background: rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; border: 2px solid transparent; }' +
            '.youtube-category.active { background: #fff; }' +
            '.youtube-category.active .youtube-category__text { color: #000; }' +
            '.youtube-category.focus { background: #3ea6ff; border-color: #fff; transform: scale(1.05); z-index: 10; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }' +
            '.youtube-category.focus .youtube-category__text { color: #000; }' +
            '.youtube-category__text { font-size: 16px; color: #fff; font-weight: 600; white-space: nowrap; transition: color 0.3s; }' +
            '.yt-section-title { font-size: 22px; font-weight: bold; padding: 10px 15px; color: #fff; margin-top: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px; }' +
            '.yt-empty { text-align: center; padding: 50px; color: #aaa; font-size: 20px; }' +
            '.youtube-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(18em, 1fr)); gap: 1.5em; padding: 0.5em 1em 5em 1em; width: 100%; box-sizing: border-box; }' +
            '.youtube-grid--channels { grid-template-columns: repeat(10, 1fr) !important; gap: 1em; }' +
            '.youtube-grid--channels .ytube-title { font-size: 0.85em; }' +
            '.ytube-card { display: flex; flex-direction: column; cursor: pointer; transition: transform 0.2s ease; margin: 0; min-width: 0; box-sizing: border-box; }' +
            '.ytube-card.focus { transform: scale(1.05); z-index: 10; }' +
            '.ytube-card__view { position: relative; padding-bottom: 56.25%; background: #1a1a1a; border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s; width: 100%; }' +
            '.ytube-card.focus .ytube-card__view { box-shadow: 0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.9); }' +
            '.ytube-card__img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }' +
            '.ytube-card-channel { align-items: center; }' +
            '.ytube-card-channel .ytube-card__view { width: 70%; padding-bottom: 70%; border-radius: 50%; background: transparent; }' +
            '.ytube-card-channel .ytube-card__img { border-radius: 50%; }' +
            '.ytube-card-channel .ytube-title { text-align: center; margin-top: 10px; white-space: normal; line-height: 1.3; }' +
            '.ytube-duration { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 0.85em; font-weight: bold; }' +
            '.ytube-timeline { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); z-index: 10; pointer-events: none; }' +
            '.ytube-timeline-bar { height: 100%; background: #ff0000; transition: width 0.3s; }' +
            '.ytube-title { font-size: 1.1em; font-weight: 600; margin-top: 10px; color: var(--text-color, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }' +
            '.ytube-date { font-size: 0.9em; color: #aaa; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }' +
            '.yt-pagination-wrapper { display: flex; justify-content: center; gap: 15px; padding: 5px 15px 15px 15px; margin-bottom: 10px; margin-top: 5px; width: 100%; box-sizing: border-box; }' +
            '.yt-btn-pagination { flex: 1; max-width: 400px; position: relative; text-align: center; background: #ff0000; color: #ffffff; padding: 14px 20px; border-radius: 8px; font-size: 16px; font-weight: bold; transition: background 0.2s, color 0.2s; box-sizing: border-box; }' +
            '.yt-btn-pagination.selector { cursor: pointer; }' +
            '.yt-btn-pagination.focus { background: #ffffff; color: #ff0000; z-index: 10; box-shadow: none; transform: none; }' +
            '.yt-btn-pagination.disabled { background: #333; color: #777; opacity: 0.6; cursor: default; }' +
            '.view--ukr-trailer { background: linear-gradient(45deg, #0057B8, #FFD700) !important; }' +
            '.view--ukr-trailer span { color: white; font-weight: 500; }' +
            '@media (max-width: 768px), (orientation: portrait) { .youtube-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.8em; padding: 0.5em 0.8em 5em 0.8em; } .youtube-grid--channels { grid-template-columns: repeat(2, 1fr) !important; } .yt-btn-pagination { font-size: 14px; padding: 12px 10px; } .yt-pagination-wrapper { gap: 10px; padding: 5px 10px 15px 10px; } .ytube-title { font-size: 1em; margin-top: 6px; } }';
        $('<style>').text(css).appendTo('head');
    }

    function init() {
        addMenuItem(); addSettings(); addUkrTrailerButton(); addStyles();
    }
    
    if (window.appready) { 
        init(); 
    } else { 
        Lampa.Listener.follow('app', function(e) { if (e.type == 'ready') init(); }); 
    }
})();