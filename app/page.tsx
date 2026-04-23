import ExchangeWidget from "@/components/ExchangeWidget";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
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