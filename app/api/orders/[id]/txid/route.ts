import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { txid } = body;

    if (!txid || txid.trim().length === 0) {
      return NextResponse.json({ error: 'TXID is required' }, { status: 400 });
    }

    const order = await Order.findOne({ orderId: id });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId?.toString() !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.type !== 'p2p_sell') {
      return NextResponse.json({ error: 'TXID only applicable for P2P sell orders' }, { status: 400 });
    }

    order.txid = txid.trim();
    order.status = 'pending';
    await order.save();

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        type: order.type,
        status: order.status,
        txid: order.txid,
      },
    });
  } catch (error) {
    console.error('TXID update error:', error);
    return NextResponse.json({ error: 'Failed to update TXID' }, { status: 500 });
  }
}