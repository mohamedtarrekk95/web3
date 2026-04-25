import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress, network } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    // Basic validation - Ethereum addresses are 42 chars starting with 0x
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    await connectDB();

    // Check if wallet already exists for this user
    const existingUser = await User.findById(user.userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if this wallet is already connected
    const walletExists = existingUser.wallets?.some(
      (w: { address: string }) => w.address.toLowerCase() === walletAddress.toLowerCase()
    );

    if (walletExists) {
      return NextResponse.json({
        success: true,
        message: 'Wallet already connected',
        walletAddress,
        network: network || 'ETH',
      });
    }

    // Add new wallet to user's wallets array
    const newWallet = {
      address: walletAddress.toLowerCase(),
      network: network || 'ETH',
      connectedAt: new Date(),
    };

    await User.findByIdAndUpdate(user.userId, {
      $push: { wallets: newWallet },
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet connected successfully',
      walletAddress: walletAddress.toLowerCase(),
      network: network || 'ETH',
    });
  } catch (error) {
    console.error('Wallet connect error:', error);
    return NextResponse.json({ error: 'Failed to connect wallet' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    await connectDB();

    await User.findByIdAndUpdate(user.userId, {
      $pull: { wallets: { address: walletAddress.toLowerCase() } },
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet disconnected',
    });
  } catch (error) {
    console.error('Wallet disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect wallet' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userDoc = await User.findById(user.userId);
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const wallets = userDoc.wallets || [];

    return NextResponse.json({
      success: true,
      wallets: wallets.map((w: { address: string; network: string; connectedAt: Date }) => ({
        address: w.address,
        network: w.network,
        connectedAt: w.connectedAt,
      })),
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
  }
}
