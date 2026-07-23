'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
  Layers,
  ArrowRight,
  Zap,
  Globe
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CompanyCard, Company } from '@/components/CompanyCard';
import { CompanyTable } from '@/components/CompanyTable';
import { BatchCrawlModal } from '@/components/BatchCrawlModal';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dbCompanies, setDbCompanies] = useState<Company[]>([]);
  const [crawledCountSession, setCrawledCountSession] = useState<number>(0);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Quick sample tax codes
  const sampleCodes = [
    { label: 'Viettel', taxCode: '0100109106' },
    { label: 'Vingroup', taxCode: '0101243150' },
    { label: 'FPT Corp', taxCode: '0101241114' },
    { label: 'Vietcombank', taxCode: '0100112437' }
  ];

  // Fetch companies from SQLite DB
  const fetchDbCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.success && data.companies) {
        setDbCompanies(data.companies);
      }
    } catch (err) {
      console.error('Failed to load DB companies:', err);
    }
  };

  useEffect(() => {
    fetchDbCompanies();
  }, []);

  // Crawl single tax code or name
  const handleCrawl = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setCurrentCompany(null);
    setRawMarkdown('');

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim() })
      });

      const data = await res.json();

      if (data.success && data.company) {
        setCurrentCompany(data.company);
        setRawMarkdown(data.rawMarkdown || '');
        setCrawledCountSession(prev => prev + 1);
        fetchDbCompanies(); // Refresh DB list
      } else {
        setErrorMsg(data.error || 'Không thể thu thập dữ liệu.');
        if (data.rawMarkdown) setRawMarkdown(data.rawMarkdown);
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối API: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete company from DB
  const handleDeleteCompany = async (id: string, taxCode: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa doanh nghiệp MST ${taxCode} khỏi Database?`)) return;

    try {
      const res = await fetch(`/api/companies?${id ? `id=${id}` : `taxCode=${taxCode}`}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (currentCompany?.taxCode === taxCode) {
          setCurrentCompany(null);
        }
        fetchDbCompanies();
      } else {
        alert(data.error || 'Lỗi khi xóa.');
      }
    } catch (err: any) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  // Clear all DB records
  const handleClearAll = async () => {
    if (!confirm('CẢNH BÁO: Bạn có muốn xóa toàn bộ cơ sở dữ liệu doanh nghiệp không?')) return;
    try {
      const res = await fetch('/api/companies?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCurrentCompany(null);
        fetchDbCompanies();
      }
    } catch (err: any) {
      alert('Lỗi xóa DB: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        dbCount={dbCompanies.length}
        crawledCount={crawledCountSession}
        onOpenBatchModal={() => setIsBatchOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-4 sm:pt-8 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold tracking-wide">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tự Động Crawl & Lưu Dữ Liệu Doanh Nghiệp Việt Nam</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Tra Cứu Thông Tin Doanh Nghiệp <br className="hidden sm:inline" />
            Bằng <span className="gradient-text">Mã Số Thuế & MaSoThue.com Engine</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Nhập Mã số thuế, Tên doanh nghiệp hoặc URL để tự động bóc tách dữ liệu chuẩn xác từ MaSoThue.com và lưu giữ vào SQLite Database chỉ trong vài giây.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto space-y-3">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleCrawl();
              }}
              className="relative flex items-center glass-panel rounded-2xl p-2 shadow-2xl border border-slate-700/80 focus-within:border-cyan-500/80 transition"
            >
              <div className="p-3 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Nhập Mã Số Thuế (ví dụ: 0100109106) hoặc Tên Doanh Nghiệp..."
                className="w-full bg-transparent py-2.5 px-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang Crawl...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Crawl & Lưu DB</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Sample Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 pt-1">
              <span className="font-medium">Mẫu thử nhanh:</span>
              {sampleCodes.map(s => (
                <button
                  key={s.taxCode}
                  onClick={() => {
                    setQuery(s.taxCode);
                    handleCrawl(s.taxCode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 font-mono text-[11px] transition"
                >
                  {s.label} ({s.taxCode})
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {errorMsg && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-slate-400 text-xs mt-1">Vui lòng kiểm tra lại Mã số thuế hoặc thử tra cứu lại từ từ khóa khác.</p>
            </div>
          </div>
        )}

        {/* Crawled Single Result */}
        {currentCompany && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider px-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Kết quả Crawl vừa tải & Đã lưu vào Database:</span>
            </div>
            <CompanyCard company={currentCompany} rawMarkdown={rawMarkdown} />
          </section>
        )}

        {/* Database Table Section */}
        <section className="pt-4">
          <CompanyTable
            companies={dbCompanies}
            onRefresh={fetchDbCompanies}
            onSelectCompany={comp => {
              setCurrentCompany(comp);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            onDeleteCompany={handleDeleteCompany}
            onClearAll={handleClearAll}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-2">
          <p>
            TaxClaw App - Powered by <a href="https://masothue.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">MaSoThue.com</a> & VietQR API & SQLite Database
          </p>
          <p className="text-[11px] text-slate-600">Tự động hóa bóc tách dữ liệu thông tin doanh nghiệp Việt Nam.</p>
        </div>
      </footer>

      {/* Batch Crawl Modal */}
      <BatchCrawlModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onSuccessBatch={newCompanies => {
          if (newCompanies.length > 0) {
            setCurrentCompany(newCompanies[0]);
          }
          fetchDbCompanies();
        }}
      />
    </div>
  );
}
