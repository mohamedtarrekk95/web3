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
    const { status } = body;

    console.log('[Admin Order Update] Order:', id, 'New status:', status);

    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be: pending, completed, or cancelled' }, { status: 400 });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: id },
      { status },
      { new: true }
    );

    if (!order) {
      console.log('[Admin Order Update] Order not found:', id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('[Admin Order Update] Order updated:', order.orderId, 'Status:', order.status);
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[Admin Order Update] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}