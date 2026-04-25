import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get swap history (orders with aggregator set and type 'exchange')
    const swaps = await Order.find({
      userId: new mongoose.Types.ObjectId(user.userId),
      type: 'exchange',
      aggregator: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      swaps: swaps.map((swap) => ({
        orderId: swap.orderId,
        fromCoin: swap.fromCoin,
        toCoin: swap.toCoin,
        fromAmount: swap.amountSent,
        toAmount: swap.amountReceived,
        platformFee: swap.platformFee || 0,
        platformFeeCurrency: swap.platformFeeCurrency || swap.toCoin,
        aggregator: swap.aggregator,
        status: swap.status,
        txid: swap.txid,
        createdAt: swap.createdAt,
      })),
    });
  } catch (error) {
    console.error('Swap history error:', error);
    return NextResponse.json({ error: 'Failed to fetch swap history' }, { status: 500 });
  }
}
