import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'version.json');
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      return NextResponse.json(data);
    }
  } catch (e) {
    console.error('Failed to read version.json', e);
  }

  return NextResponse.json({
    service: 'hospital-ui',
    version: '2.0.0',
    status: 'unversioned_build',
  });
}
