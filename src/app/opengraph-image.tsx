import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'CityMarket — everyday essentials delivered';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const mark = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.svg'), 'utf8');
  const src = `data:image/svg+xml,${encodeURIComponent(mark)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '40px',
          padding: '0 90px',
          background: 'linear-gradient(135deg, #2F8360 0%, #1F5A45 100%)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <img src={src} width={132} height={132} alt="" />
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, letterSpacing: '-3px' }}>CityMarket</div>
        </div>
        <div style={{ display: 'flex', fontSize: 44, opacity: 0.9, maxWidth: 860, lineHeight: 1.25 }}>
          Everyday essentials delivered — pay in cash when it arrives.
        </div>
      </div>
    ),
    { ...size },
  );
}
