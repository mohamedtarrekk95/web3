import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { getAdminFromCookies } from '@/lib/adminAuth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[Admin Order Update] PATCH request');

  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      console.log('[Admin Order Update] Not authenticated as admin');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    console.log('[Admin Order Update] Admin authenticated:', admin.email);

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, adminNote } = body;

    console.log('[Admin Order Update] Order:', id, 'New status:', status, 'Note:', adminNote);

    // Validate status - support old values (completed/cancelled) and new (accepted/rejected)
    const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, accepted, rejected, completed, or cancelled' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = { status };
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }

    console.log('[Admin Order Update] Update data:', updateData);

    const order = await Order.findOneAndUpdate(
      { orderId: id },
      updateData,
      { new: true }
    );

    if (!order) {
      console.log('[Admin Order Update] Order not found:', id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('[Admin Order Update] Order updated:', order.orderId, 'Status:', order.status, 'Note:', order.adminNote);
    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        fromCoin: order.fromCoin,
        toCoin: order.toCoin,
        amountSent: order.amountSent,
        amountReceived: order.amountReceived,
        walletAddress: order.walletAddress,
        receivingAddress: order.receivingAddress || '',
        status: order.status,
        adminNote: order.adminNote || '',
        createdAt: order.createdAt,
      }
    });
  } catch (error: any) {
    console.error('[Admin Order Update] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}