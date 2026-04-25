import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getCurrentUser } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.003; // 0.3% platform fee

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromCoin, toCoin, fromAmount, toAmount, receivingAddress, aggregator } = body;

    if (!fromCoin || !toCoin || !fromAmount || !toAmount || !receivingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate platform fee
    const amountReceived = parseFloat(toAmount);
    const platformFee = amountReceived * PLATFORM_FEE_PERCENT;
    const netAmount = amountReceived - platformFee;

    // Generate order
    const orderId = uuidv4();

    await connectDB();
    const order = new Order({
      orderId,
      userId: new mongoose.Types.ObjectId(user.userId),
      type: 'exchange',
      fromCoin: fromCoin.toUpperCase(),
      toCoin: toCoin.toUpperCase(),
      amountSent: parseFloat(fromAmount),
      amountReceived: netAmount,
      walletAddress: 'AGGREGATOR_SWAP',
      receivingAddress: receivingAddress,
      status: 'pending',
      adminNote: `Swap via ${aggregator || 'unknown'} | Platform fee: ${platformFee.toFixed(8)} ${toCoin.toUpperCase()}`,
      platformFee: platformFee,
      platformFeeCurrency: toCoin.toUpperCase(),
      aggregator,
    });

    await order.save();

    return NextResponse.json({
      success: true,
      orderId,
      fromCoin: fromCoin.toUpperCase(),
      toCoin: toCoin.toUpperCase(),
      fromAmount: parseFloat(fromAmount),
      toAmount: netAmount,
      platformFee,
      platformFeePercent: PLATFORM_FEE_PERCENT * 100,
      status: 'pending',
      aggregator: aggregator || 'unknown',
      message: 'Swap order created. Awaiting blockchain confirmation.',
    });
  } catch (error) {
    console.error('Swap execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute swap' },
      { status: 500 }
    );
  }
}
