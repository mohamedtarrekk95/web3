import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Settings from '@/lib/models/Settings';
import { getAdminFromCookies } from '@/lib/adminAuth';

export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const settings = await Settings.find();
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Admin settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { key, value } = body;
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    await connectDB();
    const setting = await Settings.findOneAndUpdate(
      { key },
      { key, value: value || '' },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, setting: { key: setting.key, value: setting.value } });
  } catch (error) {
    console.error('Admin settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const settingsArray = body.settings as Array<{ key: string; value: string }>;
    if (!Array.isArray(settingsArray)) {
      return NextResponse.json({ error: 'Invalid settings array' }, { status: 400 });
    }
    await connectDB();
    const updates = settingsArray.map(async (s) => {
      return Settings.findOneAndUpdate(
        { key: s.key },
        { key: s.key, value: s.value || '' },
        { upsert: true, new: true }
      );
    });
    await Promise.all(updates);
    const allSettings = await Settings.find();
    const settingsObj: Record<string, string> = {};
    allSettings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });
    return NextResponse.json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error('Admin settings bulk update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}