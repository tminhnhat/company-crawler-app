import React, { useState } from 'react';
import {
  Database,
  Search,
  Filter,
  Trash2,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  Phone,
  Briefcase,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { Company } from './CompanyCard';

interface CompanyTableProps {
  companies: Company[];
  onRefresh: () => void;
  onSelectCompany: (company: Company) => void;
  onDeleteCompany: (id: string, taxCode: string) => void;
  onClearAll: () => void;
}

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onRefresh,
  onSelectCompany,
  onDeleteCompany,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Filter companies
  const filtered = companies.filter(c => {
    const matchesSearch =
      !searchTerm ||
      c.taxCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.legalRepresentative && c.legalRepresentative.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.mainBusiness && c.mainBusiness.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopyPhone = (phone: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone || phone === 'Chưa cập nhật') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (companies.length === 0) return;
    const headers = ['Mã số thuế', 'Tên doanh nghiệp', 'Người đại diện', 'Số điện thoại', 'Email', 'Ngành nghề chính', 'Địa chỉ', 'Ngày thành lập', 'Trạng thái'];
    const rows = filtered.map(c => [
      `"${c.taxCode}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.legalRepresentative || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.mainBusiness || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.foundingDate || '').replace(/"/g, '""')}"`,
      `"${(c.status || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Doanh_Nghiep_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (companies.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filtered, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `Danh_Sach_Doanh_Nghiep_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-800">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Cơ Sở Dữ Liệu Doanh Nghiệp ({companies.length})</h3>
            <p className="text-xs text-slate-400">Danh sách các doanh nghiệp đã tự động lưu trữ trong SQLite Database</p>
          </div>
        </div>

        {/* Export & Utility Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Làm mới bảng"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={companies.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/20 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Xuất CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={companies.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/20 transition disabled:opacity-50"
          >
            <FileJson className="w-4 h-4 text-blue-400" />
            <span>Xuất JSON</span>
          </button>
          {companies.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 transition"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã số thuế, Tên công ty, Đại diện, SĐT, Ngành nghề..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition appearance-none cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NNT đang hoạt động">NNT đang hoạt động</option>
            <option value="Đang hoạt động">Đang hoạt động</option>
            <option value="Tạm ngừng hoạt động">Tạm ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Mã Số Thuế</th>
              <th className="px-4 py-3.5 font-semibold">Tên Doanh Nghiệp</th>
              <th className="px-4 py-3.5 font-semibold">Đại Diện Pháp Luật</th>
              <th className="px-4 py-3.5 font-semibold">Số Điện Thoại</th>
              <th className="px-4 py-3.5 font-semibold hidden lg:table-cell">Ngành Nghề Chính</th>
              <th className="px-4 py-3.5 font-semibold">Trạng Thái</th>
              <th className="px-4 py-3.5 font-semibold text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {companies.length === 0
                    ? 'Chưa có doanh nghiệp nào được lưu trong Database. Hãy thử crawl MST ở trên!'
                    : 'Không tìm thấy dữ liệu phù hợp với bộ lọc.'}
                </td>
              </tr>
            ) : (
              filtered.map(company => (
                <tr
                  key={company.id || company.taxCode}
                  className="hover:bg-slate-900/60 transition group cursor-pointer"
                  onClick={() => onSelectCompany(company)}
                >
                  <td className="px-4 py-3.5 font-mono font-semibold text-cyan-400 whitespace-nowrap">
                    {company.taxCode}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-100 max-w-xs truncate">
                    {company.name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap font-medium">
                    {company.legalRepresentative || '-'}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-400 whitespace-nowrap">
                    {company.phone && company.phone !== 'Chưa cập nhật' ? (
                      <div className="flex items-center gap-1.5">
                        <span>{company.phone}</span>
                        <button
                          onClick={e => handleCopyPhone(company.phone || '', company.id || company.taxCode, e)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Copy số điện thoại"
                        >
                          {copiedPhoneId === (company.id || company.taxCode) ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-sans text-xs">Chưa cập nhật</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate hidden lg:table-cell">
                    {company.mainBusiness || '-'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      {company.status || 'Đang hoạt động'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectCompany(company)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCompany(company.id || '', company.taxCode)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        title="Xóa khỏi Database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
