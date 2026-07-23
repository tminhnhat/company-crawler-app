import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { crawlCompanyInfo } from '@/lib/goclaw';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, queries } = body;

    // Batch Crawl Mode
    if (Array.isArray(queries) && queries.length > 0) {
      const results = [];
      for (const item of queries) {
        if (!item || typeof item !== 'string') continue;
        const res = await crawlCompanyInfo(item);
        if (res.success && res.data) {
          try {
            const saved = await prisma.company.upsert({
              where: { taxCode: res.data.taxCode },
              update: { ...res.data },
              create: { ...res.data }
            });
            results.push({ query: item, success: true, company: saved });
          } catch (dbErr: any) {
            console.error('Database Save Error for', item, dbErr);
            results.push({ query: item, success: false, error: 'Lỗi lưu database: ' + dbErr.message, data: res.data });
          }
        } else {
          results.push({ query: item, success: false, error: res.error });
        }
      }
      return NextResponse.json({ success: true, batchResults: results });
    }

    // Single Crawl Mode
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Thiếu từ khóa hoặc Mã số thuế cần tra cứu.' }, { status: 400 });
    }

    const crawlRes = await crawlCompanyInfo(query);
    if (!crawlRes.success || !crawlRes.data) {
      return NextResponse.json({
        success: false,
        error: crawlRes.error || 'Khôn thu thập được thông tin.',
        rawMarkdown: crawlRes.rawMarkdown
      }, { status: 404 });
    }

    // Save/Upsert to SQLite DB
    try {
      const company = await prisma.company.upsert({
        where: { taxCode: crawlRes.data.taxCode },
        update: { ...crawlRes.data },
        create: { ...crawlRes.data }
      });

      return NextResponse.json({
        success: true,
        company,
        rawMarkdown: crawlRes.rawMarkdown
      });
    } catch (dbErr: any) {
      console.error('Database Upsert Error:', dbErr);
      return NextResponse.json({
        success: true,
        company: crawlRes.data,
        warning: 'Crawl thành công nhưng gặp lỗi khi lưu Database: ' + dbErr.message,
        rawMarkdown: crawlRes.rawMarkdown
      });
    }
  } catch (err: any) {
    console.error('API Crawl Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi crawl.' }, { status: 500 });
  }
}
