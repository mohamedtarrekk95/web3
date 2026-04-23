import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getAdminFromCookies } from '@/lib/adminAuth';

export async function GET() {
  console.log('[Admin Orders] GET request');

  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      console.log('[Admin Orders] Not authenticated as admin');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    console.log('[Admin Orders] Admin authenticated:', admin.email);

    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log('[Admin Orders] Found', orders.length, 'orders');

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        orderId: o.orderId,
        fromCoin: o.fromCoin,
        toCoin: o.toCoin,
        amountSent: o.amountSent,
        amountReceived: o.amountReceived,
        walletAddress: o.walletAddress,
        receivingAddress: o.receivingAddress || '',
        status: o.status,
        adminNote: o.adminNote || '',
        createdAt: o.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Admin Orders] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch orders' }, { status: 500 });
  }
}