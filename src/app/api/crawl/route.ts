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
        const trimmedItem = item.trim();
        if (!trimmedItem) continue;

        const res = await crawlCompanyInfo(trimmedItem);

        if (res.success && res.data) {
          try {
            const taxCodeToSave = (res.data.taxCode || '').trim() || (`MST_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
            
            const companyData = {
              taxCode: taxCodeToSave,
              name: res.data.name || trimmedItem,
              internationalName: res.data.internationalName || '',
              shortName: res.data.shortName || '',
              address: res.data.address || '',
              legalRepresentative: res.data.legalRepresentative || 'Chưa cập nhật',
              phone: res.data.phone || 'Chưa cập nhật',
              email: res.data.email || 'Chưa cập nhật',
              foundingDate: res.data.foundingDate || 'Chưa cập nhật',
              status: res.data.status || 'Đang hoạt động',
              mainBusiness: res.data.mainBusiness || 'Chưa cập nhật',
              managementUnit: res.data.managementUnit || 'Chưa cập nhật',
              sourceUrl: res.data.sourceUrl || '',
              rawContent: res.data.rawContent || ''
            };

            const saved = await prisma.company.upsert({
              where: { taxCode: taxCodeToSave },
              update: companyData,
              create: companyData
            });

            results.push({ query: trimmedItem, success: true, company: saved });
          } catch (dbErr: any) {
            console.error('Database Batch Save Error for:', trimmedItem, dbErr);
            results.push({
              query: trimmedItem,
              success: false,
              error: 'Lỗi lưu database: ' + (dbErr.message || 'Không thể lưu vào SQLite'),
              data: res.data
            });
          }
        } else {
          results.push({ query: trimmedItem, success: false, error: res.error || 'Khôn thu thập được thông tin.' });
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
        error: crawlRes.error || 'Không thu thập được thông tin.',
        rawMarkdown: crawlRes.rawMarkdown
      }, { status: 404 });
    }

    const taxCodeToSave = (crawlRes.data.taxCode || '').trim() || (`MST_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    const companyData = {
      taxCode: taxCodeToSave,
      name: crawlRes.data.name || query,
      internationalName: crawlRes.data.internationalName || '',
      shortName: crawlRes.data.shortName || '',
      address: crawlRes.data.address || '',
      legalRepresentative: crawlRes.data.legalRepresentative || 'Chưa cập nhật',
      phone: crawlRes.data.phone || 'Chưa cập nhật',
      email: crawlRes.data.email || 'Chưa cập nhật',
      foundingDate: crawlRes.data.foundingDate || 'Chưa cập nhật',
      status: crawlRes.data.status || 'Đang hoạt động',
      mainBusiness: crawlRes.data.mainBusiness || 'Chưa cập nhật',
      managementUnit: crawlRes.data.managementUnit || 'Chưa cập nhật',
      sourceUrl: crawlRes.data.sourceUrl || '',
      rawContent: crawlRes.data.rawContent || ''
    };

    // Save/Upsert to SQLite DB
    try {
      const company = await prisma.company.upsert({
        where: { taxCode: taxCodeToSave },
        update: companyData,
        create: companyData
      });

      return NextResponse.json({
        success: true,
        company,
        rawMarkdown: crawlRes.rawMarkdown
      });
    } catch (dbErr: any) {
      console.error('Database Single Upsert Error:', dbErr);
      return NextResponse.json({
        success: true,
        company: companyData,
        warning: 'Crawl thành công nhưng gặp lỗi khi lưu Database: ' + dbErr.message,
        rawMarkdown: crawlRes.rawMarkdown
      });
    }
  } catch (err: any) {
    console.error('API Crawl Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi crawl.' }, { status: 500 });
  }
}
