import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FloatingP2PButton from "@/components/FloatingP2PButton";

export const metadata: Metadata = {
  title: "CryptoExchange - Fast & Secure Crypto Swaps",
  description: "Exchange cryptocurrencies instantly with real-time rates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased bg-gray-900">
        <Navbar />
        {children}
        <FloatingP2PButton />
      </body>
    </html>
  );
}
