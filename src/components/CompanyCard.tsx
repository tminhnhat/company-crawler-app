import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';

export interface Company {
  id?: string;
  taxCode: string;
  name: string;
  internationalName?: string | null;
  shortName?: string | null;
  address?: string | null;
  legalRepresentative?: string | null;
  phone?: string | null;
  email?: string | null;
  foundingDate?: string | null;
  status?: string | null;
  mainBusiness?: string | null;
  managementUnit?: string | null;
  sourceUrl?: string | null;
  rawContent?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface CompanyCardProps {
  company: Company;
  rawMarkdown?: string;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, rawMarkdown }) => {
  const [copiedTax, setCopiedTax] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);

  const handleCopyTax = () => {
    navigator.clipboard.writeText(company.taxCode);
    setCopiedTax(true);
    setTimeout(() => setCopiedTax(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!company.phone || company.phone === 'Chưa cập nhật') return;
    navigator.clipboard.writeText(company.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyAll = () => {
    const text = `Tên công ty: ${company.name}
Mã số thuế: ${company.taxCode}
Người đại diện: ${company.legalRepresentative || 'Chưa cập nhật'}
Số điện thoại: ${company.phone || 'Chưa cập nhật'}
Email: ${company.email || 'Chưa cập nhật'}
Địa chỉ: ${company.address || 'Chưa cập nhật'}
Ngành nghề kinh doanh chính: ${company.mainBusiness || 'Chưa cập nhật'}
Ngày thành lập: ${company.foundingDate || 'Chưa cập nhật'}
Trạng thái: ${company.status || 'Đang hoạt động'}
Đơn vị quản lý: ${company.managementUnit || 'Chưa cập nhật'}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const isOperating = !company.status || company.status.includes('hoạt động');

  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-700/60">
      {/* Decorative Glow Accent */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tax Code Badge */}
            <button
              onClick={handleCopyTax}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-semibold text-xs hover:bg-cyan-500/20 transition group"
              title="Click để copy Mã Số Thuế"
            >
              <span>MST: {company.taxCode}</span>
              {copiedTax ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />}
            </button>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                isOperating
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {company.status || 'Đang hoạt động'}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs border border-slate-700">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              Đã lưu Database
            </span>
          </div>

          {/* Business Name */}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {company.name}
          </h2>

          {/* Sub Names */}
          {(company.internationalName || company.shortName) && (
            <div className="text-xs text-slate-400 space-y-0.5">
              {company.internationalName && <p>Tên quốc tế: {company.internationalName}</p>}
              {company.shortName && <p>Tên viết tắt: {company.shortName}</p>}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto pt-2 md:pt-0">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition active:scale-95"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedAll ? 'Đã sao chép!' : 'Sao chép thông tin'}</span>
          </button>

          {(rawMarkdown || company.rawContent) && (
            <button
              onClick={() => setShowRawModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-medium border border-violet-500/30 transition active:scale-95"
            >
              <Code2 className="w-3.5 h-3.5 text-violet-400" />
              <span>Xem Raw Markdown</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-6">
        {/* Legal Representative */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 mt-0.5 border border-violet-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Người đại diện pháp luật / Chủ sở hữu</p>
            <p className="text-base font-bold text-white mt-0.5">{company.legalRepresentative || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Main Business Sector */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5 border border-blue-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400">Ngành nghề kinh doanh chính</p>
            <p className="text-sm font-semibold text-cyan-300 mt-0.5">{company.mainBusiness || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Phone Contact */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5 border border-emerald-500/20">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400">Số điện thoại liên hệ</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-mono font-bold text-emerald-300">{company.phone || 'Chưa cập nhật'}</p>
              {company.phone && company.phone !== 'Chưa cập nhật' && (
                <button
                  onClick={handleCopyPhone}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Copy số điện thoại"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Email Contact */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5 border border-amber-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Email liên hệ</p>
            <p className="text-sm font-mono text-slate-200 mt-0.5">{company.email || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 mt-0.5 border border-cyan-500/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Địa chỉ trụ sở</p>
            <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">{company.address || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Founding Date */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 mt-0.5 border border-rose-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Ngày thành lập / Cấp MST</p>
            <p className="text-sm font-medium text-slate-200 mt-0.5">{company.foundingDate || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Management Unit */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 md:col-span-2">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 mt-0.5">
            <Building className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400">Đơn vị quản lý thuế</p>
            <p className="text-sm text-slate-200 mt-0.5">{company.managementUnit || 'Cơ quan thuế quản lý theo địa bàn'}</p>
          </div>
          {company.sourceUrl && (
            <a
              href={company.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline self-center"
            >
              <span>Nguồn GoClaw</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Raw Content Modal */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold text-slate-100">Dữ liệu Markdown thô (GoClaw Fetch API)</h3>
              </div>
              <button
                onClick={() => setShowRawModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/90 whitespace-pre-wrap leading-relaxed">
              {rawMarkdown || company.rawContent || 'Không có dữ liệu thô.'}
            </div>
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowRawModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
