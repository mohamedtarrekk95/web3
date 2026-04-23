'use client';

import { useEffect, useState } from 'react';
import ExchangeWidget from "@/components/ExchangeWidget";

interface Settings {
  announcementMessage?: string;
  announcementColor?: string;
  announcementEnabled?: string;
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);
  }, []);

  const showBanner = settings.announcementEnabled === 'true' &&
                     settings.announcementMessage &&
                     !dismissed;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      {/* Announcement Banner */}
      {showBanner && (
        <div
          className="w-full max-w-6xl mx-auto mb-4 p-4 rounded-xl text-center relative"
          style={{ backgroundColor: settings.announcementColor || '#374151' }}
        >
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 text-white/70 hover:text-white text-lg px-2 py-1"
            aria-label="Dismiss"
          >
            ×
          </button>
          <p className="text-white text-sm md:text-base pr-6" style={{ whiteSpace: 'pre-wrap' }}>
            {settings.announcementMessage}
          </p>
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      <div className="relative z-10 w-full flex-1 flex items-center justify-center py-12">
        <ExchangeWidget />
      </div>

      <footer className="w-full max-w-6xl mx-auto py-6 text-center text-gray-500 text-sm relative z-10">
        <p>Secure crypto exchange powered by Binance API</p>
      </footer>
    </main>
  );
}