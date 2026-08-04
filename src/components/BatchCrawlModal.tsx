import React, { useState, useRef } from 'react';
import { Layers, Loader2, CheckCircle2, AlertCircle, Play, X, FileSpreadsheet, Upload, FileText, Check, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Company } from './CompanyCard';

interface BatchCrawlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessBatch: (companies: Company[]) => void;
}

export const BatchCrawlModal: React.FC<BatchCrawlModalProps> = ({ isOpen, onClose, onSuccessBatch }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('file');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  // File Upload states
  const [fileName, setFileName] = useState<string>('');
  const [fileTaxCodes, setFileTaxCodes] = useState<string[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [excelRawRows, setExcelRawRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle File Upload (.xlsx, .xls, .csv, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setBatchResults([]);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'txt' || fileExt === 'csv') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          // Extract 10-13 digit tax codes using regex or line splitting
          const matches = text.match(/\b\d{10}(-\d{3})?\b/g) || [];
          const uniqueMSTs = Array.from(new Set(matches));
          setFileTaxCodes(uniqueMSTs);
          setExcelColumns([]);
          setSelectedColumn('');
        }
      };
      reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            // First row as header columns
            const headers = (jsonData[0] as any[]).map((h, i) => (h ? String(h).trim() : `Cột ${i + 1}`));
            const rows = jsonData.slice(1);
            setExcelColumns(headers);
            setExcelRawRows(rows);

            // Auto-detect tax code column
            let detectedColIndex = headers.findIndex(h =>
              /mã số thuế|mst|taxcode|tax_code|tax code|mã thuế/i.test(h)
            );

            if (detectedColIndex === -1) {
              // Try finding column where values match 10-digit tax code regex
              for (let colIdx = 0; colIdx < headers.length; colIdx++) {
                const sampleVals = rows.map(r => String(r[colIdx] || '')).filter(Boolean);
                if (sampleVals.some(v => /\b\d{10}(-\d{3})?\b/.test(v))) {
                  detectedColIndex = colIdx;
                  break;
                }
              }
            }

            if (detectedColIndex === -1) detectedColIndex = 0;

            const chosenHeader = headers[detectedColIndex];
            setSelectedColumn(chosenHeader);
            extractTaxCodesFromExcelColumn(rows, detectedColIndex);
          }
        } catch (err) {
          alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const extractTaxCodesFromExcelColumn = (rows: any[], colIndex: number) => {
    const extracted: string[] = [];
    rows.forEach(r => {
      const val = String(r[colIndex] || '').trim();
      const match = val.match(/\b\d{10}(-\d{3})?\b/);
      if (match) {
        extracted.push(match[0]);
      } else if (val) {
        extracted.push(val); // push non-empty queries
      }
    });
    const unique = Array.from(new Set(extracted.filter(Boolean)));
    setFileTaxCodes(unique);
  };

  const handleColumnChange = (colName: string) => {
    setSelectedColumn(colName);
    const colIdx = excelColumns.indexOf(colName);
    if (colIdx !== -1) {
      extractTaxCodesFromExcelColumn(excelRawRows, colIdx);
    }
  };

  const getQueriesToCrawl = (): string[] => {
    if (activeTab === 'text') {
      return inputText
        .split(/[\n,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      return fileTaxCodes;
    }
  };

  const handleStartBatch = async () => {
    const list = getQueriesToCrawl();

    if (list.length === 0) {
      alert('Vui lòng chọn file Excel/Text hợp lệ hoặc nhập ít nhất 1 mã số thuế.');
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

  const queriesList = getQueriesToCrawl();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Crawl Hàng Loạt Doanh Nghiệp</h3>
              <p className="text-xs text-slate-400">Nhập thủ công hoặc Tải file Excel/TXT để tự động crawl & lưu DB</p>
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

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('file')}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'file'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Tải File Excel / CSV / TXT</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition ${
              activeTab === 'text'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Dán Thủ Công Danh Sách</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'file' ? (
            <div className="space-y-4">
              {/* File Drag & Drop Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center bg-slate-950/60 hover:bg-slate-950 cursor-pointer transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-500/20 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  {fileName ? (
                    <span className="text-emerald-400 font-mono">Đã chọn: {fileName}</span>
                  ) : (
                    'Nhấn để chọn hoặc kéo thả file Excel (.xlsx, .xls) / TXT / CSV'
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Hệ thống sẽ tự động quét cột chứa Mã số thuế</p>
              </div>

              {/* Column Selection if Excel */}
              {excelColumns.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Chọn cột chứa MST trong Excel:</span>
                  <select
                    value={selectedColumn}
                    onChange={e => handleColumnChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-medium focus:outline-none"
                  >
                    {excelColumns.map((col, idx) => (
                      <option key={idx} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview Found Tax Codes */}
              {fileTaxCodes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-4 h-4" />
                      Tìm thấy {fileTaxCodes.length} Mã số thuế sẵn sàng crawl:
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto flex flex-wrap gap-1.5 font-mono text-xs text-cyan-300">
                    {fileTaxCodes.map((code, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}

          {/* Progress Indicator */}
          {progress && (
            <div className="space-y-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex justify-between text-xs text-cyan-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang thu thập dữ liệu...
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

          {/* Batch Results Summary */}
          {batchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-400">Kết quả xử lý ({batchResults.filter(r => r.success).length}/{batchResults.length} thành công):</p>
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

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {activeTab === 'text' ? (
            <button
              onClick={() => setInputText('0100109106\n0313943954\n0101243150')}
              disabled={loading}
              className="text-xs text-cyan-400 hover:underline"
            >
              Chèn mẫu MST thử nghiệm
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Tổng số mục: <strong className="text-cyan-300">{queriesList.length}</strong>
            </span>
          )}

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
              disabled={loading || queriesList.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{loading ? 'Đang Crawl...' : `Bắt đầu Crawl (${queriesList.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
