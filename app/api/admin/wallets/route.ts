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
    const wallets = await Wallet.find().sort({ coinSymbol: 1 });
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

    // Parse fields - support both naming conventions
    let { coinSymbol, address, qrCodeUrl, qrCodeImageUrl } = body;

    // Use whichever field is provided
    if (!qrCodeUrl && qrCodeImageUrl) {
      qrCodeUrl = qrCodeImageUrl;
    }

    console.log('[Admin Wallets] Parsed values:', {
      coinSymbol,
      address,
      qrCodeUrl
    });

    // Validation
    if (!coinSymbol || !address) {
      console.log('[Admin Wallets] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: coinSymbol and walletAddress' },
        { status: 400 }
      );
    }

    // Validate coin symbol (uppercase, 2-10 chars)
    const symbol = coinSymbol.toUpperCase().trim();
    if (!/^[A-Z]{2,10}$/.test(symbol)) {
      console.log('[Admin Wallets] Invalid coin symbol:', coinSymbol);
      return NextResponse.json(
        { error: 'Invalid coin symbol. Must be 2-10 uppercase letters.' },
        { status: 400 }
      );
    }

    // Validate address (basic length check)
    const addressStr = String(address).trim();
    if (addressStr.length < 5) {
      console.log('[Admin Wallets] Address too short:', addressStr.length);
      return NextResponse.json(
        { error: 'Wallet address too short' },
        { status: 400 }
      );
    }

    if (addressStr.length > 200) {
      console.log('[Admin Wallets] Address too long:', addressStr.length);
      return NextResponse.json(
        { error: 'Wallet address too long' },
        { status: 400 }
      );
    }

    // Save wallet (upsert)
    console.log('[Admin Wallets] Upserting wallet for:', symbol);
    const wallet = await Wallet.findOneAndUpdate(
      { coinSymbol: symbol },
      {
        coinSymbol: symbol,
        address: addressStr,
        qrCodeUrl: qrCodeUrl || ''
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