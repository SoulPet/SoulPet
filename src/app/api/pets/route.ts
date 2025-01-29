import { NextResponse } from 'next/server';
import type { Pet } from '@/types';

export async function GET() {
  try {
    // TODO: Implement pet fetching logic
    return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 