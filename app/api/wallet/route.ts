import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wallet from '@/lib/models/Wallet';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol');

  console.log('[Wallet API] GET request for symbol:', symbol);

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const wallet = await Wallet.findOne({ symbol: symbol.toUpperCase() });

    if (!wallet) {
      console.log('[Wallet API] No wallet found for:', symbol);
      return NextResponse.json({
        success: true,
        wallet: null,
        message: 'No wallet configured for this symbol'
      });
    }

    console.log('[Wallet API] Found wallet:', JSON.stringify(wallet));
    return NextResponse.json({
      success: true,
      wallet: {
        symbol: wallet.symbol,
        address: wallet.address,
        qrCodeImageUrl: wallet.qrCodeImageUrl || ''
      }
    });
  } catch (error: any) {
    console.error('[Wallet API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet: ' + error.message },
      { status: 500 }
    );
  }
}