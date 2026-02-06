import { useEffect, useMemo, useRef, useState } from 'react';

function NovaFace({ mood = 'smile' }) {
  const glow = mood === 'alert'
    ? 'shadow-[0_0_28px_rgba(248,113,113,0.7)]'
    : mood === 'focused'
      ? 'shadow-[0_0_28px_rgba(99,102,241,0.7)]'
      : 'shadow-[0_0_32px_rgba(34,211,238,0.7)]';

  const mouthMap = {
    smile: new Set([21, 22, 23]),
    focused: new Set([21, 22, 23]),
    alert: new Set([20, 24]),
    neutral: new Set([22])
  };

  const mouth = mouthMap[mood] || mouthMap.neutral;

  return (
    <div className="flex items-center gap-3 nova-face">
      <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl border border-sky-400/50 bg-slate-950/80 ${glow} overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.45),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(129,140,248,0.35),transparent_50%)]" />
        <div className="nova-face-grid relative grid grid-cols-5 grid-rows-5 gap-1 p-2 h-full">
          {Array.from({ length: 25 }).map((_, idx) => {
            const isEye = idx === 6 || idx === 8;
            const isEyeGlow = idx === 16 || idx === 18;
            const isCore = idx === 12;
            const isMouth = mouth.has(idx);
            const mouthColor = mood === 'alert' ? 'bg-rose-300' : mood === 'focused' ? 'bg-indigo-300' : 'bg-emerald-300';
            const base = 'bg-slate-800/60';
            const color = isEye
              ? 'bg-sky-300'
              : isEyeGlow
                ? 'bg-sky-400'
                : isCore
                  ? 'bg-slate-100'
                  : isMouth
                    ? mouthColor
                    : base;
            return <span key={idx} className={`rounded-sm ${color}`} />;
          })}
        </div>
      </div>
      <div className="text-xs text-slate-300">
        <div className="uppercase tracking-[0.3em] text-slate-500">Nova</div>
        <div className="text-sky-300 font-semibold">{mood}</div>
      </div>
    </div>
  );
}

const CLOCK_CITIES = [
  { id: 'london', name: 'London', timezone: 'Europe/London', lat: 51.5074, lon: -0.1278, flagUrl: '/flags/gb.png' },
  { id: 'newyork', name: 'New York', timezone: 'America/New_York', lat: 40.7128, lon: -74.006, flagUrl: '/flags/us.png' },
  { id: 'bangalore', name: 'Bangalore', timezone: 'Asia/Kolkata', lat: 12.9716, lon: 77.5946, flagUrl: '/flags/in.png' },
  { id: 'saopaulo', name: 'São Paulo', timezone: 'America/Sao_Paulo', lat: -23.5558, lon: -46.6396, flagUrl: '/flags/br.png' },
  { id: 'dubai', name: 'Dubai', timezone: 'Asia/Dubai', lat: 25.2048, lon: 55.2708, flagUrl: '/flags/ae.png' },
  { id: 'lisbon', name: 'Lisbon', timezone: 'Europe/Lisbon', lat: 38.7223, lon: -9.1393, flagUrl: '/flags/pt.png' }
];

const TIMEZONE_CITY_MAP = {
  'Europe/London': { name: 'London', lat: 51.5074, lon: -0.1278 },
  'Europe/Lisbon': { name: 'Lisbon', lat: 38.7223, lon: -9.1393 },
  'Europe/Paris': { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  'America/New_York': { name: 'New York', lat: 40.7128, lon: -74.006 },
  'America/Los_Angeles': { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'Asia/Tokyo': { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  'Australia/Sydney': { name: 'Sydney', lat: -33.8688, lon: 151.2093 }
};

const WEATHER_CACHE_KEY = 'ftd-weather-cache-v1';
const NEWS_CACHE_KEY = 'ftd-news-cache-v1';
const WEATHER_ROTATE_MS = 30_000;

function formatTime(date, timezone) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  }).format(date);
}

function formatDate(date, timezone) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: timezone
  }).format(date);
}

function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(key, payload) {
  localStorage.setItem(key, JSON.stringify(payload));
}

function weatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
  if ([71, 73, 75, 77].includes(code)) return '❄️';
  if ([80, 81, 82].includes(code)) return '🌦️';
  if ([85, 86].includes(code)) return '🌨️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

function weatherMood(code) {
  if (code === 0) return 'smile';
  if ([1, 2, 3].includes(code)) return 'neutral';
  if ([45, 48].includes(code)) return 'focused';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'focused';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'alert';
  if ([95, 96, 99].includes(code)) return 'alert';
  return 'neutral';
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [localCity, setLocalCity] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('loading');
  const [news, setNews] = useState([]);
  const [newsStatus, setNewsStatus] = useState('loading');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [newsIndex, setNewsIndex] = useState(0);
  const [activeWeatherId, setActiveWeatherId] = useState('local');
  const [weatherCountdown, setWeatherCountdown] = useState(WEATHER_ROTATE_MS / 1000);
  const newsFetchedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const baseWidth = 1920;
    const baseHeight = 1080;
    const applyScale = () => {
      const w = window.innerWidth || baseWidth;
      const h = window.innerHeight || baseHeight;
      const scale = Math.min(w / baseWidth, h / baseHeight);
      document.documentElement.style.setProperty('--ui-scale', `${scale.toFixed(3)}`);
    };
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fallback = TIMEZONE_CITY_MAP[tz] || { name: 'Set your city', lat: null, lon: null };
    setLocalCity({ timezone: tz, ...fallback });

    (async () => {
      try {
        const resp = await fetch('https://ipapi.co/json/');
        if (!resp.ok) throw new Error('ip lookup failed');
        const data = await resp.json();
        if (data?.city && data?.latitude && data?.longitude) {
          setLocalCity({
            timezone: tz,
            name: data.city,
            lat: Number(data.latitude),
            lon: Number(data.longitude)
          });
        }
      } catch {
        // keep fallback
      }
    })();
  }, []);

  const weatherCities = useMemo(() => {
    const list = [];
    if (localCity?.lat && localCity?.lon) {
      list.push({
        id: 'local',
        name: localCity.name || 'Local',
        lat: localCity.lat,
        lon: localCity.lon,
        timezone: localCity.timezone
      });
    }
    list.push(...CLOCK_CITIES.map(city => ({
      id: city.id,
      name: city.name,
      lat: city.lat,
      lon: city.lon,
      timezone: city.timezone
    })));
    return list;
  }, [localCity]);

  useEffect(() => {
    if (!weatherCities.length) return;
    setActiveWeatherId('local');
    setWeatherCountdown(WEATHER_ROTATE_MS / 1000);
    let idx = 0;
    const rotateId = setInterval(() => {
      idx = (idx + 1) % weatherCities.length;
      setActiveWeatherId(weatherCities[idx].id);
      setWeatherCountdown(WEATHER_ROTATE_MS / 1000);
    }, WEATHER_ROTATE_MS);

    const tickId = setInterval(() => {
      setWeatherCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(rotateId);
      clearInterval(tickId);
    };
  }, [weatherCities]);

  useEffect(() => {
    const active = weatherCities.find(city => city.id === activeWeatherId) || weatherCities[0];
    if (!active?.lat || !active?.lon) {
      setWeatherStatus('needs-city');
      return;
    }

    const cacheKey = `${WEATHER_CACHE_KEY}-${active.id}`;
    const cache = safeParse(cacheKey);
    const fifteenMinutes = 15 * 60 * 1000;
    if (cache?.data && Date.now() - cache.updatedAt < fifteenMinutes) {
      setWeather(cache.data);
      setWeatherStatus('cached');
    }

    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${active.lat}&longitude=${active.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(active.timezone)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('weather fetch failed');
        const data = await resp.json();
        const payload = {
          city: active.name,
          updatedAt: Date.now(),
          temperature: data?.current_weather?.temperature,
          weathercode: data?.current_weather?.weathercode,
          hi: data?.daily?.temperature_2m_max?.[0],
          lo: data?.daily?.temperature_2m_min?.[0]
        };
        setWeather(payload);
        setWeatherStatus('live');
        saveCache(cacheKey, { updatedAt: Date.now(), data: payload });
      } catch {
        if (!cache?.data) setWeatherStatus('error');
      }
    })();
  }, [activeWeatherId, weatherCities]);

  useEffect(() => {
    if (newsFetchedRef.current) return;
    newsFetchedRef.current = true;

    const cache = safeParse(NEWS_CACHE_KEY);
    const refreshMs = 60 * 60 * 1000;
    if (cache?.items && Date.now() - cache.updatedAt < refreshMs) {
      setNews(cache.items);
      setNewsStatus('cached');
    }

    (async () => {
      const sources = [
        async () => {
          const resp = await fetch('https://api.gdeltproject.org/api/v2/doc/doc?format=json&maxrecords=5&mode=ArtList');
          if (!resp.ok) throw new Error('gdelt failed');
          const data = await resp.json();
          const articles = data?.articles || [];
          return articles.slice(0, 5).map((item, idx) => ({
            id: item.seendate || `${idx}-${item.title}`,
            title: item.title,
            source: item.sourcecountry || item.source || 'GDELT',
            time: item.seendate ? new Date(item.seendate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
          }));
        }
      ];

      for (const fetcher of sources) {
        try {
          const items = await fetcher();
          if (items?.length) {
            setNews(items);
            setNewsStatus('live');
            saveCache(NEWS_CACHE_KEY, { updatedAt: Date.now(), items });
            return;
          }
        } catch {
          // try next
        }
      }

      if (!cache?.items) setNewsStatus('error');
    })();
  }, []);

  useEffect(() => {
    if (!news.length) return;
    const id = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % news.length);
    }, 8000);
    return () => clearInterval(id);
  }, [news]);


  const weatherUpdated = useMemo(() => {
    if (!weather?.updatedAt) return '—';
    return new Date(weather.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }, [weather]);

  const novaMood = useMemo(() => weatherMood(weather?.weathercode), [weather]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white p-4 relative flex flex-col gap-3">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(99,102,241,0.2),transparent_45%)]" />
      <header className="relative flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Nova Work Dashboard</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-lg text-slate-300">World clocks • Weather • News</p>
            {isOffline && (
              <span className="text-sm px-3 py-1 rounded-full border border-rose-400/60 text-rose-300 bg-rose-500/10">
                Offline mode
              </span>
            )}
          </div>
          <div className="mt-3">
            <NovaFace mood={novaMood} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 backdrop-blur p-5 w-72">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Local Weather</div>
          <div className="mt-2 text-lg text-slate-300">{weather?.city || localCity?.name || 'Detecting…'}</div>
          <div className="mt-2 flex items-center gap-3 text-4xl font-semibold">
            <span className="text-4xl">{weatherIcon(weather?.weathercode)}</span>
            <span>{weather?.temperature ?? '--'}°</span>
          </div>
          <div className="text-sm text-slate-400">
            Hi {weather?.hi ?? '--'}° / Lo {weather?.lo ?? '--'}°
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {weatherStatus === 'needs-city' && 'Set your city'}
            {weatherStatus !== 'needs-city' && `Last updated ${weatherUpdated}`}
            {weatherStatus === 'cached' && ' · Cached'}
            {weatherStatus !== 'needs-city' && ` · Next in ${weatherCountdown}s`}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 h-full overflow-hidden">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">🕒 World Clocks</div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            {CLOCK_CITIES.map(city => (
              <button
                key={city.id}
                className={`rounded-2xl border p-7 text-left focus:outline-none focus:ring-2 focus:ring-sky-400 ${activeWeatherId === city.id ? 'border-sky-400 bg-slate-900/70 shadow-[0_0_12px_rgba(56,189,248,0.35)]' : 'border-slate-700 bg-slate-950/60'}`}
              >
                <div className="text-lg text-slate-300 flex items-center gap-2">
                  <img
                    src={city.flagUrl}
                    alt=""
                    className="w-6 h-4 rounded-sm border border-slate-700"
                    loading="lazy"
                  />
                  <span>{city.name}</span>
                </div>
                <div className="text-5xl font-semibold tracking-wide">{formatTime(now, city.timezone)}</div>
                <div className="text-base text-slate-500">{formatDate(now, city.timezone)}</div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 h-[180px] flex flex-col">
        <div className="flex items-center gap-4">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">📰 Top Headlines</div>
          {newsStatus === 'error' && (
            <div className="text-sm text-rose-300">News unavailable. Cached if available.</div>
          )}
          {newsStatus === 'cached' && (
            <div className="text-sm text-sky-300">Cached</div>
          )}
        </div>
        <div className="mt-3 flex-1">
          {(() => {
            const items = news.length ? news : [{ id: 'empty', title: 'Loading headlines…', source: 'News', time: '' }];
            const index = newsIndex % items.length;
            const item = items[index];
            return (
              <button className="w-full h-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-4 focus:outline-none focus:ring-2 focus:ring-sky-400">
                <div className="text-slate-400 text-sm mb-2">Headline {index + 1} of {items.length}</div>
                <div className="text-slate-200 text-xl leading-snug line-clamp-2">{item.title}</div>
                <div className="text-sm text-slate-500 mt-2">{item.source}{item.time ? ` · ${item.time}` : ''}</div>
              </button>
            );
          })()}
        </div>
      </section>

      <div className="absolute left-4 bottom-3 text-sm text-slate-500">
        v{import.meta.env.VITE_APP_VERSION}
      </div>
    </div>
  );
}
