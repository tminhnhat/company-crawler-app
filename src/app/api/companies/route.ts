import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const whereClause: any = {};

    if (q) {
      whereClause.OR = [
        { taxCode: { contains: q } },
        { name: { contains: q } },
        { address: { contains: q } },
        { legalRepresentative: { contains: q } },
        { mainBusiness: { contains: q } }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    });

    const totalCount = await prisma.company.count();

    return NextResponse.json({
      success: true,
      companies,
      totalCount,
      filteredCount: companies.length
    });
  } catch (err: any) {
    console.error('GET /api/companies Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy dữ liệu doanh nghiệp.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const taxCode = searchParams.get('taxCode');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await prisma.company.deleteMany({});
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ cơ sở dữ liệu.' });
    }

    if (id) {
      await prisma.company.delete({ where: { id } });
      return NextResponse.json({ success: true, message: `Đã xóa doanh nghiệp có ID ${id}.` });
    }

    if (taxCode) {
      await prisma.company.delete({ where: { taxCode } });
      return NextResponse.json({ success: true, message: `Đã xóa doanh nghiệp có MST ${taxCode}.` });
    }

    return NextResponse.json({ success: false, error: 'Cần truyền id, taxCode hoặc all=true để xóa.' }, { status: 400 });
  } catch (err: any) {
    console.error('DELETE /api/companies Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi khi xóa dữ liệu.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, taxCode, ...data } = body;

    if (!id && !taxCode) {
      return NextResponse.json({ success: false, error: 'Cần truyền id hoặc taxCode để cập nhật.' }, { status: 400 });
    }

    const updated = await prisma.company.update({
      where: id ? { id } : { taxCode },
      data
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (err: any) {
    console.error('PUT /api/companies Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi khi cập nhật thông tin.' }, { status: 500 });
  }
}
