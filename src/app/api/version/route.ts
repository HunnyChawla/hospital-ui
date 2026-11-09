import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'version.json');
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      return NextResponse.json({
        application: data.application || 'cura-frontend',
        environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'production',
        version: data.version || '2.0.0',
        git_commit: data.git_commit || 'unknown',
        image_digest: process.env.IMAGE_DIGEST || data.image_digest || 'unknown',
        build_time: data.build_time || data.build_timestamp || 'unknown',
        ...data,
      });
    }
  } catch (e) {
    console.error('Failed to read version.json', e);
  }

  return NextResponse.json({
    application: 'cura-frontend',
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'production',
    version: '2.0.0',
    git_commit: 'unknown',
    image_digest: process.env.IMAGE_DIGEST || 'unknown',
    build_time: 'unknown',
    status: 'unversioned_build',
  });
}
