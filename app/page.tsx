import ExchangeWidget from "@/components/ExchangeWidget";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      <header className="w-full max-w-6xl mx-auto py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">CryptoExchange</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-cyan-400 font-medium">Exchange</a>
          <a href="/admin" className="text-gray-400 hover:text-white transition-colors">Admin</a>
        </nav>
      </header>

      <div className="relative z-10 w-full flex-1 flex items-center justify-center py-12">
        <ExchangeWidget />
      </div>

      <footer className="w-full max-w-6xl mx-auto py-6 text-center text-gray-500 text-sm relative z-10">
        <p>Secure crypto exchange powered by Binance API</p>
      </footer>
    </main>
  );
}
