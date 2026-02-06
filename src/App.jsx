import { useEffect, useMemo, useRef, useState } from 'react';

const CLOCK_CITIES = [
  { id: 'london', name: 'London', timezone: 'Europe/London', flagUrl: '/flags/gb.png' },
  { id: 'newyork', name: 'New York', timezone: 'America/New_York', flagUrl: '/flags/us.png' },
  { id: 'bangalore', name: 'Bangalore', timezone: 'Asia/Kolkata', flagUrl: '/flags/in.png' },
  { id: 'sydney', name: 'Sydney', timezone: 'Australia/Sydney', flagUrl: '/flags/au.png' },
  { id: 'dubai', name: 'Dubai', timezone: 'Asia/Dubai', flagUrl: '/flags/ae.png' },
  { id: 'lisbon', name: 'Lisbon', timezone: 'Europe/Lisbon', flagUrl: '/flags/pt.png' }
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

export default function App() {
  const [now, setNow] = useState(new Date());
  const [localCity, setLocalCity] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('loading');
  const [news, setNews] = useState([]);
  const [newsStatus, setNewsStatus] = useState('loading');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const newsFetchedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
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

  useEffect(() => {
    if (!localCity?.lat || !localCity?.lon) {
      setWeatherStatus('needs-city');
      return;
    }

    const cache = safeParse(WEATHER_CACHE_KEY);
    const fifteenMinutes = 15 * 60 * 1000;
    if (cache?.data && Date.now() - cache.updatedAt < fifteenMinutes) {
      setWeather(cache.data);
      setWeatherStatus('cached');
    }

    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${localCity.lat}&longitude=${localCity.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(localCity.timezone)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('weather fetch failed');
        const data = await resp.json();
        const payload = {
          city: localCity.name,
          updatedAt: Date.now(),
          temperature: data?.current_weather?.temperature,
          weathercode: data?.current_weather?.weathercode,
          hi: data?.daily?.temperature_2m_max?.[0],
          lo: data?.daily?.temperature_2m_min?.[0]
        };
        setWeather(payload);
        setWeatherStatus('live');
        saveCache(WEATHER_CACHE_KEY, { updatedAt: Date.now(), data: payload });
      } catch {
        if (!cache?.data) setWeatherStatus('error');
      }
    })();
  }, [localCity]);

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
          const resp = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page');
          if (!resp.ok) throw new Error('hn failed');
          const data = await resp.json();
          const hits = data?.hits || [];
          return hits.slice(0, 5).map((item, idx) => ({
            id: item.objectID || `${idx}-${item.title}`,
            title: item.title,
            source: 'Hacker News',
            time: item.created_at ? new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
          }));
        },
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

  const weatherUpdated = useMemo(() => {
    if (!weather?.updatedAt) return '—';
    return new Date(weather.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }, [weather]);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white p-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold">Fire TV Dashboard</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-lg text-slate-300">World clocks • Weather • News</p>
            {isOffline && (
              <span className="text-sm px-3 py-1 rounded-full border border-rose-400/60 text-rose-300 bg-rose-500/10">
                Offline mode
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 w-80">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Local Weather</div>
          <div className="mt-2 text-lg text-slate-300">{localCity?.name || 'Detecting…'}</div>
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
          </div>
        </div>
      </header>

      <main className="mt-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">World Clocks</div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            {CLOCK_CITIES.map(city => (
              <button
                key={city.id}
                className="rounded-2xl border border-slate-700 bg-slate-950/60 p-7 text-left focus:outline-none focus:ring-2 focus:ring-sky-400"
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

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Top Headlines</div>
          {newsStatus === 'error' && (
            <div className="mt-3 text-sm text-rose-300">News unavailable. Showing cached items if available.</div>
          )}
          {newsStatus === 'cached' && (
            <div className="mt-3 text-sm text-sky-300">Showing cached headlines.</div>
          )}
          <ul className="mt-5 space-y-4 text-base">
            {(news.length ? news : [{ id: 'empty', title: 'Loading headlines…', source: 'News', time: '' }]).map(item => (
              <li key={item.id}>
                <button className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-4 focus:outline-none focus:ring-2 focus:ring-sky-400">
                  <div className="text-slate-200 text-lg">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.source}{item.time ? ` · ${item.time}` : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
