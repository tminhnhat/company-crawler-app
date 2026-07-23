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

/**
 * Main Crawler Function using GoClaw Fetch API (https://fetch.goclaw.sh/)
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

  let rawMarkdown = '';
  let sourceUrl = '';
  let extracted: Partial<ExtractedCompanyData> = {};

  try {
    if (isTaxCode(trimmed)) {
      const cleanMst = trimmed.replace(/\s+/g, '');
      
      // Step 1: Query VietQR Business API for official Name, Address, Status
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
        console.warn('VietQR API fallback error:', e);
      }

      // Step 2: Query GoClaw Fetch API on thongtindoanhnghiep.co
      sourceUrl = `https://thongtindoanhnghiep.co/tim-kiem?kwd=%22${cleanMst}%22`;
      const goclawUrl = `https://fetch.goclaw.sh/${sourceUrl}`;
      const goclawRes = await fetch(goclawUrl, { next: { revalidate: 0 } });

      if (goclawRes.ok) {
        const searchMd = await goclawRes.text();
        rawMarkdown = searchMd;

        // Parse search markdown
        const searchParsed = parseMarkdownCompany(searchMd, cleanMst);
        extracted = { ...searchParsed, ...extracted };

        // Step 3: Fetch detail page slug to get Legal Rep, Phone, Email & Main Business accurately
        const companyTitle = searchParsed.name || extracted.name || '';
        if (companyTitle) {
          const slug = removeVietnameseTones(companyTitle);
          const detailUrl = `https://thongtindoanhnghiep.co/${cleanMst}-${slug}`;
          console.log('Fetching Detail Slug Page:', detailUrl);

          try {
            const detailRes = await fetch(`https://fetch.goclaw.sh/${detailUrl}`, { next: { revalidate: 0 } });
            if (detailRes.ok) {
              const detailMd = await detailRes.text();
              rawMarkdown += '\n\n--- DETAIL PAGE ---\n\n' + detailMd;

              const detailParsed = parseMarkdownCompany(detailMd, cleanMst);
              if (detailParsed.legalRepresentative) extracted.legalRepresentative = detailParsed.legalRepresentative;
              if (detailParsed.phone) extracted.phone = detailParsed.phone;
              if (detailParsed.email) extracted.email = detailParsed.email;
              if (detailParsed.mainBusiness) extracted.mainBusiness = detailParsed.mainBusiness;
              if (detailParsed.foundingDate) extracted.foundingDate = detailParsed.foundingDate;
              if (detailParsed.managementUnit) extracted.managementUnit = detailParsed.managementUnit;
            }
          } catch (e) {
            console.warn('Detail slug fetch error:', e);
          }
        }
      }

      if (!extracted.name && !extracted.taxCode) {
        return {
          success: false,
          error: `Không tìm thấy thông tin cho mã số thuế ${cleanMst}.`,
          rawMarkdown
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
          rawContent: rawMarkdown
        },
        rawMarkdown
      };
    } else if (isUrl(trimmed)) {
      sourceUrl = trimmed;
      const goclawUrl = `https://fetch.goclaw.sh/${sourceUrl}`;
      const goclawRes = await fetch(goclawUrl, { next: { revalidate: 0 } });
      if (!goclawRes.ok) {
        return { success: false, error: `Không thể kết nối qua GoClaw Fetch (Status: ${goclawRes.status})` };
      }
      rawMarkdown = await goclawRes.text();
      const parsed = parseMarkdownCompany(rawMarkdown);

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
          rawContent: rawMarkdown
        },
        rawMarkdown
      };
    } else {
      // Search by Company Name via GoClaw Fetch API
      sourceUrl = `https://thongtindoanhnghiep.co/tim-kiem?q=${encodeURIComponent(trimmed)}`;
      const goclawUrl = `https://fetch.goclaw.sh/${sourceUrl}`;
      const goclawRes = await fetch(goclawUrl, { next: { revalidate: 0 } });

      if (!goclawRes.ok) {
        return { success: false, error: `Không thể tìm kiếm qua GoClaw Fetch API (Status: ${goclawRes.status})` };
      }

      rawMarkdown = await goclawRes.text();
      const parsed = parseMarkdownCompany(rawMarkdown);

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
          rawContent: rawMarkdown
        },
        rawMarkdown
      };
    }
  } catch (err: any) {
    console.error('Crawl Error:', err);
    return {
      success: false,
      error: err.message || 'Lỗi hệ thống khi thu thập dữ liệu.',
      rawMarkdown
    };
  }
}

/**
 * Smart Markdown Parser for Vietnamese Business Directories
 */
function parseMarkdownCompany(markdown: string, targetMst?: string): Partial<ExtractedCompanyData> {
  const res: Partial<ExtractedCompanyData> = {};

  // Extract Tax Code
  const mstMatch = markdown.match(/(?:Mã số thuế|MST|Mã Số Thuế)[:\s]*\**([0-9]{10}(?:-[0-9]{3})?)\**/i)
    || markdown.match(/\b([0-9]{10}(?:-[0-9]{3})?)\b/);
  if (mstMatch && mstMatch[1]) {
    res.taxCode = mstMatch[1];
  } else if (targetMst) {
    res.taxCode = targetMst;
  }

  // Extract Company Name
  const nameMatch = markdown.match(/##\s*([^\n#]+)/)
    || markdown.match(/#\s*([^\n#]+)/)
    || markdown.match(/(?:Tên doanh nghiệp|Tên công ty|Tên chính thức)[:\s]*\**([^\n\*]+)\**/i);
  if (nameMatch && nameMatch[1]) {
    res.name = nameMatch[1].trim().replace(/^[\*\#\s\-\:]+/, '').replace(/[\*\#]+$/, '');
  }

  // Extract Legal Representative (Chủ sở hữu, Người đại diện, Đại diện pháp luật, Giám đốc)
  const repMatch = markdown.match(/(?:Chủ sở hữu|Người đại diện|Đại diện pháp luật|Tên giám đốc|Chủ doanh nghiệp)[\s\n]*###\s*([^\n#]+)/i)
    || markdown.match(/(?:Chủ sở hữu|Người đại diện|Đại diện pháp luật|Tên giám đốc)\s*\n+\s*###\s*([^\n#]+)/i)
    || markdown.match(/(?:Chủ sở hữu|Người đại diện|Đại diện pháp luật|Tên giám đốc)\s*\n+\s*([A-Z\u00C0-\u024F\u1E00-\u1EFF\s]{4,40})/i)
    || markdown.match(/(?:Đại diện pháp luật|Người đại diện|Chủ sở hữu|Giám đốc)[:\s]*\**([^\n\*]+)\**/i)
    || markdown.match(/\[([A-Z\u00C0-\u024F\u1E00-\u1EFF\s]{4,40})\]\(https:\/\/thongtindoanhnghiep\.co\/tim-kiem\?kwd=/i);

  if (repMatch && repMatch[1]) {
    res.legalRepresentative = repMatch[1].trim().replace(/^###\s*/, '');
  }

  // Extract Phone Number (Số điện thoại)
  const phoneMatch = markdown.match(/(?:Điện thoại \/ Fax|Điện thoại|SĐT|Phone|Tel|Mobile|Số điện thoại)[:\s]*\**([0-9\.\s\+\-\(\)]{8,20})\**/i)
    || markdown.match(/(?:Điện thoại \/ Fax|Điện thoại|SĐT)[\s\n]*###\s*([0-9\.\s\+\-\(\)]{8,20})/i)
    || markdown.match(/(?:Điện thoại \/ Fax|Điện thoại|SĐT)[\s\n]*\n+([0-9\.\s\+\-\(\)]{8,20})/i);

  if (phoneMatch && phoneMatch[1]) {
    const rawP = phoneMatch[1].trim().replace(/^\/$/, '');
    if (rawP && rawP.length >= 8) res.phone = rawP;
  }

  // Extract Email
  const emailMatch = markdown.match(/(?:Email|Thư điện tử|E-mail)[:\s]*\**([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\**/i)
    || markdown.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);

  if (emailMatch && emailMatch[1]) {
    res.email = emailMatch[1].trim();
  }

  // Extract Address
  const addrMatch = markdown.match(/(?:Địa chỉ|Địa chỉ trụ sở)[:\s]*\**([^\n\*]+)\**/i)
    || markdown.match(/Địa chỉ:\s*\*\*([^\*]+)\*\*/i);
  if (addrMatch && addrMatch[1]) {
    res.address = addrMatch[1].trim();
  }

  // Extract Founding Date
  const dateMatch = markdown.match(/(?:Ngày thành lập|Ngày hoạt động|Ngày cấp)[:\s]*\**([0-9]{2}[-\/][0-9]{2}[-\/][0-9]{4})\**/i)
    || markdown.match(/(?:Ngày thành lập|Ngày hoạt động|Ngày cấp)[:\s]*\**([0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2})\**/i);
  if (dateMatch && dateMatch[1]) {
    res.foundingDate = dateMatch[1].trim();
  }

  // Extract Main Business (Ngành nghề kinh doanh chính)
  const bizMatch = markdown.match(/Ngành nghề kinh doanh chính:\s*\*\*([^\*]+)\*\*/i)
    || markdown.match(/(?:Ngành nghề chính|Ngành nghề kinh doanh chính)[:\s]*\**\[?\**([^\n\]\*]+)\**\]?/i)
    || markdown.match(/Ngành nghề chính[\s\n]*\[\*\*([^\*]+)\*\*\]/i)
    || markdown.match(/Ngành nghề chính[\s\n]*\[([^\]]+)\]/i);

  if (bizMatch && bizMatch[1]) {
    res.mainBusiness = bizMatch[1].trim();
  }

  // Extract Management Unit
  const unitMatch = markdown.match(/(?:Quản lý bởi|Chi cục thuế|Đơn vị quản lý|Nơi đăng ký quản lý)[:\s]*\**([^\n\*]+)\**/i);
  if (unitMatch && unitMatch[1]) {
    res.managementUnit = unitMatch[1].trim();
  }

  // Extract Status
  const statusMatch = markdown.match(/(?:Trạng thái|Tình trạng)[:\s]*\**([^\n\*]+)\**/i);
  if (statusMatch && statusMatch[1]) {
    res.status = statusMatch[1].trim();
  }

  return res;
}
