(function () {
    'use strict';

    if (window.YDesignLoaded) return;
    window.YDesignLoaded = true;

    // =========================================================================
    // 1. КОНФІГУРАЦІЯ ТА ВЕКТОРНІ ІКОНКИ РЕЙТИНГІВ
    // =========================================================================
    var CONFIG = {
        name: 'YDesign',
        cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 днів
        tmdbKey: function () {
            try {
                return (window.Lampa && Lampa.TMDB && Lampa.TMDB.key) ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96';
            } catch (e) {
                return '4ef0d7355d9ffb5151e987764708ce96';
            }
        }
    };

    var rateIcons = {
        imdb: 'https://upload.wikimedia.org/wikipedia/commons/5/53/IMDB_-_SuperTinyIcons.svg',
        rt: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg',
        mc: 'https://yarikrazor-star.github.io/lmp/mc.svg',
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        trakt: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Trakt.tv-favicon.svg',
        mdblist: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='%23ffffff'%3E%3Cpath d='M1.928.029A2.47 2.47 0 0 0 .093 1.673c-.085.248-.09.629-.09 10.33s.005 10.08.09 10.33a2.51 2.51 0 0 0 1.512 1.558l.276.108h20.237l.277-.108a2.51 2.51 0 0 0 1.512-1.559c.085-.25.09-.63.09-10.33s-.005-10.08-.09-10.33A2.51 2.51 0 0 0 22.395.115l-.277-.109L12.117 0C6.615-.004 2.032.011 1.929.029m7.48 8.067l2.123 2.004v1.54c0 .897-.02 1.536-.043 1.527s-.92-.845-1.995-1.86c-1.071-1.01-1.962-1.84-1.977-1.84s-.024 1.91-.024 4.248v4.25H4.911V6.085h1.188l1.183.006zm9.729 3.93v5.94h-2.63l-.01-4.25l-.013-4.25l-1.907 1.795a367 367 0 0 1-1.98 1.864c-.076.056-.08-.047-.08-1.489v-1.555l2.127-1.995l2.127-1.995l1.187-.005h1.184z'/%3E%3C/svg%3E",
        popcorn: 'https://yarikrazor-star.github.io/lmp/rt.svg',
        letterboxd: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Letterboxd_2023_logo.png'
    };

    var IconCache = {};
    function preloadIcon(key, url) {
        return new Promise(function (resolve) {
            if (IconCache[key] || !url || url.indexOf('data:') === 0) {
                IconCache[key] = true;
                return resolve();
            }
            var img = new Image();
            img.onload = function () { IconCache[key] = true; resolve(); };
            img.onerror = function () { IconCache[key] = true; resolve(); };
            img.src = url;
        });
    }

    // =========================================================================
    // 2. ДЕФОЛТНІ НАЛАШТУВАННЯ
    // =========================================================================
    var DefaultSettings = {
        ydesign_logo_quality: 'w500',
        ydesign_poster_quality: 'w300',
        ydesign_backdrop_quality: 'w500',
        ydesign_lang: 'uk_en',
        ydesign_slogan_lang: 'uk_en',
        ydesign_desc_lang: 'uk_en',
        ydesign_logo_type: 'logo',
        ydesign_logo_max_h: '35',
        ydesign_logo_max_w: '80',
        ydesign_text_title_size: '1.5',
        ydesign_text_slogan_size: '0.7',
        ydesign_text_badge_size: '0.8',
        ydesign_text_year_size: '0.8',
        ydesign_text_age_size: '0.8',
        ydesign_text_seasons_size: '0.8',
        ydesign_text_ua_size: '0.8',
        ydesign_text_rating_size: '0.8',
        ydesign_desc_size: '1.0',
        ydesign_text_add_title_size: '0.9',
        ydesign_text_genres_size: '0.8',
        ydesign_card_type_main: 'horizontal',
        ydesign_card_type_other: 'vertical',
        ydesign_badges_one_row: false,
        ydesign_show_desc_horz: true,
        ydesign_show_year: true,
        ydesign_show_seasons: true,
        ydesign_show_ua: true,
        ydesign_show_age: true,
        ydesign_show_slogan: true,
        ydesign_show_add_title: true,
        ydesign_add_title_lang: 'auto',
        ydesign_show_genres: true,
        ydesign_lazy_load: false,
        ydesign_card_gap: '0.8',
        ydesign_badge_rows_gap: '0.3',
        ydesign_badges_gap_vert: '0.15',
        ydesign_badges_gap_horz: '0.15',
        ydesign_genres_gap: '0.0',
        ydesign_content_pb: '0.3',
        ydesign_slogan_padding: '0.3',
        ydesign_logo_mb: '1.2',
        ydesign_add_title_mb: '0.3',
        ydesign_uniform_v_gaps_vert: true,
        ydesign_uniform_v_gap_val_vert: '0.25',
        ydesign_uniform_v_gaps_horz: true,
        ydesign_uniform_v_gap_val_horz: '0.25',
        ydesign_ratings_saturate: '100',
        ydesign_align_logo: 'center',
        ydesign_align_add_title: 'left',
        ydesign_align_badges: 'left',
        ydesign_align_slogan: 'left',
        ydesign_ratings_order: 'tmdb, imdb, rt, popcorn',
        ydesign_omdb_key: '',
        ydesign_mdblist_key: '',
        ydesign_series_redesign: true,
        ydesign_series_cards: '4',
        ydesign_hide_left_column: true,
        ydesign_series_show_date: true,
        ydesign_series_show_voice: true,
        ydesign_series_show_rate: true,
        ydesign_series_show_time: true,
        ydesign_series_glass_pill: true,
        ydesign_series_border_badges: true,
        ydesign_series_badge_shape: 'pill',
        ydesign_horz_ratings_row: false,
        ydesign_border_year: true,
        ydesign_border_age: true,
        ydesign_border_seasons: true,
        ydesign_border_ua: true,
        ydesign_border_genres: true,
        ydesign_border_ratings: true,
        ydesign_border_info: true,
        ydesign_uniform_badges: true,
        ydesign_grid_items_v: '5',
        ydesign_grid_items_h: '3',
        ydesign_color_age: true,
        ydesign_color_ua: true,
        ydesign_badge_shape: 'pill',
        ydesign_glass_pill_bg: true
    };

    function getSet(key) {
        try {
            if (!window.Lampa || !Lampa.Storage) return DefaultSettings[key];
            var val = Lampa.Storage.get(key);
            if (val !== null && val !== undefined && val !== '') return val;
        } catch (e) {}
        return DefaultSettings[key];
    }

    // =========================================================================
    // 3. РОЗПІЗНАВАННЯ ТИПУ КАРТОК
    // =========================================================================
    function isPersonCard(data) {
        if (!data) return false;
        if (data.media_type === 'person' || data.type === 'person') return true;
        if (data.profile_path && !data.poster_path && !data.backdrop_path) return true;
        if (data.gender !== undefined && !data.poster_path && !data.backdrop_path) return true;
        if (data.known_for_department && !data.poster_path && !data.backdrop_path) return true;
        return false;
    }

    function isSpecialPluginCard(data, html) {
        if (!data) return false;
        if (data.vinyl || data.vinyl_type) return true;
        if (['playlist', 'album', 'artist', 'radio', 'song', 'genre', 'section'].indexOf(data.media) !== -1) return true;
        if (['playlist', 'album', 'artist', 'radio', 'song', 'genre', 'section'].indexOf(data.type) !== -1) return true;
        if (html) {
            var el = html[0] || html;
            if (el && el.classList && (
                el.classList.contains('card--vinyl') || 
                el.classList.contains('card-more') || 
                el.classList.contains('card--collection') ||
                el.classList.contains('card--iptv')
            )) return true;
        }
        return false;
    }

    function isMovieCard(data, html) {
        if (!data || !data.id) return false;
        if (isSpecialPluginCard(data, html)) return false;
        if (isPersonCard(data)) return false;

        if (data.media_type === 'movie' || data.media_type === 'tv') return true;
        if (data.poster_path || data.backdrop_path) return true;
        if (data.title || (data.name && (data.first_air_date || data.seasons || data.vote_average !== undefined))) return true;

        return false;
    }

    // =========================================================================
    // 4. БАГАТОРІВНЕВИЙ КЕШ (БЕЗ ВИКОРИСТАННЯ MAP ДЛЯ ES5)
    // =========================================================================
    var MemoryCache = {
        _data: {},
        size: 0,
        has: function(key) { return this._data.hasOwnProperty(key); },
        get: function(key) { return this._data[key]; },
        set: function(key, val) {
            if (!this.has(key)) this.size++;
            this._data[key] = val;
        },
        delete: function(key) {
            if (this.has(key)) {
                delete this._data[key];
                this.size--;
            }
        },
        clear: function() {
            this._data = {};
            this.size = 0;
        },
        keys: function() {
            var k = [];
            for (var i in this._data) {
                if (this._data.hasOwnProperty(i)) k.push(i);
            }
            return k;
        }
    };
    var MAX_MEM_CACHE = 250;

    var ApiCache = {
        get: function (key) {
            if (MemoryCache.has(key)) return MemoryCache.get(key);
            try {
                var raw = Lampa.Storage.get('ydesign_c_' + key);
                if (raw) {
                    var parsed = (typeof raw === 'string') ? JSON.parse(raw) : raw;
                    if (parsed && parsed.time && (Date.now() - parsed.time < CONFIG.cacheTime)) {
                        MemoryCache.set(key, parsed.val);
                        return parsed.val;
                    }
                }
            } catch (e) {}
            return null;
        },
        set: function (key, val) {
            if (MemoryCache.size >= MAX_MEM_CACHE) {
                var keys = MemoryCache.keys();
                if (keys.length > 0) {
                    MemoryCache.delete(keys[0]);
                }
            }
            MemoryCache.set(key, val);
            try {
                Lampa.Storage.set('ydesign_c_' + key, { val: val, time: Date.now() });
            } catch (e) {}
        }
    };

    // =========================================================================
    // 5. ВИРАХУНОК ДОМІНАНТНОГО КОЛЬОРУ
    // =========================================================================
    var ProminentColorStore = {};
    var sharedCanvas = null;
    var sharedCtx = null;

    function getProminentColorAsync(path) {
        if (!path) return Promise.resolve('rgb(40, 40, 45)');
        var url = (path.indexOf('http') === 0 || path.indexOf('data:') === 0) ? path : ('https://image.tmdb.org/t/p/w92' + path);

        if (ProminentColorStore[url]) return ProminentColorStore[url];

        ProminentColorStore[url] = new Promise(function (resolve) {
            var cachedColor = ApiCache.get('col_' + path);
            if (cachedColor) return resolve(cachedColor);

            var img = new Image();
            img.crossOrigin = 'Anonymous';
            // img.decoding = 'async'; // Залишено, браузери які не знають просто проігнорують

            img.onload = function () {
                try {
                    if (!sharedCanvas) {
                        sharedCanvas = document.createElement('canvas');
                        sharedCanvas.width = 1;
                        sharedCanvas.height = 1;
                        sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
                    }
                    var sx = 0, sy = img.naturalHeight * 0.7, sw = img.naturalWidth, sh = img.naturalHeight * 0.3;
                    sharedCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
                    var data = sharedCtx.getImageData(0, 0, 1, 1).data;
                    var r = data[0], g = data[1], b = data[2];

                    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    if (luma > 140) {
                        var factor = 110 / luma;
                        r = Math.floor(r * factor);
                        g = Math.floor(g * factor);
                        b = Math.floor(b * factor);
                    } else if (luma < 30) {
                        r = 35; g = 35; b = 40;
                    }

                    var colorResult = 'rgb(' + r + ',' + g + ',' + b + ')';
                    ApiCache.set('col_' + path, colorResult);
                    resolve(colorResult);
                } catch (e) {
                    resolve('rgb(40, 40, 45)');
                }
            };
            img.onerror = function () {
                resolve('rgb(40, 40, 45)');
            };
            img.src = url;
        });

        return ProminentColorStore[url];
    }

    // =========================================================================
    // 6. ЛІНИВЕ ЗАВАНТАЖЕННЯ (INTERSECTION OBSERVER)
    // =========================================================================
    var LazyLoader = {
        observer: null,
        init: function () {
            if (this.observer || typeof IntersectionObserver === 'undefined') return;
            var self = this;
            try {
                this.observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            var el = entry.target;
                            if (el._lazyQueue) {
                                el._lazyQueue.forEach(function (fn) { fn(); });
                                delete el._lazyQueue;
                            }
                            self.observer.unobserve(el);
                        }
                    });
                }, { rootMargin: '200px' });
            } catch (e) {}
        },
        add: function (el, fn) {
            if (typeof IntersectionObserver === 'undefined' || !getSet('ydesign_lazy_load')) {
                fn();
                return;
            }
            this.init();
            if (!this.observer) {
                fn();
                return;
            }
            el._lazyQueue = [fn];
            this.observer.observe(el);
        }
    };

    // =========================================================================
    // 7. ПАРСИНГ ДАНИХ ТА API ЗАПИТИ
    // =========================================================================
    function parseAgeRating(ageStr) {
        if (!ageStr) return '16+';
        var s = String(ageStr).toUpperCase().trim();
        if (s === 'G' || s === 'TV-G' || s === 'TV-Y') return '0+';
        if (s === 'PG' || s === 'TV-PG') return '6+';
        if (s === 'TV-Y7') return '7+';
        if (s === 'PG-13') return '13+';
        if (s === 'TV-14') return '14+';
        if (s === 'R' || s === 'NC-17' || s === 'TV-MA') return '18+';
        var digits = s.replace(/\D/g, '');
        if (digits.length > 0 && digits.length <= 2) return digits + '+';
        return '16+';
    }

    function checkUaVoiceover(tmdbId, type) {
        return new Promise(function (resolve) {
            var cacheKey = 'ua_' + tmdbId;
            var cached = ApiCache.get(cacheKey);
            if (cached !== null) return resolve(cached);

            var isSerial = (type === 'tv' || type === 'tv_series') ? 1 : 0;
            var url = 'https://wh.lme.isroot.in/?tmdb_id=' + encodeURIComponent(tmdbId) + '&serial=' + isSerial + '&silent=true';

            $.ajax({
                url: url,
                timeout: 3500,
                success: function (r) {
                    var hasUa = (r === true || (r && (r.success === true || r.status === 'success' || r.ok === true || (typeof r === 'object' && Object.keys(r).length > 0 && !r.error))));
                    ApiCache.set(cacheKey, hasUa);
                    resolve(hasUa);
                },
                error: function () {
                    ApiCache.set(cacheKey, false);
                    resolve(false);
                }
            });
        });
    }

    function fetchExternalRatings(tmdbId, type) {
        var cacheKey = 'ext_rates_v5_' + tmdbId;
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        return new Promise(function (resolve) {
            var results = {};
            
            $.ajax({
                url: 'https://api.themoviedb.org/3/' + type + '/' + tmdbId + '/external_ids?api_key=' + CONFIG.tmdbKey(),
                timeout: 4000,
                success: function(extRes) {
                    var imdbId = extRes ? extRes.imdb_id : null;
                    if (!imdbId) {
                        ApiCache.set(cacheKey, results);
                        return resolve(results);
                    }

                    var omdbKey = String(getSet('ydesign_omdb_key') || '').trim();
                    var mdblistKey = String(getSet('ydesign_mdblist_key') || '').trim();
                    
                    var pOmdb = Promise.resolve();
                    if (omdbKey) {
                        pOmdb = new Promise(function(resOmdb) {
                            $.ajax({
                                url: 'https://www.omdbapi.com/?apikey=' + omdbKey + '&i=' + imdbId,
                                timeout: 3500,
                                success: function(omdbData) {
                                    if (omdbData && omdbData.Response !== 'False') {
                                        if (omdbData.Metascore && omdbData.Metascore !== 'N/A') results.mc = omdbData.Metascore;
                                        if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') results.imdb = omdbData.imdbRating;
                                        var rtArr = (omdbData.Ratings || []).filter(function (r) { return r.Source === 'Rotten Tomatoes'; });
                                        if (rtArr.length > 0) results.rt = rtArr[0].Value.replace('%', '');
                                    }
                                    resOmdb();
                                },
                                error: function() { resOmdb(); }
                            });
                        });
                    }

                    var pMdb = Promise.resolve();
                    if (mdblistKey) {
                        pMdb = new Promise(function(resMdb) {
                            $.ajax({
                                url: 'https://mdblist.com/api/?apikey=' + mdblistKey + '&i=' + imdbId,
                                timeout: 3500,
                                success: function(mdbData) {
                                    if (mdbData) {
                                        if (mdbData.score) results.mdblist = mdbData.score;
                                        (mdbData.ratings || []).forEach(function (r) {
                                            if (r.source === 'trakt') results.trakt = r.value;
                                            if (r.source === 'letterboxd') results.letterboxd = r.value;
                                            if (r.source === 'tomatoesaudience') results.popcorn = r.value;
                                            if (r.source === 'metacritic' && !results.mc) results.mc = r.value;
                                            if (r.source === 'tomatoes' && !results.rt) results.rt = r.value;
                                            if (r.source === 'imdb' && !results.imdb) results.imdb = r.value;
                                        });
                                    }
                                    resMdb();
                                },
                                error: function() { resMdb(); }
                            });
                        });
                    }

                    Promise.all([pOmdb, pMdb]).then(function() {
                        ApiCache.set(cacheKey, results);
                        resolve(results);
                    });
                },
                error: function() {
                    ApiCache.set(cacheKey, results);
                    resolve(results);
                }
            });
        });
    }

    function fetchExtendedData(id, type) {
        var langPref = getSet('ydesign_lang');
        var sloganLang = getSet('ydesign_slogan_lang');
        var descLang = getSet('ydesign_desc_lang');

        var cacheKey = 'ext_' + type + '_' + id + '_' + langPref + '_' + sloganLang + '_' + descLang + '_v5';
        var cached = ApiCache.get(cacheKey);
        if (cached) return Promise.resolve(cached);

        return new Promise(function (resolve) {
            var langQuery = (sloganLang === 'uk' || sloganLang === 'uk_en' || descLang === 'uk' || descLang === 'uk_en' || langPref === 'uk' || langPref === 'uk_en') ? 'uk-UA' : 'en-US';
            var url = 'https://api.themoviedb.org/3/' + type + '/' + id +
                '?api_key=' + CONFIG.tmdbKey() +
                '&language=' + langQuery +
                '&append_to_response=images,release_dates,content_ratings' +
                '&include_image_language=uk,ru,en,null';

            $.ajax({
                url: url,
                timeout: 4500,
                success: function(data) {
                    var enData = null;

                    var needEn = false;
                    if (sloganLang === 'en' || descLang === 'en' || langPref === 'en_orig') needEn = true;
                    if (sloganLang === 'uk_en' && (!data.tagline || !data.tagline.trim())) needEn = true;
                    if (descLang === 'uk_en' && (!data.overview || !data.overview.trim())) needEn = true;

                    function processData() {
                        var finalTagline = '';
                        if (sloganLang === 'uk') finalTagline = data.tagline || '';
                        else if (sloganLang === 'en') finalTagline = enData ? enData.tagline : '';
                        else finalTagline = data.tagline || (enData ? enData.tagline : '');

                        var finalOverview = '';
                        if (descLang === 'uk') finalOverview = data.overview || '';
                        else if (descLang === 'en') finalOverview = enData ? enData.overview : '';
                        else finalOverview = data.overview || (enData ? enData.overview : '');

                        var se_str = '';
                        if (type === 'tv') {
                            var ds = data.number_of_seasons;
                            var de = data.number_of_episodes;
                            if (data.last_episode_to_air) {
                                var last_ep = data.last_episode_to_air;
                                var s_objArr = data.seasons ? data.seasons.filter(function (x) { return x.season_number === last_ep.season_number; }) : [];
                                var s_obj = s_objArr.length > 0 ? s_objArr[0] : null;
                                if (s_obj) {
                                    if (last_ep.episode_number < s_obj.episode_count) {
                                        ds = last_ep.season_number;
                                        de = last_ep.episode_number + '/' + s_obj.episode_count;
                                    } else {
                                        ds = last_ep.season_number;
                                        de = s_obj.episode_count;
                                    }
                                }
                            }
                            if (ds) se_str = 'S:' + ds + (de ? ' E:' + de : '');
                        }

                        var result = {
                            tagline: finalTagline || '',
                            overview: finalOverview || '',
                            genres: data.genres || (enData ? enData.genres : []),
                            clean_poster: null,
                            clean_backdrop: null,
                            logo: null,
                            logo_lang: null,
                            age: null,
                            seasons: data.number_of_seasons,
                            episodes: data.number_of_episodes,
                            tmdb_rating: data.vote_average,
                            se_str: se_str,
                            title_uk: data.title || data.name || '',
                            title_en: enData ? (enData.title || enData.name) : ''
                        };

                        if (data.images) {
                            var posters = data.images.posters || [];
                            var backdrops = data.images.backdrops || [];
                            var logos = data.images.logos || [];

                            var cpArr = posters.filter(function (p) { return p.iso_639_1 === null; });
                            result.clean_poster = cpArr.length > 0 ? cpArr[0].file_path : (posters.length ? posters[0].file_path : null);

                            var cbArr = backdrops.filter(function (p) { return p.iso_639_1 === null; });
                            result.clean_backdrop = cbArr.length > 0 ? cbArr[0].file_path : (backdrops.length ? backdrops[0].file_path : null);

                            var logo = null;
                            if (langPref === 'uk') {
                                var ukArr = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                                logo = ukArr.length > 0 ? ukArr[0] : null;
                            } else if (langPref === 'uk_en') {
                                var ukArr2 = logos.filter(function (l) { return l.iso_639_1 === 'uk'; });
                                var enArr2 = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                                logo = ukArr2.length > 0 ? ukArr2[0] : (enArr2.length > 0 ? enArr2[0] : null);
                            } else {
                                var enArr3 = logos.filter(function (l) { return l.iso_639_1 === 'en'; });
                                logo = enArr3.length > 0 ? enArr3[0] : null;
                            }
                            if (!logo && logos.length) logo = logos[0];

                            if (logo) {
                                result.logo = logo.file_path;
                                result.logo_lang = logo.iso_639_1;
                            }
                        }

                        if (type === 'movie' && data.release_dates && data.release_dates.results) {
                            var usArr = data.release_dates.results.filter(function (r) { return r.iso_3166_1 === 'US'; });
                            if (usArr.length > 0 && usArr[0].release_dates && usArr[0].release_dates.length) result.age = usArr[0].release_dates[0].certification;
                        } else if (type === 'tv' && data.content_ratings && data.content_ratings.results) {
                            var usTvArr = data.content_ratings.results.filter(function (r) { return r.iso_3166_1 === 'US'; });
                            if (usTvArr.length > 0) result.age = usTvArr[0].rating;
                        }

                        result.age = parseAgeRating(result.age);

                        ApiCache.set(cacheKey, result);
                        resolve(result);
                    }

                    if (needEn) {
                        $.ajax({
                            url: 'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + CONFIG.tmdbKey() + '&language=en-US',
                            timeout: 3500,
                            success: function (enResponse) {
                                enData = enResponse;
                                processData();
                            },
                            error: function () {
                                processData();
                            }
                        });
                    } else {
                        processData();
                    }
                },
                error: function() {
                    resolve(null);
                }
            });
        });
    }

    // =========================================================================
    // 8. РЕНДЕР БЕЙДЖІВ ТА РЕЙТИНГІВ КАРТОК
    // =========================================================================
    function renderRatingsAsync(container, baseData, tmdbData, extRatings) {
        return new Promise(function(resolve) {
            var orderStr = String(getSet('ydesign_ratings_order') || 'tmdb, imdb, rt, popcorn');
            var order = orderStr.split(',').map(function (s) { return s.trim().toLowerCase(); });

            var formatR = function (v, is100) {
                if (v === null || v === undefined || v === '' || v === 'N/A') return null;
                var n = parseFloat(String(v).replace('%', ''));
                if (isNaN(n)) return null;
                if (is100 || n > 10) n = n / 10;
                return n.toFixed(1);
            };

            var available = {
                tmdb: formatR(tmdbData ? tmdbData.tmdb_rating : baseData.vote_average, false),
                kp: formatR(baseData.kp_rating, false),
                imdb: formatR((extRatings && extRatings.imdb) ? extRatings.imdb : baseData.imdb_rating, false),
                rt: formatR(extRatings && extRatings.rt, true),
                mc: formatR(extRatings && extRatings.mc, true),
                trakt: formatR(extRatings && extRatings.trakt, true),
                mdblist: formatR(extRatings && extRatings.mdblist, true),
                popcorn: formatR(extRatings && extRatings.popcorn, true),
                letterboxd: (extRatings && extRatings.letterboxd) ? formatR(parseFloat(extRatings.letterboxd) * 2, false) : null
            };

            var iconsToLoad = [];
            order.forEach(function (key) {
                if (available[key] && key !== 'kp' && rateIcons[key]) {
                    iconsToLoad.push(preloadIcon(key, rateIcons[key]));
                }
            });

            Promise.all(iconsToLoad).then(function() {
                container.innerHTML = '';
                order.forEach(function (key) {
                    if (available[key]) {
                        if (key === 'kp') {
                            container.innerHTML += '<span class="ydesign-rating"><b style="color:#f60; font-weight:800; font-size:1.1em; line-height:1; display:flex; align-items:center;">Kp</b> ' + available[key] + '</span>';
                        } else {
                            var iconUrl = rateIcons[key] || rateIcons.tmdb;
                            container.innerHTML += '<span class="ydesign-rating"><img src="' + iconUrl + '" alt="' + key + '" /> ' + available[key] + '</span>';
                        }
                    }
                });
                resolve();
            });
        });
    }

    // =========================================================================
    // 9. СТВОРЕННЯ КАРТОК ФІЛЬМІВ
    // =========================================================================
    function buildCardCustomDOM(cardHtml, data) {
        var el = cardHtml[0] || cardHtml;
        var isMain = el._ydesign_isMain !== undefined ? el._ydesign_isMain : (Lampa.Activity.active() ? Lampa.Activity.active().component === 'main' : true);
        var isHorz = isMain ? getSet('ydesign_card_type_main') === 'horizontal' : getSet('ydesign_card_type_other') === 'horizontal';

        el.classList.add('ydesign-card');
        el.classList.remove('ydesign-vertical', 'ydesign-horizontal');
        el.classList.add(isHorz ? 'ydesign-horizontal' : 'ydesign-vertical');

        var type = data.media_type || (data.name ? 'tv' : 'movie');
        if (!data.id) return;

        var buildExtendedCard = function () {
            var view = el.querySelector('.card__view');
            if (!view) return;
            view.innerHTML = '';

            var imgLayer = document.createElement('div'); imgLayer.className = 'ydesign-img-layer';
            var gradientLayer = document.createElement('div'); gradientLayer.className = 'ydesign-gradient-layer';
            var contentLayer = document.createElement('div'); contentLayer.className = 'ydesign-content-layer';

            view.appendChild(imgLayer);
            view.appendChild(gradientLayer);
            view.appendChild(contentLayer);

            var bgQuality = isHorz ? getSet('ydesign_backdrop_quality') : getSet('ydesign_poster_quality');

            var applyBg = function (path) {
                if (!path) return;
                var fullUrl = 'https://image.tmdb.org/t/p/' + bgQuality + path;
                if (el._ydesign_bg_applied === fullUrl) return;
                el._ydesign_bg_applied = fullUrl;

                getProminentColorAsync(path).then(function (color) {
                    if (color) {
                        view.style.backgroundColor = color;
                        var rgba95 = color.replace('rgb', 'rgba').replace(')', ', 0.95)');
                        gradientLayer.style.background = 'linear-gradient(to top, ' + color + ' 0%, ' + rgba95 + ' 45%, transparent 100%)';
                        contentLayer.style.background = 'linear-gradient(to top, ' + color + ' 10%, transparent 100%)';
                    }

                    var img = new Image();
                    // img.decoding = 'async'; // Не всі старі браузери знають, можна просто опустити
                    img.onload = function () {
                        imgLayer.style.setProperty('--loaded-bg', 'url(' + fullUrl + ')');
                        imgLayer.classList.add('loaded');
                    };
                    img.src = fullUrl;
                });
            };

            fetchExtendedData(data.id, type).then(function (extData) {
                var bgToLoad = null;
                if (extData) {
                    bgToLoad = isHorz ? (extData.clean_backdrop || data.backdrop_path || data.poster_path) : (extData.clean_poster || data.poster_path || data.backdrop_path);
                } else {
                    bgToLoad = isHorz ? (data.backdrop_path || data.poster_path) : (data.poster_path || data.backdrop_path);
                }

                if (bgToLoad) applyBg(bgToLoad);
                if (!extData) return;

                var logoContainer = document.createElement('div');
                logoContainer.className = 'ydesign-logo-container';

                var titleText = document.createElement('div');
                titleText.className = 'ydesign-text-title ydesign-fallback-text';

                var mainTitle = data.title || data.name || data.original_title || data.original_name || '';
                titleText.innerText = mainTitle;

                if (extData.logo) {
                    var logoImg = document.createElement('img');
                    logoImg.className = 'ydesign-logo-img';
                    logoImg.src = 'https://image.tmdb.org/t/p/' + getSet('ydesign_logo_quality') + extData.logo;
                    logoImg.alt = mainTitle;
                    logoContainer.appendChild(logoImg);
                } else {
                    titleText.classList.remove('ydesign-fallback-text');
                }
                logoContainer.appendChild(titleText);
                contentLayer.appendChild(logoContainer);

                var addTitleWrap = null;
                if (getSet('ydesign_show_add_title')) {
                    addTitleWrap = document.createElement('div');
                    addTitleWrap.className = 'ydesign-add-title';
                    contentLayer.appendChild(addTitleWrap);
                }

                var updateAddTitleWrap = function () {
                    if (!addTitleWrap) return;
                    if (!extData.logo) { addTitleWrap.innerText = ' '; return; }
                    var uTitle = '';
                    var addTitleLang = getSet('ydesign_add_title_lang');
                    var ukT = extData.title_uk || mainTitle;
                    var enT = extData.title_en || data.original_title || data.original_name;

                    if (addTitleLang === 'uk') uTitle = ukT;
                    else if (addTitleLang === 'en') uTitle = enT;
                    else {
                        if (extData.logo_lang === 'en') uTitle = ukT;
                        else if (extData.logo_lang === 'uk' || extData.logo_lang === 'ru') uTitle = enT;
                        else uTitle = ukT;
                    }

                    if (uTitle) {
                        var fTitle = '"' + uTitle + '"';
                        if (fTitle.length > 34) fTitle = fTitle.substring(0, 32) + '...';
                        addTitleWrap.innerText = fTitle;
                    } else {
                        addTitleWrap.innerText = ' ';
                    }
                };

                updateAddTitleWrap();

                var infoWrap = document.createElement('div');
                infoWrap.className = 'ydesign-info-wrap';

                var badgesWrap = document.createElement('div');
                badgesWrap.className = 'ydesign-badges';

                if (data.release_date || data.first_air_date) {
                    var year = String(data.release_date || data.first_air_date).substring(0, 4);
                    if (year && year !== 'unde') badgesWrap.innerHTML += '<span class="ydesign-badge ydesign-badge-year">' + year + '</span>';
                }

                if (type === 'tv' && extData.se_str) {
                    badgesWrap.innerHTML += '<span class="ydesign-badge ydesign-badge-seasons">' + extData.se_str + '</span>';
                } else if (type === 'tv' && extData.seasons) {
                    var str = 'S:' + extData.seasons + (extData.episodes ? ' E:' + extData.episodes : '');
                    badgesWrap.innerHTML += '<span class="ydesign-badge ydesign-badge-seasons">' + str + '</span>';
                }

                if (extData.age) {
                    var ageClass = 'ydesign-age-' + extData.age.replace('+', '');
                    badgesWrap.innerHTML += '<span class="ydesign-badge ydesign-badge-age ' + ageClass + '">' + extData.age + '</span>';
                }

                if (badgesWrap.innerHTML !== '') infoWrap.appendChild(badgesWrap);

                checkUaVoiceover(data.id, type).then(function (hasUa) {
                    if (hasUa) {
                        var uaBadge = document.createElement('span');
                        uaBadge.className = 'ydesign-badge ydesign-badge-ua';
                        uaBadge.innerText = 'UA';
                        badgesWrap.appendChild(uaBadge);
                        if (badgesWrap.parentNode !== infoWrap) infoWrap.insertBefore(badgesWrap, infoWrap.firstChild);
                    }
                });

                var genresWrap = null;
                if (getSet('ydesign_show_genres')) {
                    genresWrap = document.createElement('div');
                    genresWrap.className = 'ydesign-genres';
                    if (extData.genres && extData.genres.length) {
                        extData.genres.forEach(function (g) {
                            var gb = document.createElement('span');
                            gb.className = 'ydesign-genre-badge';
                            gb.innerText = g.name || g;
                            genresWrap.appendChild(gb);
                        });
                    } else {
                        genresWrap.innerText = ' ';
                    }
                }

                var ratingsWrap = document.createElement('div');
                ratingsWrap.className = 'ydesign-ratings';

                renderRatingsAsync(ratingsWrap, data, extData, null).then(function() {
                    fetchExternalRatings(data.id, type).then(function (extRatings) {
                        if (extRatings && Object.keys(extRatings).length > 0) {
                            renderRatingsAsync(ratingsWrap, data, extData, extRatings);
                        }
                    });
                });

                if (isHorz) {
                    if (getSet('ydesign_horz_ratings_row')) {
                        contentLayer.appendChild(infoWrap);
                        var infoWrap2 = document.createElement('div');
                        infoWrap2.className = 'ydesign-info-wrap ydesign-info-wrap-2';
                        infoWrap2.appendChild(ratingsWrap);
                        contentLayer.appendChild(infoWrap2);
                        if (genresWrap) contentLayer.appendChild(genresWrap);
                    } else {
                        infoWrap.appendChild(ratingsWrap);
                        contentLayer.appendChild(infoWrap);
                        if (genresWrap) contentLayer.appendChild(genresWrap);
                    }
                } else {
                    if (genresWrap) infoWrap.appendChild(genresWrap);
                    infoWrap.appendChild(ratingsWrap);
                    contentLayer.appendChild(infoWrap);
                }

                var oldSlogan = contentLayer.querySelector('.ydesign-slogan');
                if (oldSlogan) oldSlogan.remove();
                var oldDesc = el.querySelector('.ydesign-desc-under');
                if (oldDesc) oldDesc.remove();

                if (getSet('ydesign_show_slogan')) {
                    var slogan = document.createElement('div');
                    slogan.className = 'ydesign-slogan ydesign-slogan-text';
                    var sText = extData.tagline || ' ';
                    if (!isHorz && sText.trim() !== '' && sText.length > 46) {
                        sText = sText.substring(0, 44) + '...';
                    }
                    slogan.innerText = sText;
                    contentLayer.appendChild(slogan);
                }

                if (isHorz && getSet('ydesign_show_desc_horz')) {
                    var desc = document.createElement('div');
                    desc.className = 'ydesign-desc-under';
                    desc.innerText = extData.overview ? extData.overview : ' ';
                    el.appendChild(desc);
                }
            });
        };

        if (getSet('ydesign_lazy_load')) {
            LazyLoader.add(el, buildExtendedCard);
        } else {
            buildExtendedCard();
        }
    }

    // =========================================================================
    // 10. CSS СТИЛІ
    // =========================================================================
    function injectCSS() {
        var style = document.getElementById('ydesign-style-block');
        if (!style) {
            style = document.createElement('style');
            style.id = 'ydesign-style-block';
            document.head.appendChild(style);
        }

        style.innerHTML = [
            ".ydesign-active .ydesign-card .card__title,",
            ".ydesign-active .ydesign-card .card__age,",
            ".ydesign-active .ydesign-card .card__vote { display: none !important; }",
            "",
            ".ydesign-active .items-line:not(.vinyl-line) .items-cards,",
            ".ydesign-active .items-line:not(.vinyl-line) .scroll__body {",
            "    display: flex; flex-wrap: nowrap; ",
            "    gap: var(--ydesign-card-gap, 0.8em); ",
            "    padding-bottom: 0; ",
            "}",
            "",
            ".ydesign-active .ydesign-card {",
            "    position: relative; overflow: visible;",
            "    background-color: transparent !important;",
            "    border: none !important; ",
            "    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);",
            "    flex: 0 0 auto; cursor: pointer;",
            "    transform: translateZ(0);",
            "    backface-visibility: hidden;",
            "}",
            "",
            ".ydesign-active .ydesign-card.focus {",
            "    transform: scale(1.045) translateZ(0); ",
            "    z-index: 20;",
            "}",
            "",
            ".ydesign-active .ydesign-card.focus .card__view {",
            "    box-shadow: 0 0 0 4px #ffffff, 0 16px 36px rgba(0,0,0,0.9) !important;",
            "}",
            "",
            ".ydesign-active .ydesign-card .card__view {",
            "    position: relative; top: 0; left: 0; right: 0; bottom: 0;",
            "    width: 100%; height: 0 !important;",
            "    border-radius: 0.85em !important;",
            "    background-color: #1a1a1a; ",
            "    overflow: hidden;",
            "    box-shadow: 0 0 0 4px transparent;",
            "    transition: background-color 0.4s ease, box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);",
            "}",
            "",
            ".ydesign-active .ydesign-card.ydesign-vertical .card__view { padding-bottom: 177.77% !important; } ",
            ".ydesign-active .ydesign-card.ydesign-horizontal .card__view { padding-bottom: 68.75% !important; } ",
            "",
            "@media (min-width: 769px) {",
            "    .ydesign-active .card.ydesign-vertical { width: calc(100% / var(--ydesign-grid-items-v, 5)); height: auto !important; }   ",
            "    .ydesign-active .card.ydesign-horizontal { width: calc(100% / var(--ydesign-grid-items-h, 3)); height: auto !important; } ",
            "    .ydesign-active .items-line:not(.vinyl-line) .card.ydesign-vertical { width: 18.5vw; }   ",
            "    .ydesign-active .items-line:not(.vinyl-line) .card.ydesign-horizontal { width: 31.5vw; } ",
            "}",
            "",
            "@media (max-width: 768px) {",
            "    .ydesign-active .card.ydesign-vertical { width: calc(100% / 2); height: auto !important; }    ",
            "    .ydesign-active .card.ydesign-horizontal { width: calc(100% / 2); height: auto !important; }  ",
            "    .ydesign-active .items-line:not(.vinyl-line) .card.ydesign-vertical { width: 46vw; }    ",
            "    .ydesign-active .items-line:not(.vinyl-line) .card.ydesign-horizontal { width: 94vw; }  ",
            "}",
            "",
            "/* --- ЧИСТИЙ КРОСФЕЙД ЗОБРАЖЕНЬ --- */",
            ".ydesign-img-layer {",
            "    position: absolute; top: 0; left: 0; width: 100%; height: 100%;",
            "    background-color: #1a1a1a;",
            "    background-image: url('./img/img_load.svg');",
            "    background-size: cover !important; ",
            "    background-repeat: no-repeat; ",
            "    background-position: center center !important;",
            "}",
            ".ydesign-img-layer::after {",
            "    content: '';",
            "    position: absolute; top: 0; left: 0; width: 100%; height: 100%;",
            "    background-image: var(--loaded-bg, none);",
            "    background-size: cover !important;",
            "    background-repeat: no-repeat;",
            "    background-position: center center !important;",
            "    opacity: 0;",
            "    transition: opacity 0.25s ease-in-out;",
            "    z-index: 1;",
            "}",
            ".ydesign-img-layer.loaded::after {",
            "    opacity: 1;",
            "}",
            "",
            ".ydesign-gradient-layer {",
            "    position: absolute; bottom: 0; left: 0; width: 100%; height: 60%;",
            "    pointer-events: none;",
            "    z-index: 2;",
            "}",
            "",
            ".ydesign-content-layer {",
            "    position: absolute; bottom: 0; left: 0; width: 100%; height: 100%;",
            "    display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch;",
            "    padding: 1.2em 0.8em var(--ydesign-content-pb, 0.3em) 0.8em;",
            "    box-sizing: border-box;",
            "    z-index: 3; pointer-events: none;",
            "}",
            "",
            ".ydesign-logo-container {",
            "    display: flex; align-items: flex-end;",
            "    margin-bottom: var(--ydesign-logo-mb, 1.2em); ",
            "    width: 100%; ",
            "    height: var(--ydesign-logo-h, 35%);",
            "    max-height: var(--ydesign-logo-h, 35%); ",
            "    flex-shrink: 0; ",
            "    justify-content: var(--ydesign-align-logo, center);",
            "    position: relative;",
            "    z-index: 10;",
            "}",
            ".ydesign-logo-container img {",
            "    max-width: var(--ydesign-logo-w, 80%);",
            "    max-height: 100%;",
            "    height: auto; width: auto;",
            "    object-fit: contain; object-position: bottom var(--ydesign-text-logo, center);",
            "    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));",
            "}",
            ".ydesign-text-title {",
            "    width: var(--ydesign-logo-w, 100%);",
            "    max-height: 100%;",
            "    display: flex; align-items: flex-end; justify-content: var(--ydesign-align-logo, center);",
            "    font-size: calc(var(--ydesign-title-size-val, 1.2) * 1em) !important; font-weight: 800; color: #fff; ",
            "    text-align: var(--ydesign-text-logo, center); ",
            "    text-shadow: 0 2px 4px rgba(0,0,0,0.95);",
            "    line-height: 1.25; ",
            "    padding-bottom: 0.15em; ",
            "}",
            "",
            "/* --- СТРОГА СІТКА ДЛЯ ДОДАТКОВОЇ НАЗВИ ТА СЛОГАНУ --- */",
            ".ydesign-add-title {",
            "    width: 100%;",
            "    --ydesign-add-title-size-eff: var(--ydesign-add-title-size-val, 0.9);",
            "    font-size: calc(var(--ydesign-add-title-size-eff) * 1em) !important;",
            "    color: rgba(255, 255, 255, 0.9);",
            "    font-weight: 600; font-style: italic;",
            "    text-align: var(--ydesign-text-add-title, center);",
            "    white-space: nowrap;",
            "    overflow: hidden;",
            "    text-overflow: ellipsis;",
            "    line-height: 1.35 !important;",
            "    padding: 0.1em 0 0.25em 0 !important;",
            "    margin-left: 0 !important;",
            "    box-sizing: border-box !important;",
            "    min-height: calc(var(--ydesign-add-title-size-eff) * 1.55em);",
            "    margin-top: 0 !important;",
            "    margin-bottom: var(--ydesign-add-title-mb, 0.3em) !important;",
            "    text-shadow: none !important;",
            "}",
            "",
            "/* СЛОГАН З НЕВЕЛИКИМ ВІДСТУПОМ ВІД КРАЮ КАРТКИ */",
            ".ydesign-slogan {",
            "    width: 100%;",
            "    --ydesign-slogan-size-eff: var(--ydesign-text-slogan-size-val, 0.85);",
            "    font-size: calc(var(--ydesign-slogan-size-eff) * 1em) !important; color: #fff;",
            "    text-align: var(--ydesign-text-slogan, center); ",
            "    margin: var(--ydesign-slogan-padding, 0.3em) 0 0 0 !important;",
            "    padding: 0.1em 0.35em !important;",
            "    box-sizing: border-box !important;",
            "    line-height: 1.35 !important; ",
            "    font-weight: 500;",
            "    text-shadow: none !important;",
            "    display: block; ",
            "    white-space: nowrap;",
            "    overflow: hidden;",
            "    text-overflow: ellipsis;",
            "    min-height: calc(var(--ydesign-slogan-size-eff) * 1.45em);",
            "}",
            "",
            ".ydesign-info-wrap {",
            "    display: flex;",
            "    width: 100%; ",
            "    overflow: hidden;",
            "    padding: 0 !important; margin: 0 !important;",
            "}",
            "",
            "/* --- ГОРИЗОНТАЛЬНІ КАРТКИ ТА РЯДКИ БЕЙДЖІВ (СТРОГО 1 РЯД) --- */",
            ".ydesign-horizontal .ydesign-info-wrap,",
            ".ydesign-horizontal .ydesign-info-wrap-2,",
            "body.ydesign-badges-one-row .ydesign-vertical .ydesign-info-wrap {",
            "    display: flex; flex-direction: row; flex-wrap: wrap !important;",
            "    align-content: flex-start !important;",
            "    align-items: center !important;",
            "    justify-content: var(--ydesign-align-badges, center);",
            "    column-gap: var(--ydesign-badges-gap-h, 0.15em) !important;",
            "    row-gap: 50em !important;",
            "    height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    line-height: 1.70em !important;",
            "    padding: 0 !important;",
            "    margin: 0 !important;",
            "    overflow: hidden !important;",
            "    clip-path: none !important;",
            "    transform: translateZ(0);",
            "}",
            ".ydesign-horizontal .ydesign-info-wrap-2 {",
            "    margin-top: var(--ydesign-badge-rows-gap, 0.3em) !important;",
            "}",
            "",
            ".ydesign-vertical .ydesign-info-wrap {",
            "    flex-direction: column;",
            "    align-items: var(--ydesign-align-badges, center) !important;",
            "    height: auto !important; ",
            "    max-height: none !important;",
            "    overflow: visible !important;",
            "    gap: var(--ydesign-badge-rows-gap, 0.3em);",
            "    padding: 0 !important;",
            "    margin: 0 !important;",
            "}",
            "",
            "/* УСІ РЯДКИ (БЕЙДЖІ, РЕЙТИНГИ, ЖАНРИ) - СТРОГО 1 РЯД, ЦІЛІСНІ ПІГУЛКИ БЕЗ ЗРІЗАННЯ КРАЇВ */",
            ".ydesign-vertical .ydesign-badges, ",
            ".ydesign-vertical .ydesign-ratings,",
            ".ydesign-vertical .ydesign-genres {",
            "    display: flex !important; ",
            "    flex-wrap: wrap !important; ",
            "    align-content: flex-start !important;",
            "    align-items: center !important;",
            "    column-gap: var(--ydesign-badges-gap-v, 0.15em) !important; ",
            "    row-gap: 50em !important;",
            "    justify-content: var(--ydesign-align-badges, center) !important;",
            "    width: 100% !important; ",
            "    height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    line-height: 1.70em !important;",
            "    padding: 0 !important;",
            "    margin: 0 !important;",
            "    overflow: hidden !important; ",
            "    clip-path: none !important;",
            "    transform: translateZ(0);",
            "}",
            "",
            "body.ydesign-badges-one-row .ydesign-vertical .ydesign-genres,",
            "body.ydesign-badges-one-row .ydesign-vertical .ydesign-ratings,",
            ".ydesign-horizontal .ydesign-badges,",
            ".ydesign-horizontal .ydesign-ratings { ",
            "    display: flex !important;",
            "    flex-wrap: wrap !important; ",
            "    align-content: flex-start !important;",
            "    width: auto !important; ",
            "    height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    line-height: 1.70em !important;",
            "    margin: 0 !important; padding: 0 !important; flex-shrink: 0 !important; ",
            "    column-gap: var(--ydesign-badges-gap-h, 0.15em) !important; ",
            "    row-gap: 50em !important;",
            "    overflow: hidden !important;",
            "}",
            "",
            ".ydesign-horizontal .ydesign-genres {",
            "    display: flex !important; ",
            "    flex-wrap: wrap !important; ",
            "    align-content: flex-start !important;",
            "    align-items: center !important;",
            "    column-gap: var(--ydesign-badges-gap-h, 0.15em) !important; ",
            "    row-gap: 50em !important;",
            "    width: 100% !important; ",
            "    justify-content: var(--ydesign-align-badges, center) !important;",
            "    height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    line-height: 1.70em !important;",
            "    padding: 0 !important;",
            "    margin: 0 !important;",
            "    overflow: hidden !important; ",
            "    clip-path: none !important;",
            "    transform: translateZ(0);",
            "}",
            "",
            ".ydesign-badges, .ydesign-ratings, .ydesign-genres {",
            "    font-size: 1em !important;",
            "}",
            "",
            "/* =========================================================================",
            "   ЧИСТА ГЕОМЕТРІЯ ПІГУЛОК: ОПТИМАЛЬНИЙ ЕЛЕГАНТНИЙ РОЗМІР",
            "   ========================================================================= */",
            ".ydesign-badge, .ydesign-genre-badge, .ydesign-rating {",
            "    display: inline-flex !important; ",
            "    align-items: center !important; ",
            "    justify-content: center !important;",
            "    box-sizing: border-box !important; ",
            "    height: 1.70em !important; ",
            "    min-height: 1.70em !important; ",
            "    max-height: 1.70em !important; ",
            "    line-height: 1.70em !important; ",
            "    border: 1px solid transparent !important;",
            "    background: transparent !important; ",
            "    padding: 0 0.50em !important; ",
            "    text-shadow: none !important; ",
            "    box-shadow: none !important; ",
            "    white-space: nowrap !important;",
            "    flex-shrink: 0 !important; ",
            "    text-align: center !important;",
            "    vertical-align: middle !important;",
            "    border-radius: var(--ydesign-badge-radius, 50px) !important; ",
            "    max-width: 100% !important;",
            "    overflow: hidden !important;",
            "    text-overflow: ellipsis !important;",
            "}",
            "",
            "/* Індивідуальні розміри (коли однаковий розмір ВИМКНЕНО) */",
            ".ydesign-badge-year { font-size: calc(var(--ydesign-year-size-val, 0.8) * 1em) !important; font-weight: 700 !important; color: #fff !important; }",
            ".ydesign-badge-age { font-size: calc(var(--ydesign-age-size-val, 0.8) * 1em) !important; font-weight: 700 !important; color: #fff !important; }",
            ".ydesign-badge-seasons { font-size: calc(var(--ydesign-seasons-size-val, 0.8) * 1em) !important; font-weight: 700 !important; color: #fff !important; }",
            ".ydesign-badge-ua { font-size: calc(var(--ydesign-ua-size-val, 0.8) * 1em) !important; font-weight: 700 !important; color: #fff !important; }",
            ".ydesign-genre-badge { font-size: calc(var(--ydesign-genres-size-val, 0.8) * 1em) !important; font-weight: 600 !important; color: rgba(255,255,255,0.95) !important; }",
            ".ydesign-rating { font-size: calc(var(--ydesign-rating-size-val, 0.8) * 1em) !important; font-weight: 700 !important; color: #fff !important; gap: 0.25em !important; }",
            "",
            "/* Коли УВІМКНЕНО 'Усі бейджі одного розміру' - СТРОГО ОДНАКОВИЙ РОЗМІР І ВИСОТА ДЛЯ ВСІХ */",
            "body.ydesign-uniform-badges .ydesign-badge-year,",
            "body.ydesign-uniform-badges .ydesign-badge-age,",
            "body.ydesign-uniform-badges .ydesign-badge-seasons,",
            "body.ydesign-uniform-badges .ydesign-badge-ua,",
            "body.ydesign-uniform-badges .ydesign-badge,",
            "body.ydesign-uniform-badges .ydesign-genre-badge,",
            "body.ydesign-uniform-badges .ydesign-rating {",
            "    font-size: calc(var(--ydesign-badge-size-val, 0.8) * 1em) !important;",
            "    height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    line-height: 1.70em !important;",
            "}",
            "",
            "body.ydesign-shape-pill { --ydesign-badge-radius: 50px; }",
            "body.ydesign-shape-rounded { --ydesign-badge-radius: 0.35em; }",
            "body.ydesign-shape-square { --ydesign-badge-radius: 0.15em; }",
            "",
            "/* ПІДЛОЖКА БЕЙДЖІВ БЕЗ ТІНІ ЗНИЗУ */",
            "body.ydesign-glass-pill .ydesign-badge,",
            "body.ydesign-glass-pill .ydesign-genre-badge,",
            "body.ydesign-glass-pill .ydesign-rating {",
            "    background: rgba(255, 255, 255, 0.1) !important;",
            "    backdrop-filter: blur(6px) !important;",
            "    -webkit-backdrop-filter: blur(6px) !important;",
            "    box-shadow: none !important;",
            "}",
            "",
            ".ydesign-rating img {",
            "    width: 1.15em !important; ",
            "    height: 1.15em !important; ",
            "    object-fit: contain !important; ",
            "    display: block !important; ",
            "    filter: saturate(var(--ydesign-ratings-saturate, 100%)) !important; ",
            "}",
            "",
            "/* --- КОЛЬОРИ ТЕКСТУ ВІКУ ТА UA --- */",
            "body.ydesign-color-age .ydesign-age-18 { color: #ff5252 !important; }",
            "body.ydesign-color-age .ydesign-age-16 { color: #ffab40 !important; }",
            "body.ydesign-color-age .ydesign-age-14, ",
            "body.ydesign-color-age .ydesign-age-13 { color: #ffd740 !important; }",
            "body.ydesign-color-age .ydesign-age-6,",
            "body.ydesign-color-age .ydesign-age-0 { color: #69f0ae !important; }",
            "",
            "body.ydesign-color-ua .ydesign-badge-ua {",
            "    background: linear-gradient(135deg, rgba(0, 87, 183, 0.9) 0%, rgba(255, 215, 0, 0.85) 100%) !important;",
            "    color: #ffffff !important;",
            "    font-weight: 800 !important;",
            "    box-shadow: none !important;",
            "}",
            "",
            "/* --- ТОЧНІ ОКРЕМІ РАМКИ ДЛЯ КОЖНОГО БЕЙДЖУ --- */",
            "body.ydesign-border-year .ydesign-badge-year { border-color: rgba(255,255,255,0.6) !important; }",
            "body.ydesign-border-seasons .ydesign-badge-seasons { border-color: rgba(255,255,255,0.6) !important; }",
            "body.ydesign-border-ua .ydesign-badge-ua { border-color: rgba(255,255,255,0.6) !important; }",
            "body.ydesign-border-genres .ydesign-genre-badge { border-color: rgba(255,255,255,0.4) !important; }",
            "body.ydesign-border-ratings .ydesign-rating { border-color: rgba(255,255,255,0.6) !important; }",
            "",
            "body.ydesign-border-age .ydesign-badge-age { border-color: rgba(255,255,255,0.6) !important; }",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-18 { border-color: rgba(244, 67, 54, 0.85) !important; }",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-16 { border-color: rgba(255, 152, 0, 0.85) !important; }",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-14,",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-13 { border-color: rgba(255, 215, 64, 0.85) !important; }",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-6,",
            "body.ydesign-border-age.ydesign-color-age .ydesign-age-0 { border-color: rgba(105, 240, 174, 0.85) !important; }",
            "",
            "/* Ручні відступи жанрів (коли однаковий відступ ВИМКНЕНО) */",
            "body:not(.ydesign-uniform-v-gaps-v) .ydesign-vertical .ydesign-genres {",
            "    margin-top: calc(var(--ydesign-genres-gap, 0em) / var(--ydesign-genres-size-val, 0.8)) !important;",
            "    margin-bottom: calc(var(--ydesign-genres-gap, 0em) / var(--ydesign-genres-size-val, 0.8)) !important;",
            "}",
            "body:not(.ydesign-uniform-v-gaps-h) .ydesign-horizontal .ydesign-genres {",
            "    margin-top: calc(var(--ydesign-genres-gap, 0em) / var(--ydesign-genres-size-val, 0.8)) !important;",
            "    margin-bottom: calc(var(--ydesign-genres-gap, 0em) / var(--ydesign-genres-size-val, 0.8)) !important;",
            "}",
            "",
            "/* --- СТРОГІ ОДНАКОВІ ВЕРТИКАЛЬНІ ВІДСТУПИ ВІД КРАЇВ ПІГУЛОК ТА ТЕКСТІВ --- */",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-add-title,",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-info-wrap,",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-genres,",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-slogan,",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-ratings {",
            "    margin-top: 0 !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-v:not(.ydesign-badges-one-row) .ydesign-vertical .ydesign-info-wrap {",
            "    gap: 0 !important;",
            "    row-gap: 0 !important;",
            "}",
            "            ",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-add-title,",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-info-wrap,",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-info-wrap-2,",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-genres,",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-slogan {",
            "    margin-top: 0 !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-add-title {",
            "    margin-top: calc(var(--ydesign-uniform-v-gap-v) / var(--ydesign-add-title-size-eff, 0.9)) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-info-wrap {",
            "    margin-top: var(--ydesign-uniform-v-gap-v) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical .ydesign-slogan {",
            "    margin-top: calc(var(--ydesign-uniform-v-gap-v) / var(--ydesign-slogan-size-eff, 0.85)) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-v:not(.ydesign-badges-one-row) .ydesign-vertical .ydesign-info-wrap > * {",
            "    margin-top: 0 !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-v:not(.ydesign-badges-one-row) .ydesign-vertical .ydesign-info-wrap > * + * {",
            "    margin-top: var(--ydesign-uniform-v-gap-v) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-add-title {",
            "    margin-top: calc(var(--ydesign-uniform-v-gap-h) / var(--ydesign-add-title-size-eff, 0.9)) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-info-wrap,",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-info-wrap-2 {",
            "    margin-top: var(--ydesign-uniform-v-gap-h) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-genres {",
            "    margin-top: var(--ydesign-uniform-v-gap-h) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal .ydesign-slogan {",
            "    margin-top: calc(var(--ydesign-uniform-v-gap-h) / var(--ydesign-slogan-size-eff, 0.85)) !important;",
            "    margin-bottom: 0 !important;",
            "}",
            "",
            "body.ydesign-uniform-v-gaps-v .ydesign-vertical > .ydesign-content-layer > .ydesign-logo-container + * {",
            "    margin-top: 0 !important;",
            "}",
            "body.ydesign-uniform-v-gaps-h .ydesign-horizontal > .ydesign-content-layer > .ydesign-logo-container + * {",
            "    margin-top: 0 !important;",
            "}",
            "",
            ".ydesign-desc-under {",
            "    position: relative; z-index: 10; width: 100%;",
            "    font-size: calc(var(--ydesign-desc-size-val, 0.85) * 1em) !important;",
            "    color: rgba(255,255,255,0.75);",
            "    margin-top: 0.5em; text-align: left;",
            "    line-height: 1.35;",
            "    text-shadow: 0 1px 3px rgba(0,0,0,0.8);",
            "    display: -webkit-box;",
            "    -webkit-line-clamp: 3;",
            "    -webkit-box-orient: vertical;",
            "    overflow: hidden;",
            "    height: calc(1.35em * 3) !important; ",
            "}",
            "",
            "body.ydesign-hide-year .ydesign-badge-year { display: none !important; }",
            "body.ydesign-hide-seasons .ydesign-badge-seasons { display: none !important; }",
            "body.ydesign-hide-ua .ydesign-badge-ua { display: none !important; }",
            "body.ydesign-hide-age .ydesign-badge-age { display: none !important; }",
            "body.ydesign-hide-slogan .ydesign-slogan-text { display: none !important; }",
            "",
            "body[data-ydesign-logo='text'] .ydesign-logo-img { display: none !important; }",
            "body[data-ydesign-logo='text'] .ydesign-fallback-text { display: flex !important; }",
            "body[data-ydesign-logo='logo'] .ydesign-fallback-text { display: none !important; }",
            "",
            "/* =========================================================================",
            "   РЕДИЗАЙН СЕРІЙ ТА ЕПІЗОДІВ (НАДІЙНИЙ ФОКУС ТА НАВІГАЦІЯ)",
            "   ========================================================================= */",
            ".explorer.ydesign-has-series .online-prestige.online-prestige-watched.ydesign-empty-history {",
            "    display: none !important;",
            "    pointer-events: none !important;",
            "    visibility: hidden !important;",
            "    height: 0 !important;",
            "    margin: 0 !important;",
            "    padding: 0 !important;",
            "}",
            "",
            "/* Захисний відступ зверху, щоб картки серій ніколи не заїжджали під верхні кнопки */",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__left {",
            "    display: none !important;",
            "}",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__files,",
            ".explorer.ydesign-has-series .explorer__files {",
            "    width: 100% !important;",
            "    flex: 1 1 100% !important;",
            "    max-width: 100% !important;",
            "    padding-left: 0 !important;",
            "    padding-top: 15px !important;",
            "    box-sizing: border-box !important;",
            "}",
            ".explorer.ydesign-has-series .explorer__files .scroll__body {",
            "    padding-top: 12px !important;",
            "    padding-bottom: 25px !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full {",
            "    display: inline-block !important;",
            "    vertical-align: top !important;",
            "    margin: 10px !important;",
            "    position: relative !important;",
            "    height: auto !important;",
            "    border-radius: 0.85em !important;",
            "    overflow: hidden !important;",
            "    background-color: #1a1a1a !important;",
            "    box-sizing: border-box !important;",
            "    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;",
            "    border: none !important;",
            "    outline: none !important;",
            "    box-shadow: 0 4px 14px rgba(0,0,0,0.5) !important;",
            "    width: calc(var(--ydesign-series-width, 50%) - 20px) !important;",
            "    cursor: pointer !important;",
            "    pointer-events: auto !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full::before {",
            "    content: ''; display: block !important; padding-top: 56.25% !important; ",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full.focus {",
            "    transform: scale(1.035) !important;",
            "    box-shadow: 0 0 0 3px #ffffff, 0 12px 28px rgba(0,0,0,0.85) !important;",
            "    z-index: 15 !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__img {",
            "    position: absolute !important; top: 0 !important; left: 0 !important;",
            "    width: 100% !important; height: 100% !important;",
            "    z-index: 1 !important; border-radius: 0 !important;",
            "    pointer-events: none !important;",
            "}",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__img img {",
            "    width: 100% !important; height: 100% !important; object-fit: cover !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            "/* Динамічний градієнтний шар серій */",
            ".ydesign-series-active .online-prestige.online-prestige--full .ydesign-series-shade {",
            "    position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;",
            "    background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 38%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.65) 100%) !important;",
            "    z-index: 2 !important; pointer-events: none !important;",
            "    transition: background 0.3s ease !important;",
            "}",
            "",
            "/* Стилі пігулок серій */",
            ".ydesign-series-pill {",
            "    display: inline-flex !important;",
            "    align-items: center !important;",
            "    justify-content: center !important;",
            "    height: 1.70em !important;",
            "    min-height: 1.70em !important;",
            "    max-height: 1.70em !important;",
            "    padding: 0 0.55em !important;",
            "    box-sizing: border-box !important;",
            "    font-size: 0.8em !important;",
            "    font-weight: 600 !important;",
            "    color: #ffffff !important;",
            "    text-shadow: none !important;",
            "    box-shadow: none !important;",
            "    white-space: nowrap !important;",
            "    line-height: 1.70em !important;",
            "    text-align: center !important;",
            "    vertical-align: middle !important;",
            "    border: 1px solid transparent !important;",
            "    background: transparent !important;",
            "    border-radius: var(--ydesign-series-badge-radius, 50px) !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            "body.ydesign-series-shape-pill { --ydesign-series-badge-radius: 50px; }",
            "body.ydesign-series-shape-rounded { --ydesign-series-badge-radius: 0.35em; }",
            "body.ydesign-series-shape-square { --ydesign-series-badge-radius: 0.15em; }",
            "",
            "body.ydesign-series-glass-pill .ydesign-series-pill {",
            "    background: rgba(255, 255, 255, 0.12) !important;",
            "    backdrop-filter: blur(6px) !important;",
            "    -webkit-backdrop-filter: blur(6px) !important;",
            "    box-shadow: none !important;",
            "}",
            "",
            "body.ydesign-series-border-badges .ydesign-series-pill {",
            "    border-color: rgba(255, 255, 255, 0.45) !important;",
            "}",
            "",
            ".ydesign-series-top-left {",
            "    position: absolute !important;",
            "    top: 10px !important; left: 12px !important;",
            "    z-index: 5 !important;",
            "    display: flex !important; align-items: center !important; gap: 6px !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-top-right {",
            "    position: absolute !important;",
            "    top: 10px !important; right: 12px !important;",
            "    z-index: 5 !important;",
            "    display: flex !important; align-items: center !important; gap: 6px !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-bottom-left {",
            "    position: absolute !important;",
            "    bottom: calc(1.15em + 8px) !important; left: 12px !important; right: 80px !important;",
            "    z-index: 5 !important;",
            "    display: flex !important; flex-direction: column !important; align-items: flex-start !important;",
            "    gap: 5px !important;",
            "    max-width: calc(100% - 92px) !important;",
            "    overflow: hidden !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-bottom-right {",
            "    position: absolute !important;",
            "    bottom: calc(1.15em + 8px) !important; right: 12px !important;",
            "    z-index: 5 !important;",
            "    display: flex !important; align-items: center !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-voice-wrap {",
            "    max-width: 100% !important;",
            "    display: flex !important;",
            "    overflow: hidden !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-voice-badge {",
            "    color: #ffffff !important;",
            "    font-weight: 600 !important;",
            "    max-width: 100% !important;",
            "    overflow: hidden !important;",
            "    text-overflow: ellipsis !important;",
            "    white-space: nowrap !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-date {",
            "    font-weight: 500 !important;",
            "    color: #ffffff !important;",
            "    opacity: 0.95 !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-rate {",
            "    color: #ffffff !important;",
            "    font-weight: 700 !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            "/* Зменшений розмір тексту назви серії */",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__title {",
            "    font-size: 0.9em !important;",
            "    font-weight: 600 !important;",
            "    line-height: 1.25 !important;",
            "    color: #ffffff !important;",
            "    text-shadow: 0 2px 4px rgba(0,0,0,0.95) !important;",
            "    margin: 0 !important; padding: 0 !important;",
            "    white-space: nowrap !important;",
            "    overflow: hidden !important;",
            "    text-overflow: ellipsis !important;",
            "    width: 100% !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            "/* ВІДНОВЛЕНА ВИСОКА СМУЖКА ТАЙМКОДУ */",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline {",
            "    position: absolute !important;",
            "    bottom: 0 !important;",
            "    left: 0 !important;",
            "    right: 0 !important;",
            "    width: 100% !important;",
            "    height: 1.15em !important;",
            "    margin: 0 !important;",
            "    z-index: 12 !important;",
            "    background: rgba(255, 255, 255, 0.22) !important;",
            "    backdrop-filter: blur(6px) !important;",
            "    -webkit-backdrop-filter: blur(6px) !important;",
            "    border-radius: 0 0 0.85em 0.85em !important;",
            "    overflow: hidden !important;",
            "    display: block !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline .time-line {",
            "    width: 100% !important;",
            "    height: 100% !important;",
            "    background: transparent !important;",
            "    margin: 0 !important;",
            "    border-radius: 0 !important;",
            "    position: absolute !important;",
            "    top: 0 !important;",
            "    left: 0 !important;",
            "    z-index: 1 !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline .time-line > div {",
            "    height: 100% !important;",
            "    border-radius: 0 !important;",
            "    background: #ffffff !important;",
            "    box-shadow: 0 0 8px rgba(255,255,255,0.7) !important;",
            "    transition: width 0.3s ease !important;",
            "    pointer-events: none !important;",
            "}",
            "",
            "/* ЧИСТИЙ ТОНКИЙ ЧОРНИЙ ШРИФТ ВІДСОТКІВ БЕЗ СВІЧЕННЯ */",
            ".ydesign-series-percent-text {",
            "    position: absolute !important;",
            "    top: 0 !important;",
            "    left: 0 !important;",
            "    right: 0 !important;",
            "    bottom: 0 !important;",
            "    width: 100% !important;",
            "    height: 100% !important;",
            "    display: flex !important;",
            "    align-items: center !important;",
            "    justify-content: center !important;",
            "    font-size: 0.8em !important;",
            "    font-weight: 500 !important;",
            "    color: #000000 !important;",
            "    text-shadow: none !important;",
            "    z-index: 20 !important;",
            "    pointer-events: none !important;",
            "    line-height: 1 !important;",
            "}",
            "",
            ".ydesign-series-active .online-prestige.online-prestige--full .online-prestige__timeline::after {",
            "    content: attr(data-percent) !important;",
            "    position: absolute !important;",
            "    top: 0 !important;",
            "    left: 0 !important;",
            "    width: 100% !important;",
            "    height: 100% !important;",
            "    display: flex !important;",
            "    align-items: center !important;",
            "    justify-content: center !important;",
            "    font-size: 0.8em !important;",
            "    font-weight: 500 !important;",
            "    color: #000000 !important;",
            "    text-shadow: none !important;",
            "    z-index: 19 !important;",
            "    pointer-events: none !important;",
            "    line-height: 1 !important;",
            "}",
            "",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__left {",
            "    display: none !important;",
            "}",
            "body.ydesign-hide-left-column .explorer.ydesign-has-series .explorer__files {",
            "    width: 100% !important; flex: 1 1 100% !important; max-width: 100% !important; padding-left: 0 !important;",
            "}"
        ].join('\n');
    }

    function getFlexAlign(val) {
        if (val === 'left') return 'flex-start';
        if (val === 'right') return 'flex-end';
        return 'center';
    }

    function applyDynamicCSS() {
        try {
            document.body.classList.add('ydesign-active');
            document.body.classList.toggle('ydesign-series-active', getSet('ydesign_series_redesign'));
            document.body.classList.toggle('ydesign-series-glass-pill', getSet('ydesign_series_glass_pill'));
            document.body.classList.toggle('ydesign-series-border-badges', getSet('ydesign_series_border_badges'));

            var sShape = getSet('ydesign_series_badge_shape');
            document.body.classList.remove('ydesign-series-shape-pill', 'ydesign-series-shape-rounded', 'ydesign-series-shape-square');
            document.body.classList.add('ydesign-series-shape-' + sShape);

            document.body.classList.toggle('ydesign-uniform-badges', getSet('ydesign_uniform_badges'));
            document.body.classList.toggle('ydesign-uniform-v-gaps-v', getSet('ydesign_uniform_v_gaps_vert'));
            document.body.classList.toggle('ydesign-uniform-v-gaps-h', getSet('ydesign_uniform_v_gaps_horz'));
            document.body.classList.toggle('ydesign-hide-left-column', getSet('ydesign_hide_left_column'));

            // Окремі класи рамок
            document.body.classList.toggle('ydesign-border-year', getSet('ydesign_border_year'));
            document.body.classList.toggle('ydesign-border-age', getSet('ydesign_border_age'));
            document.body.classList.toggle('ydesign-border-seasons', getSet('ydesign_border_seasons'));
            document.body.classList.toggle('ydesign-border-ua', getSet('ydesign_border_ua'));
            document.body.classList.toggle('ydesign-border-genres', getSet('ydesign_border_genres'));
            document.body.classList.toggle('ydesign-border-ratings', getSet('ydesign_border_ratings'));

            document.body.classList.toggle('ydesign-color-age', getSet('ydesign_color_age'));
            document.body.classList.toggle('ydesign-color-ua', getSet('ydesign_color_ua'));
            document.body.classList.toggle('ydesign-glass-pill', getSet('ydesign_glass_pill_bg'));

            // Форма бейджів
            var shape = getSet('ydesign_badge_shape');
            document.body.classList.remove('ydesign-shape-pill', 'ydesign-shape-rounded', 'ydesign-shape-square');
            document.body.classList.add('ydesign-shape-' + shape);

            document.body.dataset.ydesignLogo = getSet('ydesign_logo_type');

            var seriesCards = parseInt(getSet('ydesign_series_cards')) || 2;
            var seriesWidth = (100 / seriesCards) + '%';
            document.documentElement.style.setProperty('--ydesign-series-width', seriesWidth);

            document.documentElement.style.setProperty('--ydesign-grid-items-v', getSet('ydesign_grid_items_v'));
            document.documentElement.style.setProperty('--ydesign-grid-items-h', getSet('ydesign_grid_items_h'));

            document.documentElement.style.setProperty('--ydesign-logo-h', getSet('ydesign_logo_max_h') + '%');
            document.documentElement.style.setProperty('--ydesign-logo-w', getSet('ydesign_logo_max_w') + '%');

            document.documentElement.style.setProperty('--ydesign-title-size-val', getSet('ydesign_text_title_size'));
            document.documentElement.style.setProperty('--ydesign-add-title-size-val', getSet('ydesign_text_add_title_size'));
            document.documentElement.style.setProperty('--ydesign-text-slogan-size-val', getSet('ydesign_text_slogan_size'));
            
            document.documentElement.style.setProperty('--ydesign-badge-size-val', getSet('ydesign_text_badge_size'));
            document.documentElement.style.setProperty('--ydesign-year-size-val', getSet('ydesign_text_year_size'));
            document.documentElement.style.setProperty('--ydesign-age-size-val', getSet('ydesign_text_age_size'));
            document.documentElement.style.setProperty('--ydesign-seasons-size-val', getSet('ydesign_text_seasons_size'));
            document.documentElement.style.setProperty('--ydesign-ua-size-val', getSet('ydesign_text_ua_size'));
            document.documentElement.style.setProperty('--ydesign-genres-size-val', getSet('ydesign_text_genres_size'));
            document.documentElement.style.setProperty('--ydesign-rating-size-val', getSet('ydesign_text_rating_size'));
            document.documentElement.style.setProperty('--ydesign-desc-size-val', getSet('ydesign_desc_size'));

            document.documentElement.style.setProperty('--ydesign-uniform-v-gap-v', getSet('ydesign_uniform_v_gap_val_vert') + 'em');
            document.documentElement.style.setProperty('--ydesign-uniform-v-gap-h', getSet('ydesign_uniform_v_gap_val_horz') + 'em');
            document.documentElement.style.setProperty('--ydesign-card-gap', getSet('ydesign_card_gap') + 'em');
            document.documentElement.style.setProperty('--ydesign-badge-rows-gap', getSet('ydesign_badge_rows_gap') + 'em');
            document.documentElement.style.setProperty('--ydesign-badges-gap-v', getSet('ydesign_badges_gap_vert') + 'em');
            document.documentElement.style.setProperty('--ydesign-badges-gap-horz', getSet('ydesign_badges_gap_horz') + 'em');
            document.documentElement.style.setProperty('--ydesign-genres-gap', getSet('ydesign_genres_gap') + 'em');

            document.documentElement.style.setProperty('--ydesign-content-pb', getSet('ydesign_content_pb') + 'em');
            document.documentElement.style.setProperty('--ydesign-slogan-padding', getSet('ydesign_slogan_padding') + 'em');
            document.documentElement.style.setProperty('--ydesign-logo-mb', getSet('ydesign_logo_mb') + 'em');
            document.documentElement.style.setProperty('--ydesign-add-title-mb', getSet('ydesign_add_title_mb') + 'em');
            document.documentElement.style.setProperty('--ydesign-ratings-saturate', getSet('ydesign_ratings_saturate') + '%');

            var alignLogo = getSet('ydesign_align_logo');
            document.documentElement.style.setProperty('--ydesign-align-logo', getFlexAlign(alignLogo));
            document.documentElement.style.setProperty('--ydesign-text-logo', alignLogo);

            var alignAddTitle = getSet('ydesign_align_add_title');
            document.documentElement.style.setProperty('--ydesign-text-add-title', alignAddTitle);

            document.documentElement.style.setProperty('--ydesign-align-badges', getFlexAlign(getSet('ydesign_align_badges')));

            var alignSlogan = getSet('ydesign_align_slogan');
            document.documentElement.style.setProperty('--ydesign-align-slogan', getFlexAlign(alignSlogan));
            document.documentElement.style.setProperty('--ydesign-text-slogan', alignSlogan);

            document.body.classList.toggle('ydesign-hide-year', !getSet('ydesign_show_year'));
            document.body.classList.toggle('ydesign-hide-seasons', !getSet('ydesign_show_seasons'));
            document.body.classList.toggle('ydesign-hide-ua', !getSet('ydesign_show_ua'));
            document.body.classList.toggle('ydesign-hide-age', !getSet('ydesign_show_age'));
            document.body.classList.toggle('ydesign-hide-slogan', !getSet('ydesign_show_slogan'));
            document.body.classList.toggle('ydesign-badges-one-row', getSet('ydesign_badges_one_row'));
        } catch (e) {}
    }

    // =========================================================================
    // 11. МЕНЮ НАЛАШТУВАНЬ (YDesign)
    // =========================================================================
    function createSettings() {
        if (!window.Lampa || !Lampa.SettingsApi) return;

        var qualities = { 'w92': 'w92', 'w154': 'w154', 'w200': 'w200', 'w300': 'w300', 'w500': 'w500', 'w780': 'w780', 'original': 'Оригінал' };

        var textSizesExt = {};
        for (var i = 5; i <= 40; i += 1) { var v = (i / 10).toFixed(1); textSizesExt[v] = v; }

        var gaps = {};
        for (var g = -20; g <= 40; g += 1) { var gv = (g / 10).toFixed(1); gaps[gv] = gv + ' em'; }

        var tinyGaps = {};
        for (var tg = -20; tg <= 40; tg += 1) { var tgv = (tg * 0.05).toFixed(2); tinyGaps[tgv] = tgv + ' em'; }

        var microGaps = {};
        for (var mg = -100; mg <= 200; mg += 1) { var mgv = (mg / 100).toFixed(2); microGaps[mgv] = mgv + ' em'; }

        var logoSizes = {};
        for (var ls = 1; ls <= 34; ls += 3) { logoSizes[ls] = ls + '%'; }
        logoSizes[35] = '35%';
        [40, 50, 60, 70, 80, 90, 100].forEach(function (val) { logoSizes[val] = val + '%'; });

        var saturates = { '0': '0% (Чорно-білі)', '25': '25%', '75': '75%', '100': '100% (Кольорові)' };
        var aligns = { 'left': 'Ліворуч', 'center': 'По центру', 'right': 'Праворуч' };
        var shapes = { 'pill': 'Пігулка (Сучасний Pill Capsule)', 'rounded': 'Прямокутний скруглений (4px)', 'square': 'Прямокутний (2px)' };

        ['ydesign_grid', 'ydesign_badges', 'ydesign_gaps', 'ydesign_texts', 'ydesign_series', 'ydesign_perf'].forEach(function (compKey) {
            Lampa.Template.add('settings_' + compKey, '<div></div>');
        });

        Lampa.SettingsApi.addComponent({
            component: 'ydesign',
            name: CONFIG.name,
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect><path d="M8 8l4 4 4-4"></path><path d="M12 12v4"></path></svg>'
        });

        // 1. ДОНАТ ТА ІНФОРМАЦІЯ НА САМОМУ ПЕРШОМУ МІСЦІ В МЕНЮ
        Lampa.SettingsApi.addParam({
            component: 'ydesign',
            param: { name: 'ydesign_donate_btn_main', type: 'button' },
            field: {
                name: '💙 YDesign • Підтримати розробника',
                description: 'Натисніть для переходу на ymods.donatik.ua та отримання оновлень'
            },
            onChange: function () { window.open('https://ymods.donatik.ua/', '_blank'); }
        });

        Lampa.SettingsApi.addParam({
            component: 'ydesign',
            param: { type: 'title' },
            field: { name: 'Розділи налаштувань' }
        });

        var subSections = [
            { id: 'ydesign_grid', name: '🎬 Відображення карток та Сітка', desc: 'Формат карток (вертикальні/горизонтальні), кількість колонок та ліниве завантаження' },
            { id: 'ydesign_badges', name: '🏷️ Бейджі, Жанри та Рейтинги', desc: 'Рік, вік, сезони, плашка UA озвучки, жанри, індивідуальні розміри та форма пігулки' },
            { id: 'ydesign_gaps', name: '📏 Відступи, Рамки та Вирівнювання', desc: 'Окремі рамки для кожного бейджу, точні ручні відступи та математичне вирівнювання' },
            { id: 'ydesign_texts', name: '🔤 Логотипи, Тексти та Мови', desc: 'Вибір мови, розміри шрифтів, висота/ширина логотипу та якість TMDB' },
            { id: 'ydesign_series', name: '📺 Редизайн Серій та Епізодів', desc: 'Стиль пігулок, дата в кутку, окрема озвучка, рамки та підложка серій' },
            { id: 'ydesign_perf', name: '⚙️ API Ключі, Кеш та Підтримка', desc: 'OMDb/MDBList ключі, очищення кешу плагіну та QR підтримки' }
        ];

        subSections.forEach(function (sub) {
            Lampa.SettingsApi.addParam({
                component: 'ydesign',
                param: { type: 'button' },
                field: { name: sub.name, description: sub.desc },
                onChange: function () {
                    Lampa.Settings.create(sub.id, {
                        onBack: function () {
                            Lampa.Settings.create('ydesign');
                        }
                    });
                }
            });
        });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 1: СІТКА ТА ТИПИ КАРТОК (ydesign_grid)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_lazy_load', type: 'trigger', default: DefaultSettings.ydesign_lazy_load }, field: { name: 'Ліниве завантаження', description: 'Завантажувати додаткові дані (лого, рейтинги) тільки при появі картки на екрані' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_card_type_main', type: 'select', values: { 'vertical': 'Вертикальні (9:16)', 'horizontal': 'Горизонтальні (16:11)' }, default: DefaultSettings.ydesign_card_type_main }, field: { name: 'Тип карток (Головна)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_card_type_other', type: 'select', values: { 'vertical': 'Вертикальні (9:16)', 'horizontal': 'Горизонтальні (16:11)' }, default: DefaultSettings.ydesign_card_type_other }, field: { name: 'Тип карток (Інші сторінки)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_grid_items_v', type: 'select', values: { '4': '4', '5': '5', '6': '6', '7': '7', '8': '8' }, default: DefaultSettings.ydesign_grid_items_v }, field: { name: 'Кількість карток у сітці (Вертикальні)', description: 'Вирішує проблему пустого відступу зправа. Картки будуть розтягуватись щоб зайняти весь простір.' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_grid_items_h', type: 'select', values: { '2': '2', '3': '3', '4': '4', '5': '5' }, default: DefaultSettings.ydesign_grid_items_h }, field: { name: 'Кількість карток у сітці (Горизонтальні)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_card_gap', type: 'select', values: gaps, default: DefaultSettings.ydesign_card_gap }, field: { name: 'Відстань між картками' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_grid', param: { name: 'ydesign_show_desc_horz', type: 'trigger', default: DefaultSettings.ydesign_show_desc_horz }, field: { name: 'Опис під карткою (Горизонтальні)' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 2: БЕЙДЖІ, ЖАНРИ ТА РЕЙТИНГИ (ydesign_badges)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_badge_shape', type: 'select', values: shapes, default: DefaultSettings.ydesign_badge_shape }, field: { name: 'Форма бейджів', description: 'Сучасна форма пігулки (Pill Capsule) зі стильним скругленням' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_glass_pill_bg', type: 'trigger', default: DefaultSettings.ydesign_glass_pill_bg }, field: { name: 'Скляна підложка для бейджів (Liquid Glass)', description: 'Додає напівпрозорий скляний фон під кожну плашку бейджа' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_year', type: 'trigger', default: DefaultSettings.ydesign_show_year }, field: { name: 'Показувати Рік' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_seasons', type: 'trigger', default: DefaultSettings.ydesign_show_seasons }, field: { name: 'Показувати Сезони/Серії' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_age', type: 'trigger', default: DefaultSettings.ydesign_show_age }, field: { name: 'Показувати віковий рейтинг' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_color_age', type: 'trigger', default: DefaultSettings.ydesign_color_age }, field: { name: 'Кольорові бейджі віку (18+, 16+, 12+, 0+)', description: 'Вимкніть для класичного чорно-білого вигляду' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_ua', type: 'trigger', default: DefaultSettings.ydesign_show_ua }, field: { name: 'Показувати плашку UA (через API)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_color_ua', type: 'trigger', default: DefaultSettings.ydesign_color_ua }, field: { name: 'Кольорова плашка UA (Синьо-жовта)', description: 'Вимкніть для чорно-білого вигляду' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_genres', type: 'trigger', default: DefaultSettings.ydesign_show_genres }, field: { name: 'Показувати Жанри' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_show_slogan', type: 'trigger', default: DefaultSettings.ydesign_show_slogan }, field: { name: 'Показувати слоган' } });
        
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { type: 'title' }, field: { name: 'Розміри бейджів (Окремо або Разом)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_uniform_badges', type: 'trigger', default: DefaultSettings.ydesign_uniform_badges }, field: { name: 'Усі бейджі одного розміру', description: 'Коли увімкнено - усі бейджі (рік, вік, сезони, UA, жанри, рейтинги) мають строго однакову висоту пігулки та однаковий розмір шрифту.' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_badge_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_badge_size }, field: { name: 'Базовий розмір бейджів (коли однаковий розмір)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_year_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_year_size }, field: { name: 'Розмір бейджу Року (Індивідуальний)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_age_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_age_size }, field: { name: 'Розмір бейджу Віку (Індивідуальний)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_seasons_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_seasons_size }, field: { name: 'Розмір бейджу Сезонів/Серій (Індивідуальний)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_ua_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_ua_size }, field: { name: 'Розмір бейджу UA озвучки (Індивідуальний)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_genres_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_genres_size }, field: { name: 'Розмір бейджів Жанрів (Індивідуальний)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_text_rating_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_rating_size }, field: { name: 'Розмір бейджів Рейтингів (Індивідуальний)' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { type: 'title' }, field: { name: 'Рядки та порядок рейтингів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_badges_one_row', type: 'trigger', default: DefaultSettings.ydesign_badges_one_row }, field: { name: 'Усі бейджі в 1 ряд (Вертикальні)', description: 'Рейтинги та бейджі будуть розташовані в один суцільний ряд' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_horz_ratings_row', type: 'trigger', default: DefaultSettings.ydesign_horz_ratings_row }, field: { name: 'Рейтинги з нового рядка (Горизонтальні)', description: 'Переносить блок рейтингів під бейджі року/віку' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_ratings_saturate', type: 'select', values: saturates, default: DefaultSettings.ydesign_ratings_saturate }, field: { name: 'Насиченість іконок рейтингів', description: 'Керує колірною гамою логотипів рейтингів' } });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_badges',
            param: { name: 'ydesign_ratings_order_btn', type: 'button' },
            field: { name: 'Порядок та вибір рейтингів', description: getSet('ydesign_ratings_order') },
            onChange: function () {
                Lampa.Input.edit({
                    title: 'Введіть через кому (tmdb, imdb, rt, mc, trakt, mdblist, popcorn, letterboxd, kp)',
                    value: getSet('ydesign_ratings_order'),
                    free: true, nosave: true
                }, function (new_val) {
                    if (new_val !== undefined) {
                        Lampa.Storage.set('ydesign_ratings_order', new_val.trim().toLowerCase());
                        Lampa.Settings.update();
                    }
                });
            }
        });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 3: ВІДСТУПИ, РАМКИ ТА ВИРІВНЮВАННЯ (ydesign_gaps)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { type: 'title' }, field: { name: 'Окремі рамки для елементів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_year', type: 'trigger', default: DefaultSettings.ydesign_border_year }, field: { name: 'Рамка для бейджу Року' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_age', type: 'trigger', default: DefaultSettings.ydesign_border_age }, field: { name: 'Рамка для бейджу Віку' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_seasons', type: 'trigger', default: DefaultSettings.ydesign_border_seasons }, field: { name: 'Рамка для бейджу Сезонів/Серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_ua', type: 'trigger', default: DefaultSettings.ydesign_border_ua }, field: { name: 'Рамка для бейджу UA озвучки' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_genres', type: 'trigger', default: DefaultSettings.ydesign_border_genres }, field: { name: 'Рамка для бейджів Жанрів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_border_ratings', type: 'trigger', default: DefaultSettings.ydesign_border_ratings }, field: { name: 'Рамка для бейджів Рейтингів' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { type: 'title' }, field: { name: 'Математично рівні відступи' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_uniform_v_gaps_vert', type: 'trigger', default: DefaultSettings.ydesign_uniform_v_gaps_vert }, field: { name: 'Вертикальні відступи однакові (Вертикальні картки)', description: 'Відстань між додатковою назвою, роком, рейтингами, жанрами та слоганом стане строго єдиною' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_uniform_v_gap_val_vert', type: 'select', values: microGaps, default: DefaultSettings.ydesign_uniform_v_gap_val_vert }, field: { name: 'Вертикальний відступ (Вертикальні картки)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_uniform_v_gaps_horz', type: 'trigger', default: DefaultSettings.ydesign_uniform_v_gaps_horz }, field: { name: 'Вертикальні відступи однакові (Горизонтальні картки)', description: 'Відстань між додатковою назвою, роком, рейтингами, жанрами та слоганом стане строго єдиною' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_uniform_v_gap_val_horz', type: 'select', values: microGaps, default: DefaultSettings.ydesign_uniform_v_gap_val_horz }, field: { name: 'Вертикальний відступ (Горизонтальні картки)' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { type: 'title' }, field: { name: 'Ручні налаштування відступів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_badges_gap_vert', type: 'select', values: tinyGaps, default: DefaultSettings.ydesign_badges_gap_vert }, field: { name: 'Відстань між бейджами по горизонталі (Вертикальні картки)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_badges', param: { name: 'ydesign_badges_gap_horz', type: 'select', values: tinyGaps, default: DefaultSettings.ydesign_badges_gap_horz }, field: { name: 'Відстань між бейджами по горизонталі (Горизонтальні картки)' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_badge_rows_gap', type: 'select', values: gaps, default: DefaultSettings.ydesign_badge_rows_gap }, field: { name: 'Відступ між рядками бейджів/рейтингів', description: 'По вертикалі' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_genres_gap', type: 'select', values: tinyGaps, default: DefaultSettings.ydesign_genres_gap }, field: { name: 'Відступ для блоку Жанрів (Ручний режим)', description: 'Зверху та знизу жанрів (коли вимкнено однакові відступи)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_content_pb', type: 'select', values: gaps, default: DefaultSettings.ydesign_content_pb }, field: { name: 'Відступ контенту знизу' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_slogan_padding', type: 'select', values: gaps, default: DefaultSettings.ydesign_slogan_padding }, field: { name: 'Відступ слогану зверху' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_logo_mb', type: 'select', values: gaps, default: DefaultSettings.ydesign_logo_mb }, field: { name: 'Відступ назви/лого від бейджів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_gaps', param: { name: 'ydesign_add_title_mb', type: 'select', values: gaps, default: DefaultSettings.ydesign_add_title_mb }, field: { name: 'Відступ додаткової назви від бейджів' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 4: ЛОГОТИПИ, ТЕКСТИ ТА МОВИ (ydesign_texts)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_type', type: 'select', values: { 'logo': 'Логотип (зображення)', 'text': 'Текст' }, default: DefaultSettings.ydesign_logo_type }, field: { name: 'Відображення назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_lang', type: 'select', values: { 'uk': 'Тільки Українська', 'uk_en': 'Укр -> Англ -> Ориг', 'en_orig': 'Англ -> Ориг' }, default: DefaultSettings.ydesign_lang }, field: { name: 'Мова логотипу/назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_slogan_lang', type: 'select', values: { 'uk': 'Тільки Українська', 'uk_en': 'Укр (Англ. якщо немає)', 'en': 'Тільки Англійська' }, default: DefaultSettings.ydesign_slogan_lang }, field: { name: 'Мова слогану' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_desc_lang', type: 'select', values: { 'uk': 'Тільки Українська', 'uk_en': 'Укр (Англ. якщо немає)', 'en': 'Тільки Англійська' }, default: DefaultSettings.ydesign_desc_lang }, field: { name: 'Мова опису під карткою' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_show_add_title', type: 'trigger', default: DefaultSettings.ydesign_show_add_title }, field: { name: 'Показувати додаткову назву', description: 'Українська назва над бейджами, якщо логотип англійський' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_add_title_lang', type: 'select', values: { 'uk': 'Завжди Українська', 'en': 'Завжди Англійська', 'auto': 'Залежить від логотипу' }, default: DefaultSettings.ydesign_add_title_lang }, field: { name: 'Мова додаткової назви' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_poster_quality', type: 'select', values: qualities, default: DefaultSettings.ydesign_poster_quality }, field: { name: 'Якість постерів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_backdrop_quality', type: 'select', values: qualities, default: DefaultSettings.ydesign_backdrop_quality }, field: { name: 'Якість бекдропів' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_quality', type: 'select', values: qualities, default: DefaultSettings.ydesign_logo_quality }, field: { name: 'Якість логотипів' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_align_logo', type: 'select', values: aligns, default: DefaultSettings.ydesign_align_logo }, field: { name: 'Центрування: Логотип/Назва' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_align_add_title', type: 'select', values: aligns, default: DefaultSettings.ydesign_align_add_title }, field: { name: 'Центрування: Додаткова назва' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_align_badges', type: 'select', values: aligns, default: DefaultSettings.ydesign_align_badges }, field: { name: 'Центрування: Бейджі/Рейтинги' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_align_slogan', type: 'select', values: aligns, default: DefaultSettings.ydesign_align_slogan }, field: { name: 'Центрування: Слоган' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_max_h', type: 'select', values: logoSizes, default: DefaultSettings.ydesign_logo_max_h }, field: { name: 'Макс. висота логотипу/тексту' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_logo_max_w', type: 'select', values: logoSizes, default: DefaultSettings.ydesign_logo_max_w }, field: { name: 'Макс. ширина логотипу/тексту' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_text_title_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_title_size }, field: { name: 'Розмір тексту основної назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_text_add_title_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_add_title_size }, field: { name: 'Розмір шрифту додаткової назви' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_text_slogan_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_text_slogan_size }, field: { name: 'Розмір тексту слогану' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_texts', param: { name: 'ydesign_desc_size', type: 'select', values: textSizesExt, default: DefaultSettings.ydesign_desc_size }, field: { name: 'Розмір тексту опису' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 5: РЕДИЗАЙН СЕРІЙ ТА ЕПІЗОДІВ (ydesign_series)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_redesign', type: 'trigger', default: DefaultSettings.ydesign_series_redesign }, field: { name: 'Змінити вигляд серій', description: 'Активувати новий вигляд карток всередині серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_cards', type: 'select', values: { '1': '1', '2': '2', '3': '3', '4': '4' }, default: DefaultSettings.ydesign_series_cards }, field: { name: 'Кількість карток серій', description: 'Скільки карток показувати в один ряд (для нового вигляду серій)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_hide_left_column', type: 'trigger', default: DefaultSettings.ydesign_hide_left_column }, field: { name: 'Прибрати ліву колонку (Серії)', description: 'Приховує опис та розтягує картки серій на весь екран' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { type: 'title' }, field: { name: 'Стиль та бейджі на картках серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_badge_shape', type: 'select', values: shapes, default: DefaultSettings.ydesign_series_badge_shape }, field: { name: 'Форма бейджів на серіях' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_glass_pill', type: 'trigger', default: DefaultSettings.ydesign_series_glass_pill }, field: { name: 'Скляна підложка (Liquid Glass) для бейджів серій' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_border_badges', type: 'trigger', default: DefaultSettings.ydesign_series_border_badges }, field: { name: 'Рамка для бейджів серій' } });

        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_date', type: 'trigger', default: DefaultSettings.ydesign_series_show_date }, field: { name: 'Показувати дату виходу (зверху ліворуч)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_voice', type: 'trigger', default: DefaultSettings.ydesign_series_show_voice }, field: { name: 'Показувати студію озвучки (окремим рядком)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_rate', type: 'trigger', default: DefaultSettings.ydesign_series_show_rate }, field: { name: 'Показувати рейтинг серії (зверху праворуч)' } });
        Lampa.SettingsApi.addParam({ component: 'ydesign_series', param: { name: 'ydesign_series_show_time', type: 'trigger', default: DefaultSettings.ydesign_series_show_time }, field: { name: 'Показувати тривалість серії (знизу праворуч)' } });

        // -------------------------------------------------------------
        // ПІДКАТЕГОРІЯ 6: API КЛЮЧІ, КЕШ ТА ПІДТРИМКА (ydesign_perf)
        // -------------------------------------------------------------
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_omdb_key_btn', type: 'button' },
            field: { name: 'OMDB API Key', description: getSet('ydesign_omdb_key') ? 'Встановлено' : 'Не встановлено' },
            onChange: function () {
                Lampa.Input.edit({ title: 'OMDB API Key', value: getSet('ydesign_omdb_key'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) { Lampa.Storage.set('ydesign_omdb_key', new_val.trim()); Lampa.Settings.update(); }
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_mdblist_key_btn', type: 'button' },
            field: { name: 'MDBList API Key', description: getSet('ydesign_mdblist_key') ? 'Встановлено' : 'Не встановлено' },
            onChange: function () {
                Lampa.Input.edit({ title: 'MDBList API Key', value: getSet('ydesign_mdblist_key'), free: true, nosave: true }, function (new_val) {
                    if (new_val !== undefined) { Lampa.Storage.set('ydesign_mdblist_key', new_val.trim()); Lampa.Settings.update(); }
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_clear_cache', type: 'button' },
            field: { name: 'Очистити кеш плагіну', description: 'Видаляє кеш зображень, рейтингів та перевірок озвучки' },
            onChange: function () {
                MemoryCache.clear();
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && (key.indexOf('ydesign_c_') === 0 || key.indexOf('ydesign_cache_') === 0)) keysToRemove.push(key);
                }
                keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
                Lampa.Noty.show('Кеш плагіну успішно очищено (' + keysToRemove.length + ' записів)');
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'ydesign_perf',
            param: { name: 'ydesign_donate_qr', type: 'button' },
            field: {
                name: 'Підтримати розробника',
                description: '<div style="margin-top:0.5em;"><img src="https://raw.githubusercontent.com/yarikrazor-star/lmp/refs/heads/main/qrcode_363224392_90d1274dab2843222e1b2172e2fe0026.png" style="width:230px; border-radius:10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div><div style="margin-top:0.5em; opacity:0.8;">Натисніть для переходу на ymods.donatik.ua</div>'
            },
            onChange: function () { window.open('https://ymods.donatik.ua/', '_blank'); }
        });

        // Слідкуємо за змінами
        Lampa.Settings.listener.follow('change', function (e) {
            if (e && e.name && e.name.indexOf('ydesign_') !== -1) {
                applyDynamicCSS();

                var cssOnlyParams = [
                    'ydesign_lazy_load', 'ydesign_grid_items_v', 'ydesign_grid_items_h',
                    'ydesign_logo_max_h', 'ydesign_logo_max_w', 'ydesign_text_title_size',
                    'ydesign_text_add_title_size', 'ydesign_text_slogan_size', 'ydesign_text_badge_size',
                    'ydesign_text_year_size', 'ydesign_text_age_size', 'ydesign_text_seasons_size', 'ydesign_text_ua_size',
                    'ydesign_text_genres_size', 'ydesign_text_rating_size', 'ydesign_desc_size',
                    'ydesign_uniform_v_gap_val_vert', 'ydesign_uniform_v_gap_val_horz', 'ydesign_card_gap',
                    'ydesign_badge_rows_gap', 'ydesign_badges_gap_vert', 'ydesign_badges_gap_horz',
                    'ydesign_genres_gap', 'ydesign_content_pb', 'ydesign_slogan_padding', 'ydesign_logo_mb',
                    'ydesign_add_title_mb', 'ydesign_ratings_saturate', 'ydesign_align_logo', 'ydesign_align_badges',
                    'ydesign_align_slogan', 'ydesign_series_cards', 'ydesign_uniform_v_gaps_vert', 'ydesign_uniform_v_gaps_horz',
                    'ydesign_uniform_badges', 'ydesign_series_redesign',
                    'ydesign_border_year', 'ydesign_border_age', 'ydesign_border_seasons', 'ydesign_border_ua',
                    'ydesign_border_ratings', 'ydesign_border_info', 'ydesign_border_genres',
                    'ydesign_badges_one_row', 'ydesign_show_year', 'ydesign_show_seasons', 'ydesign_show_ua',
                    'ydesign_show_age', 'ydesign_show_slogan', 'ydesign_logo_type', 'ydesign_hide_left_column', 'ydesign_align_add_title',
                    'ydesign_color_age', 'ydesign_color_ua', 'ydesign_badge_shape', 'ydesign_glass_pill_bg',
                    'ydesign_series_glass_pill', 'ydesign_series_border_badges', 'ydesign_series_badge_shape'
                ];

                if (cssOnlyParams.indexOf(e.name) === -1) {
                    document.querySelectorAll('.ydesign-card').forEach(function (c) {
                        if (c._ydesign_data) buildCardCustomDOM(c, c._ydesign_data);
                    });
                    document.querySelectorAll('.online-prestige--full').forEach(function (c) {
                        c.dataset.fixedLayout = "false";
                        formatPrestigeCard(c);
                    });
                }
            }
        });
    }

    // =========================================================================
    // 12. ПЕРЕХОПЛЕННЯ ТА РЕНДЕРИНГ КАРТОК (LAMPA MAKER CARD OVERRIDE)
    // =========================================================================
    function overrideCards() {
        try {
            var CardMaker = Lampa.Maker.map('Card');
            if (!CardMaker || !CardMaker.Card) return;

            var originalOnCreate = CardMaker.Card.onCreate;
            var originalOnVisible = CardMaker.Card.onVisible;

            CardMaker.Card.onCreate = function () {
                if (isMovieCard(this.data, this.html)) {
                    if (typeof this.getPosterPath === 'function') {
                        this.nativeGetPosterPath = this.getPosterPath;
                        this.getPosterPath = function () {
                            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        };
                    }
                    if (typeof this.getBackgroundPath === 'function') {
                        this.nativeGetBackgroundPath = this.getBackgroundPath;
                        this.getBackgroundPath = function () {
                            return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                        };
                    }
                }

                if (typeof originalOnCreate === 'function') {
                    originalOnCreate.apply(this, arguments);
                }
            };

            CardMaker.Card.onVisible = function () {
                if (isMovieCard(this.data, this.html)) {
                    this.image_loaded = true;
                    if (this.img && !this.img.src) {
                        this.img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                    }
                    if (this.html) {
                        this.html.removeClass('card--preload').addClass('card--loaded');
                    }
                }

                if (typeof originalOnVisible === 'function') {
                    originalOnVisible.apply(this, arguments);
                }

                if (isMovieCard(this.data, this.html)) {
                    var cardEl = this.html[0] || this.html;
                    if (!cardEl._ydesign_built) {
                        cardEl._ydesign_built = true;
                        cardEl._ydesign_data = this.data;

                        var activeComp = (Lampa.Activity && Lampa.Activity.active()) ? Lampa.Activity.active().component : 'main';
                        cardEl._ydesign_isMain = (activeComp === 'main');

                        buildCardCustomDOM(cardEl, this.data);
                    }
                }
            };
        } catch (e) {}
    }

    // =========================================================================
    // 13. ПОКРАЩЕНИЙ РЕДИЗАЙН СЕРІЙ ТА ЕПІЗОДІВ
    // =========================================================================
    function cleanBulletsAndSymbols(str) {
        if (!str) return '';
        return str
            .replace(/[\u2022\u25CF\u00B7\u2219\u2043\u25AA\u25AB\u25C6\u2023•●·|*—–/\\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isValidNumericRating(str) {
        if (!str) return false;
        var cleaned = str.replace(/[★\s]/g, '').trim();
        if (!/^\d+(\.\d+)?$/.test(cleaned)) return false;
        var num = parseFloat(cleaned);
        return !isNaN(num) && num > 0 && num <= 10;
    }

    function isQualityString(str) {
        if (!str) return false;
        return /^(2160p|1080p|720p|480p|360p|4k|uhd|hdr|fhd|hd|sd)$/i.test(str.trim());
    }

    function updateCardTimeline(card) {
        try {
            if (!card || !card.classList || !card.classList.contains('online-prestige--full')) return;

            var existingTimeline = card.querySelector('.online-prestige__timeline');
            var rawTl = card.querySelector('.time-line');
            var innerLine = card.querySelector('.time-line > div');

            var percent = null;

            // 1. Зчитування зі style.width внутрішньої лінії плеєра
            if (innerLine && innerLine.style && innerLine.style.width) {
                var sw = innerLine.style.width.trim();
                if (sw && sw !== '0%' && sw !== '0px') {
                    var iv = parseFloat(sw);
                    if (!isNaN(iv) && iv > 0 && iv <= 100) {
                        percent = Math.round(iv);
                    }
                }
            }

            // 2. Зчитування з об'єкта даних картки
            if (percent === null && card.data && card.data.timeline && card.data.timeline.percent) {
                var dp = parseFloat(card.data.timeline.percent);
                if (!isNaN(dp) && dp > 0 && dp <= 100) {
                    percent = Math.round(dp);
                }
            }

            // 3. Якщо перегляду немає - прибираємо будь-який помилковий текст та ховаємо таймлайн
            if (percent === null || percent <= 0) {
                if (existingTimeline) {
                    var oldText = existingTimeline.querySelector('.ydesign-series-percent-text');
                    if (oldText) oldText.remove();
                    existingTimeline.removeAttribute('data-percent');
                    if (!innerLine || !innerLine.style.width || innerLine.style.width === '0%' || innerLine.style.width === '0px') {
                        existingTimeline.style.display = 'none';
                    }
                }
                return;
            }

            // 4. Якщо реальний прогрес є (> 0%)
            var timeline = existingTimeline;
            if (!timeline && rawTl) {
                timeline = document.createElement('div');
                timeline.className = 'online-prestige__timeline';
                rawTl.parentNode.insertBefore(timeline, rawTl);
                timeline.appendChild(rawTl);
                card.appendChild(timeline);
            } else if (!timeline) {
                timeline = document.createElement('div');
                timeline.className = 'online-prestige__timeline';
                timeline.innerHTML = '<div class="time-line"><div style="width: ' + percent + '%"></div></div>';
                card.appendChild(timeline);
            } else if (timeline.parentNode !== card) {
                card.appendChild(timeline);
            }

            timeline.style.display = 'block';
            timeline.setAttribute('data-percent', percent + '%');

            var actualInnerLine = timeline.querySelector('.time-line > div');
            if (actualInnerLine) {
                actualInnerLine.style.width = percent + '%';
            }

            var percentTextEl = timeline.querySelector('.ydesign-series-percent-text');
            if (!percentTextEl) {
                percentTextEl = document.createElement('div');
                percentTextEl.className = 'ydesign-series-percent-text';
                timeline.appendChild(percentTextEl);
            }
            percentTextEl.innerText = percent + '%';
        } catch (e) {}
    }

    function formatPrestigeCard(card) {
        if (!getSet('ydesign_series_redesign')) return false;
        
        // Приховуємо лише порожній рядок/банер історії (якщо є "Нет истории просмотра" / "Немає історії")
        if (card.classList.contains('online-prestige-watched')) {
            var txt = (card.innerText || '').toLowerCase();
            if (txt.indexOf('истори') !== -1 || txt.indexOf('історі') !== -1 || txt.indexOf('history') !== -1) {
                card.classList.add('ydesign-empty-history');
                card.style.display = 'none';
                card.classList.remove('selector', 'focus');
                return false;
            }
        }

        // Якщо це картка вибору фільму/папки/сезону (без класу --full), НЕ ховаємо її, зберігаємо для вибору
        if (!card.classList.contains('online-prestige--full')) {
            return false;
        }

        // Забезпечуємо наявність selector для повноцінних карток
        card.classList.add('selector');

        if (card.dataset.fixedLayout === "true") return false;
        card.dataset.fixedLayout = "true";

        var explorer = card.closest('.explorer');
        if (explorer && !explorer.classList.contains('ydesign-has-series')) {
            explorer.classList.add('ydesign-has-series');
        }

        if (card.classList.contains('online-prestige-watched')) {
            card.style.opacity = '0.55';
        }

        // 1. Градієнтний шар затемнення
        var shade = card.querySelector('.ydesign-series-shade');
        if (!shade) {
            shade = document.createElement('div');
            shade.className = 'ydesign-series-shade';
            card.appendChild(shade);
        }

        // Динамічний витяг кольору кадру серії
        var imgEl = card.querySelector('.online-prestige__img img');
        if (imgEl && imgEl.src && imgEl.src.indexOf('data:') === -1) {
            getProminentColorAsync(imgEl.src).then(function (color) {
                if (color && shade) {
                    card.style.backgroundColor = color;
                    var rgba90 = color.replace('rgb', 'rgba').replace(')', ', 0.92)');
                    var rgba50 = color.replace('rgb', 'rgba').replace(')', ', 0.55)');
                    shade.style.background = 'linear-gradient(to top, ' + color + ' 0%, ' + rgba90 + ' 38%, transparent 68%, ' + rgba50 + ' 100%)';
                }
            });
        }

        // 2. Витягуємо сирі дані з картки
        var infoBlock = card.querySelector('.online-prestige__info');
        var rawText = infoBlock ? infoBlock.innerText : '';

        var dateVal = '';
        var voiceVal = '';
        var rateVal = '';

        // Пошук дати
        var monthNames = '(?:Січня|Лютого|Березня|Квітня|Травня|Червня|Липня|Серпня|Вересня|Жовтня|Листопада|Грудня|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)';
        var dateRegex = new RegExp('(\\d{1,2}\\s+' + monthNames + '(?:\\s+\\d{2,4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}|\\d{4}\\s*р\\.?)', 'i');
        
        var dateMatch = dateRegex.exec(rawText);
        if (dateMatch) {
            dateVal = dateMatch[0].trim();
            rawText = rawText.split(dateMatch[0]).join(' ');
        }

        // Пошук рейтингу
        if (infoBlock) {
            var spans = infoBlock.querySelectorAll('span');
            for (var s = 0; s < spans.length; s++) {
                var st = spans[s].textContent.replace(/★/g, '').trim();
                if (isValidNumericRating(st)) {
                    rateVal = parseFloat(st).toFixed(1);
                    rawText = rawText.split(spans[s].textContent).join(' ');
                    break;
                }
            }
        }
        if (!rateVal) {
            var rateMatch = /(?:★\s*)?(\b[1-9](\.\d)?\b)/.exec(rawText);
            if (rateMatch && isValidNumericRating(rateMatch[1])) {
                rateVal = parseFloat(rateMatch[1]).toFixed(1);
                rawText = rawText.replace(rateMatch[0], ' ');
            }
        }

        // Якщо дата все ще не знайдена, але є 4-значний рік
        if (!dateVal) {
            var yearMatch = /\b(19\d\d|20\d\d)\b/.exec(rawText);
            if (yearMatch) {
                dateVal = yearMatch[0].trim();
                rawText = rawText.replace(yearMatch[0], ' ');
            }
        }

        // Очищаємо залишковий текст
        if (rateVal) rawText = rawText.replace(new RegExp('\\b' + rateVal + '\\b', 'g'), ' ');
        if (dateVal) rawText = rawText.replace(new RegExp(dateVal, 'g'), ' ');

        var qualityEl = card.querySelector('.online-prestige__quality');
        var qualityVal = qualityEl ? cleanBulletsAndSymbols(qualityEl.innerText) : '';

        var timeEl = card.querySelector('.online-prestige__time');
        var timeVal = timeEl ? cleanBulletsAndSymbols(timeEl.innerText) : '';

        var titleEl = card.querySelector('.online-prestige__title');
        var originalTitle = titleEl ? cleanBulletsAndSymbols(titleEl.innerText) : '';

        voiceVal = cleanBulletsAndSymbols(rawText);

        if (voiceVal && (voiceVal.length > 25 || /[.,!?]/.test(voiceVal))) {
            if (originalTitle && !isQualityString(originalTitle)) {
                voiceVal = originalTitle;
                originalTitle = '';
            } else {
                voiceVal = '';
            }
        } else if (isQualityString(originalTitle)) {
            if (!qualityVal) qualityVal = originalTitle;
            if (voiceVal && !isQualityString(voiceVal)) {
                originalTitle = voiceVal;
                voiceVal = '';
            } else {
                originalTitle = '';
            }
        }

        if (voiceVal === originalTitle) voiceVal = '';
        if (voiceVal && voiceVal.length > 32) {
            voiceVal = voiceVal.substring(0, 30) + '...';
        }

        // Приховуємо старий нативний блок body
        var oldBody = card.querySelector('.online-prestige__body');
        if (oldBody) oldBody.style.display = 'none';

        // 1. Верхній лівий кут (Зменшена дата виходу)
        var topLeft = card.querySelector('.ydesign-series-top-left');
        if (!topLeft) {
            topLeft = document.createElement('div');
            topLeft.className = 'ydesign-series-top-left';
            card.appendChild(topLeft);
        }
        topLeft.innerHTML = '';
        if (dateVal && getSet('ydesign_series_show_date')) {
            topLeft.innerHTML = '<span class="ydesign-series-pill ydesign-series-date">' + dateVal + '</span>';
        }

        // 2. Верхній правий кут (Рейтинг + Якість)
        var topRight = card.querySelector('.ydesign-series-top-right');
        if (!topRight) {
            topRight = document.createElement('div');
            topRight.className = 'ydesign-series-top-right';
            card.appendChild(topRight);
        }
        topRight.innerHTML = '';
        if (rateVal && getSet('ydesign_series_show_rate')) {
            topRight.innerHTML += '<span class="ydesign-series-pill ydesign-series-rate">★ ' + rateVal + '</span>';
        }
        if (qualityVal) {
            topRight.innerHTML += '<span class="ydesign-series-pill ydesign-series-quality">' + qualityVal + '</span>';
        }

        // 3. Нижній лівий кут (Озвучка окремим рядком + Назва серії)
        var bottomLeft = card.querySelector('.ydesign-series-bottom-left');
        if (!bottomLeft) {
            bottomLeft = document.createElement('div');
            bottomLeft.className = 'ydesign-series-bottom-left';
            card.appendChild(bottomLeft);
        }
        bottomLeft.innerHTML = '';
        if (voiceVal && getSet('ydesign_series_show_voice')) {
            var voiceWrap = document.createElement('div');
            voiceWrap.className = 'ydesign-series-voice-wrap';
            voiceWrap.innerHTML = '<span class="ydesign-series-pill ydesign-series-voice-badge">' + voiceVal + '</span>';
            bottomLeft.appendChild(voiceWrap);
        }
        if (originalTitle) {
            var cleanTitle = document.createElement('div');
            cleanTitle.className = 'online-prestige__title';
            cleanTitle.innerText = originalTitle;
            bottomLeft.appendChild(cleanTitle);
        }

        // 4. Нижній правий кут (Час/Тривалість)
        var bottomRight = card.querySelector('.ydesign-series-bottom-right');
        if (!bottomRight) {
            bottomRight = document.createElement('div');
            bottomRight.className = 'ydesign-series-bottom-right';
            card.appendChild(bottomRight);
        }
        bottomRight.innerHTML = '';
        if (timeVal && getSet('ydesign_series_show_time')) {
            bottomRight.innerHTML = '<span class="ydesign-series-pill ydesign-series-time">' + timeVal + '</span>';
        }

        // 5. Оновлення та прикріплення високої лінії таймкоду з відсотками
        updateCardTimeline(card);

        return false;
    }

    function initSeriesLogic() {
        try {
            var pageJustLoaded = false;
            if (window.Lampa && Lampa.Listener) {
                Lampa.Listener.follow('activity', function (e) {
                    if (!getSet('ydesign_series_redesign')) return;
                    if (e.type === 'start' || e.type === 'build') {
                        pageJustLoaded = true;
                    }
                });
            }

            var seriesObserver = new MutationObserver(function (mutations) {
                if (!getSet('ydesign_series_redesign')) return;

                var hasNewCards = false;
                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === 1) {
                            if (node.classList && node.classList.contains('online-prestige')) {
                                formatPrestigeCard(node);
                                hasNewCards = true;
                            }
                            if (node.querySelectorAll) {
                                var cards = node.querySelectorAll('.online-prestige');
                                if (cards.length > 0) {
                                    for (var k = 0; k < cards.length; k++) {
                                        formatPrestigeCard(cards[k]);
                                    }
                                    hasNewCards = true;
                                }
                            }
                        }
                    }
                }

                if (hasNewCards) {
                    var active = document.querySelector('.activity--active');
                    if (active) {
                        var currentFocus = active.querySelector('.focus');
                        if (!currentFocus || currentFocus.offsetParent === null || currentFocus.classList.contains('ydesign-empty-history')) {
                            var firstCard = active.querySelector('.online-prestige.online-prestige--full.selector');
                            if (firstCard && firstCard.offsetParent !== null && firstCard.style.display !== 'none') {
                                if (window.Lampa && window.Lampa.Controller) {
                                    window.Lampa.Controller.collectionFocus(firstCard, active);
                                }
                                if (currentFocus && currentFocus !== firstCard) currentFocus.classList.remove('focus');
                                firstCard.classList.add('focus');
                                if (firstCard.scrollIntoViewIfNeeded) {
                                    firstCard.scrollIntoViewIfNeeded(false);
                                } else if (firstCard.scrollIntoView) {
                                    firstCard.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                }
                                pageJustLoaded = false;
                            }
                        }
                    }
                }
            });

            seriesObserver.observe(document.body, { childList: true, subtree: true });

            // Постійне оновлення % прогресу без блокування навігації
            setInterval(function () {
                if (!getSet('ydesign_series_redesign')) return;

                var activeCards = document.querySelectorAll('.online-prestige--full');
                for (var cIdx = 0; cIdx < activeCards.length; cIdx++) {
                    updateCardTimeline(activeCards[cIdx]);
                }

                // Фокусуємо перший елемент при завантаженні сторінки, якщо фокус взагалі відсутній
                if (pageJustLoaded) {
                    var active = document.querySelector('.activity--active');
                    if (active) {
                        var currentFocus = active.querySelector('.focus');
                        var isBrokenFocus = !currentFocus || currentFocus.offsetParent === null || currentFocus.style.display === 'none' || currentFocus.classList.contains('ydesign-empty-history');
                        
                        if (isBrokenFocus) {
                            var firstValid = active.querySelector('.online-prestige.online-prestige--full.selector') || active.querySelector('.selector');
                            if (firstValid && firstValid.offsetParent !== null && firstValid.style.display !== 'none') {
                                if (window.Lampa && window.Lampa.Controller) {
                                    window.Lampa.Controller.collectionFocus(firstValid, active);
                                }
                                if (currentFocus && currentFocus !== firstValid) currentFocus.classList.remove('focus');
                                firstValid.classList.add('focus');
                                if (firstValid.scrollIntoViewIfNeeded) {
                                    firstValid.scrollIntoViewIfNeeded(false);
                                } else if (firstValid.scrollIntoView) {
                                    firstValid.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                }
                                pageJustLoaded = false;
                            }
                        } else if (currentFocus && currentFocus.classList.contains('online-prestige--full')) {
                            pageJustLoaded = false;
                        }
                    }
                }
            }, 250);
        } catch (e) {}
    }

    // =========================================================================
    // 14. ГОЛОВНИЙ СТАРТ ТА ПЕРЕВІРКА ДЖЕРЕЛА
    // =========================================================================
    function init() {
        try {
            createSettings();

            var currentSource = 'tmdb';
            if (window.Lampa && Lampa.Storage) {
                currentSource = Lampa.Storage.get('source') || 'tmdb';
                if (currentSource !== 'tmdb' && currentSource !== 'cub') {
                    setTimeout(function () {
                        if (window.Lampa && Lampa.Noty) {
                            Lampa.Noty.show('Для роботи YDesign потрібно обрати джерелом TMDB або CUB (Поточне: ' + currentSource + ')');
                        }
                    }, 2500);
                }
            }

            injectCSS();
            applyDynamicCSS();

            if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
                Lampa.Storage.listener.follow('change', function (e) {
                    if (e && e.name && e.name.indexOf('ydesign_') === 0) {
                        applyDynamicCSS();
                    }
                });
            }

            overrideCards();
            initSeriesLogic();

            if (window.appready && Lampa.Activity && Lampa.Activity.active()) {
                setTimeout(function () {
                    var act = Lampa.Activity.active();
                    if (act && act.activity && act.activity.render) {
                        act.activity.render().find('.card').trigger('visible');
                    }
                }, 100);
            }

            console.log('Lampa Plugin: YDesign successfully loaded.');
        } catch (e) {
            console.error('YDesign init error:', e);
        }
    }

    if (window.appready) {
        init();
    } else {
        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') init();
            });
        } else {
            setTimeout(init, 500);
        }
    }

})();
