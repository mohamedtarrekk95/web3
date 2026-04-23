'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingP2PButton() {
  const pathname = usePathname();

  // Don't show on P2P pages themselves
  if (pathname?.startsWith('/p2p') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 md:bottom-8 md:right-8">
      <Link
        href="/p2p"
        className="group flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full
                   bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30
                   hover:from-green-400 hover:to-emerald-400
                   transform hover:scale-110 active:scale-95
                   transition-all duration-200 ease-out"
        aria-label="Go to P2P Exchange"
      >
        <span className="text-white font-bold text-sm md:text-base">P2P</span>
        {/* Tooltip */}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg
                        opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
                        shadow-lg border border-gray-700">
          P2P Exchange
        </span>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-green-400" />
      </Link>
    </div>
  );
}