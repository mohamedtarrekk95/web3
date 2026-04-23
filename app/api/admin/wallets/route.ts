import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wallet from '@/lib/models/Wallet';
import { getAdminFromCookies } from '@/lib/adminAuth';

export async function GET() {
  console.log('[Admin Wallets] GET request');

  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      console.log('[Admin Wallets] Not authenticated as admin');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    console.log('[Admin Wallets] Admin authenticated:', admin.email);

    await connectDB();
    const wallets = await Wallet.find().sort({ symbol: 1 });
    console.log('[Admin Wallets] Found', wallets.length, 'wallets');

    return NextResponse.json({
      success: true,
      wallets: wallets
    });
  } catch (error: any) {
    console.error('[Admin Wallets] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch wallets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('[Admin Wallets] POST request');

  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      console.log('[Admin Wallets] Not authenticated as admin');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    console.log('[Admin Wallets] Admin authenticated:', admin.email);

    await connectDB();
    const body = await request.json();
    console.log('[Admin Wallets] Request body:', JSON.stringify(body));

    // Support multiple field names from frontend
    let { symbol, coinSymbol, address, qrCodeImageUrl, qrCodeUrl } = body;

    // Use whichever field is provided
    const finalSymbol = symbol || coinSymbol;
    const finalAddress = address || '';
    const finalQrCodeUrl = qrCodeImageUrl || qrCodeUrl || '';

    console.log('[Admin Wallets] Parsed values:', {
      symbol: finalSymbol,
      address: finalAddress,
      qrCodeImageUrl: finalQrCodeUrl
    });

    // Only require symbol and address (free text, no format validation)
    if (!finalSymbol || !finalAddress) {
      console.log('[Admin Wallets] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: symbol and address' },
        { status: 400 }
      );
    }

    // Normalize symbol to uppercase
    const normalizedSymbol = finalSymbol.toUpperCase().trim();
    if (!/^[A-Z]{2,10}$/.test(normalizedSymbol)) {
      console.log('[Admin Wallets] Invalid symbol:', finalSymbol);
      return NextResponse.json(
        { error: 'Invalid coin symbol format' },
        { status: 400 }
      );
    }

    // NO validation on address - free text allowed
    // Just ensure it's a non-empty string
    const addressStr = String(finalAddress).trim();

    console.log('[Admin Wallets] Saving wallet for:', normalizedSymbol);

    // Upsert wallet
    const wallet = await Wallet.findOneAndUpdate(
      { symbol: normalizedSymbol },
      {
        symbol: normalizedSymbol,
        address: addressStr,
        qrCodeImageUrl: finalQrCodeUrl
      },
      { upsert: true, new: true }
    );

    console.log('[Admin Wallets] Wallet saved successfully:', JSON.stringify(wallet));
    return NextResponse.json({
      success: true,
      wallet: wallet
    });
  } catch (error: any) {
    console.error('[Admin Wallets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save wallet: ' + error.message },
      { status: 500 }
    );
  }
}