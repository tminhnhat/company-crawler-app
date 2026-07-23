import React, { useState } from 'react';
import { Layers, Loader2, CheckCircle2, AlertCircle, Play, X, Download } from 'lucide-react';
import { Company } from './CompanyCard';

interface BatchCrawlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessBatch: (companies: Company[]) => void;
}

export const BatchCrawlModal: React.FC<BatchCrawlModalProps> = ({ isOpen, onClose, onSuccessBatch }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleStartBatch = async () => {
    // Parse Tax Codes / Queries line by line or comma
    const list = inputText
      .split(/[\n,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (list.length === 0) {
      alert('Vui lòng nhập ít nhất 1 mã số thuế hoặc từ khóa.');
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: list.length });
    setBatchResults([]);

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: list })
      });

      const data = await res.json();
      if (data.success && data.batchResults) {
        setBatchResults(data.batchResults);
        const successfulCompanies = data.batchResults
          .filter((r: any) => r.success && r.company)
          .map((r: any) => r.company);
        if (successfulCompanies.length > 0) {
          onSuccessBatch(successfulCompanies);
        }
      } else {
        alert(data.error || 'Có lỗi xảy ra khi crawl hàng loạt.');
      }
    } catch (err: any) {
      alert('Lỗi kết nối server: ' + err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Crawl Hàng Loạt Doanh Nghiệp</h3>
              <p className="text-xs text-slate-400">Nhập danh sách mã số thuế để tự động crawl và lưu vào DB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Danh sách Mã số thuế / Tên công ty (Mỗi dòng 1 mã):
            </label>
            <textarea
              rows={6}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={loading}
              placeholder={`0100109106\n0313943954\n0101243150\n...`}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition resize-none"
            />
          </div>

          {/* Progress Indicator */}
          {progress && (
            <div className="space-y-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex justify-between text-xs text-cyan-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang xử lý crawl...
                </span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Summary */}
          {batchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-400">Kết quả xử lý:</p>
              {batchResults.map((r, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                    r.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <span className="font-mono font-medium">{r.query}</span>
                  {r.success ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {r.company?.name || 'Thành công'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {r.error || 'Thất bại'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => setInputText('0100109106\n0313943954\n0101243150')}
            disabled={loading}
            className="text-xs text-cyan-400 hover:underline"
          >
            Chèn mẫu MST thử nghiệm
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleStartBatch}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{loading ? 'Đang Crawl...' : 'Bắt đầu Crawl'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
