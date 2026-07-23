export interface ExtractedCompanyData {
  taxCode: string;
  name: string;
  internationalName?: string;
  shortName?: string;
  address?: string;
  legalRepresentative?: string;
  phone?: string;
  email?: string;
  foundingDate?: string;
  status?: string;
  mainBusiness?: string;
  managementUnit?: string;
  sourceUrl?: string;
  rawContent?: string;
}

export function isTaxCode(query: string): boolean {
  const clean = query.trim().replace(/\s+/g, '');
  return /^\d{10}(-\d{3})?$/.test(clean);
}

export function isUrl(query: string): boolean {
  return /^https?:\/\//i.test(query.trim());
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '-');
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Referer': 'https://masothue.com/'
};

/**
 * Main Crawler Function using MaSoThue.com (https://masothue.com) & VietQR API
 */
export async function crawlCompanyInfo(query: string): Promise<{
  success: boolean;
  data?: ExtractedCompanyData;
  error?: string;
  rawMarkdown?: string;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, error: 'Chưa nhập thông tin cần tra cứu.' };
  }

  let sourceUrl = 'https://masothue.com';
  let rawContent = '';
  let extracted: Partial<ExtractedCompanyData> = {};

  try {
    if (isTaxCode(trimmed)) {
      const cleanMst = trimmed.replace(/\s+/g, '');

      // Step 1: Get official metadata from VietQR API (fast & highly reliable)
      try {
        const vqrRes = await fetch(`https://api.vietqr.io/v2/business/${cleanMst}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 0 }
        });
        if (vqrRes.ok) {
          const vqrJson = await vqrRes.json();
          if (vqrJson.code === '00' && vqrJson.data) {
            const b = vqrJson.data;
            extracted.taxCode = b.id || cleanMst;
            extracted.name = b.name;
            extracted.internationalName = b.internationalName || '';
            extracted.shortName = b.shortName || '';
            extracted.address = b.address || '';
            extracted.status = b.status || 'NNT đang hoạt động';
          }
        }
      } catch (e) {
        console.warn('VietQR API warning:', e);
      }

      // Step 2: Fetch detail page directly from https://masothue.com using generated slug
      const companyNameForSlug = extracted.name || `cong-ty-${cleanMst}`;
      const slug = removeVietnameseTones(companyNameForSlug);
      sourceUrl = `https://masothue.com/${cleanMst}-${slug}`;

      console.log('Crawling MaSoThue.com:', sourceUrl);
      try {
        let masothueRes = await fetch(sourceUrl, {
          headers: DEFAULT_HEADERS,
          next: { revalidate: 0 }
        });

        // Fallback: try searching on masothue.com if direct slug was redirected/not 200
        if (!masothueRes.ok) {
          sourceUrl = `https://masothue.com/Search/?q=${cleanMst}&type=auto`;
          masothueRes = await fetch(sourceUrl, { headers: DEFAULT_HEADERS, next: { revalidate: 0 } });
        }

        if (masothueRes.ok) {
          const html = await masothueRes.text();
          rawContent = html;

          const parsed = parseMasothueHtml(html, cleanMst);
          extracted = { ...extracted, ...parsed };
          if (parsed.legalRepresentative) extracted.legalRepresentative = parsed.legalRepresentative;
          if (parsed.phone) extracted.phone = parsed.phone;
          if (parsed.email) extracted.email = parsed.email;
          if (parsed.mainBusiness) extracted.mainBusiness = parsed.mainBusiness;
          if (parsed.foundingDate) extracted.foundingDate = parsed.foundingDate;
          if (parsed.managementUnit) extracted.managementUnit = parsed.managementUnit;
          if (parsed.status) extracted.status = parsed.status;
          if (parsed.address) extracted.address = parsed.address;
          if (parsed.name && !extracted.name) extracted.name = parsed.name;
        }
      } catch (e) {
        console.warn('MaSoThue.com fetch warning:', e);
      }

      // If still missing name, try GoClaw fallback
      if (!extracted.name && !extracted.taxCode) {
        return {
          success: false,
          error: `Không tìm thấy thông tin trên MaSoThue.com cho mã số thuế ${cleanMst}.`,
          rawMarkdown: rawContent
        };
      }

      return {
        success: true,
        data: {
          taxCode: extracted.taxCode || cleanMst,
          name: extracted.name || `Doanh nghiệp MST ${cleanMst}`,
          internationalName: extracted.internationalName || '',
          shortName: extracted.shortName || '',
          address: extracted.address || '',
          legalRepresentative: extracted.legalRepresentative || 'Chưa cập nhật',
          phone: extracted.phone || 'Chưa cập nhật',
          email: extracted.email || 'Chưa cập nhật',
          foundingDate: extracted.foundingDate || 'Chưa cập nhật',
          status: extracted.status || 'Đang hoạt động',
          mainBusiness: extracted.mainBusiness || 'Chưa cập nhật',
          managementUnit: extracted.managementUnit || 'Chưa cập nhật',
          sourceUrl,
          rawContent
        },
        rawMarkdown: rawContent
      };
    } else if (isUrl(trimmed)) {
      sourceUrl = trimmed;
      const goclawUrl = `https://fetch.goclaw.sh/${sourceUrl}`;
      const goclawRes = await fetch(goclawUrl, { next: { revalidate: 0 } });
      if (!goclawRes.ok) {
        return { success: false, error: `Không thể kết nối URL (Status: ${goclawRes.status})` };
      }
      rawContent = await goclawRes.text();
      const parsed = parseMasothueHtml(rawContent);

      return {
        success: true,
        data: {
          taxCode: parsed.taxCode || 'MST_' + Date.now(),
          name: parsed.name || 'Doanh nghiệp chưa đặt tên',
          internationalName: parsed.internationalName || '',
          shortName: parsed.shortName || '',
          address: parsed.address || '',
          legalRepresentative: parsed.legalRepresentative || 'Chưa cập nhật',
          phone: parsed.phone || 'Chưa cập nhật',
          email: parsed.email || 'Chưa cập nhật',
          foundingDate: parsed.foundingDate || 'Chưa cập nhật',
          status: parsed.status || 'Đang hoạt động',
          mainBusiness: parsed.mainBusiness || 'Chưa cập nhật',
          managementUnit: parsed.managementUnit || 'Chưa cập nhật',
          sourceUrl,
          rawContent
        },
        rawMarkdown: rawContent
      };
    } else {
      // Search by Company Name on MaSoThue.com
      sourceUrl = `https://masothue.com/Search/?q=${encodeURIComponent(trimmed)}&type=auto`;
      const res = await fetch(sourceUrl, { headers: DEFAULT_HEADERS, next: { revalidate: 0 } });

      if (res.ok) {
        rawContent = await res.text();
        const parsed = parseMasothueHtml(rawContent);

        return {
          success: true,
          data: {
            taxCode: parsed.taxCode || 'MST_' + Math.floor(1000000000 + Math.random() * 9000000000),
            name: parsed.name || trimmed,
            internationalName: parsed.internationalName || '',
            shortName: parsed.shortName || '',
            address: parsed.address || '',
            legalRepresentative: parsed.legalRepresentative || 'Chưa cập nhật',
            phone: parsed.phone || 'Chưa cập nhật',
            email: parsed.email || 'Chưa cập nhật',
            foundingDate: parsed.foundingDate || 'Chưa cập nhật',
            status: parsed.status || 'Đang hoạt động',
            mainBusiness: parsed.mainBusiness || 'Chưa cập nhật',
            managementUnit: parsed.managementUnit || 'Chưa cập nhật',
            sourceUrl,
            rawContent
          },
          rawMarkdown: rawContent
        };
      } else {
        return { success: false, error: 'Không thể tìm kiếm thông tin trên MaSoThue.com.' };
      }
    }
  } catch (err: any) {
    console.error('Crawl Error:', err);
    return {
      success: false,
      error: err.message || 'Lỗi hệ thống khi thu thập dữ liệu.',
      rawMarkdown: rawContent
    };
  }
}

/**
 * Smart HTML/Text Parser for MaSoThue.com
 */
function parseMasothueHtml(html: string, targetMst?: string): Partial<ExtractedCompanyData> {
  const res: Partial<ExtractedCompanyData> = {};
  const cleanText = (str: string | undefined) =>
    str ? str.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : '';

  // Extract Tax Code
  const mstMatch = html.match(/Mã số thuế<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/itemprop=['"]taxID['"][^>]*>(.*?)<\/td>/i)
    || html.match(/Mã số thuế:\s*\**([0-9]{10}(?:-[0-9]{3})?)\**/i)
    || html.match(/\b([0-9]{10}(?:-[0-9]{3})?)\b/);
  
  if (mstMatch && mstMatch[1]) {
    res.taxCode = cleanText(mstMatch[1]);
  } else if (targetMst) {
    res.taxCode = targetMst;
  }

  // Extract Company Name
  const nameMatch = html.match(/<th[^>]*itemprop=['"]name['"][^>]*>\s*<span[^>]*class=['"]title-1['"][^>]*>(.*?)<\/span>/i)
    || html.match(/<span[^>]*class=['"]title-1['"][^>]*>(.*?)<\/span>/i)
    || html.match(/<h1[^>]*class=['"]title-1['"][^>]*>(.*?)<\/h1>/i)
    || html.match(/<h1[^>]*>(.*?)<\/h1>/i);

  if (nameMatch && nameMatch[1]) {
    const rawN = cleanText(nameMatch[1]);
    // Clean MST prefix if name starts with "0100109106 - ..."
    res.name = rawN.replace(/^[0-9]{10}(?:-[0-9]{3})?\s*-\s*/, '').trim();
  }

  // Extract Legal Representative (Tên người đại diện)
  const repMatch = html.match(/<tr[^>]*itemprop=['"]alumni['"][^>]*>[\s\S]*?<span[^>]*itemprop=['"]name['"][^>]*>(.*?)<\/span>/i)
    || html.match(/Người đại diện<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Chủ sở hữu<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Giám đốc<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (repMatch && repMatch[1]) {
    const rawR = cleanText(repMatch[1]);
    if (rawR && rawR.length > 2) res.legalRepresentative = rawR;
  }

  // Extract Phone Number
  const phoneMatch = html.match(/<i[^>]*class=['"]fa fa-phone['"][^>]*><\/i>\s*Điện thoại<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Điện thoại<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (phoneMatch && phoneMatch[1]) {
    const rawP = cleanText(phoneMatch[1]).replace(/Ẩn số điện thoại/gi, '').trim();
    if (rawP && rawP.length >= 8) res.phone = rawP;
  }

  // Extract Address
  const addrMatch = html.match(/<i[^>]*class=['"]fa fa-map-marker['"][^>]*><\/i>\s*Địa chỉ<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Địa chỉ<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (addrMatch && addrMatch[1]) {
    res.address = cleanText(addrMatch[1]);
  }

  // Extract Main Business
  const bizMatch = html.match(/Ngành nghề chính<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Ngành nghề<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (bizMatch && bizMatch[1]) {
    res.mainBusiness = cleanText(bizMatch[1]);
  }

  // Extract Founding Date
  const dateMatch = html.match(/Ngày hoạt động<\/td>\s*<td[^>]*>(.*?)<\/td>/i)
    || html.match(/Ngày cấp<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (dateMatch && dateMatch[1]) {
    res.foundingDate = cleanText(dateMatch[1]);
  }

  // Extract Management Unit
  const unitMatch = html.match(/Quản lý bởi<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (unitMatch && unitMatch[1]) {
    res.managementUnit = cleanText(unitMatch[1]);
  }

  // Extract Status
  const statusMatch = html.match(/Trạng thái<\/td>\s*<td[^>]*>(.*?)<\/td>/i);

  if (statusMatch && statusMatch[1]) {
    res.status = cleanText(statusMatch[1]);
  }

  return res;
}
