import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getCurrentUser } from '@/lib/auth';

const PLATFORM_FEE_PERCENT = 0.003; // 0.3% platform fee
const PLATFORM_WALLET = '0xe88E1F6D128f09584cF9E9147512DA6f116b365A';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromCoin, toCoin, fromAmount, toAmount, receivingAddress, aggregator, platformFeeWallet } = body;

    if (!fromCoin || !toCoin || !fromAmount || !toAmount || !receivingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      walletAddress: receivingAddress, // User's connected wallet
      receivingAddress: receivingAddress,
      status: 'pending',
      adminNote: `Swap via ${aggregator || 'unknown'} | Wallet: ${receivingAddress.slice(0, 10)}... | Platform fee: ${platformFee.toFixed(8)} ${toCoin.toUpperCase()} to ${PLATFORM_WALLET}`,
      platformFee: platformFee,
      platformFeeCurrency: toCoin.toUpperCase(),
      platformFeeWallet: platformFeeWallet || PLATFORM_WALLET,
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
      platformFeeWallet: platformFeeWallet || PLATFORM_WALLET,
      status: 'pending',
      aggregator: aggregator || 'unknown',
      message: 'Swap order created. Platform fee will be deducted automatically.',
    });
  } catch (error) {
    console.error('Swap execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute swap' },
      { status: 500 }
    );
  }
}
