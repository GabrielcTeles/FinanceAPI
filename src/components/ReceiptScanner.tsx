import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  Edit3, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { AppData, Transaction } from '../types';
import { formatCurrency } from '../utils';

interface ReceiptScannerProps {
  onAddScannedTransaction: (tx: Partial<Transaction>) => void;
  isMobile?: boolean;
}

export default function ReceiptScanner({ onAddScannedTransaction, isMobile }: ReceiptScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // OCR Scan States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit states of scanned results
  const [establishment, setEstablishment] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [scanMode, setScanMode] = useState<'gemini' | 'instant'>('instant');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Apenas arquivos de imagem são suportados para processamento de notas.");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setScanResult(null); // Clear previous result
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const compressAndResizeImage = (imgFile: File, maxWidth = 1024, maxHeight = 1024): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(imgFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ base64: event.target?.result as string, mimeType: imgFile.type || "image/jpeg" });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Force conversion to JPEG with 0.8 quality to optimize size dramatically
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          resolve({ base64: compressedBase64, mimeType: "image/jpeg" });
        };
        img.onerror = () => {
          resolve({ base64: event.target?.result as string, mimeType: imgFile.type || "image/jpeg" });
        };
      };
      reader.onerror = () => {
        resolve({ base64: "", mimeType: imgFile.type || "image/jpeg" });
      };
    });
  };

  // Sends image to backend Gemini OCR endpoint
  const handleScanReceipt = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const isFast = scanMode === 'instant';
    setLoadingStep(isFast 
      ? "Preparando imagem para escaneamento super rápido..." 
      : "Otimizando e compactando imagem para leitura profunda..."
    );

    try {
      // Compress and resize image client-side
      const { base64: base64Data, mimeType: processedMimeType } = await compressAndResizeImage(file);

      if (!base64Data) {
        throw new Error("Falha ao ler o arquivo de imagem.");
      }

      setLoadingStep("Processando recibo com Inteligência Artificial...");
      await new Promise(r => setTimeout(r, 300));
      setLoadingStep("Extraindo estabelecimento, CNPJ, valores, itens e formas de pagamento...");

      // Set a strict 35 second timeout on fetch using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 35000);

      let response;
      try {
        response = await fetch("/api/transactions/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: processedMimeType,
            isFast: isFast
          })
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error("O tempo limite da requisição foi excedido (Timeout de 35s).");
        }
        throw fetchErr;
      }

      clearTimeout(timeoutId);

      const result = await response.json().catch(() => null);

      if (!response.ok || !result || !result.success) {
        const errorDetail = result ? result.error : `Erro HTTP ${response.status}: ${response.statusText}`;
        const errorPayload = {
          message: errorDetail,
          status: result?.status || "HTTP_ERROR",
          code: result?.code || response.status,
          details: result?.details || ""
        };
        throw errorPayload;
      }

      const ocrData = result.data;
      setScanResult(ocrData);

      // Populate edit states from Gemini output
      setEstablishment(ocrData.establishment || '');
      setCnpj(ocrData.cnpj || '');
      setTime(ocrData.time || '');
      setPaymentMethod(ocrData.paymentMethod || '');
      setAmount(ocrData.total !== null && ocrData.total !== undefined ? String(ocrData.total) : '');
      setCategory(ocrData.category || 'Alimentação');
      setSubcategory(ocrData.subcategory || 'Outros');
      setDate(ocrData.date || new Date().toISOString().split('T')[0]);
      setItems(ocrData.items || []);
      setDescription(ocrData.description || '');

    } catch (err: any) {
      console.error("Gemini Cloud scan failed:", err);
      setScanResult(null); // Clear previous or mock results completely
      
      const fullMessage = err.status 
        ? `${err.message} (Status: ${err.status}, Código: ${err.code})`
        : err.message || "Erro desconhecido ao escanear nota fiscal.";
        
      setError(`Falha no Escaneamento da Nota: ${fullMessage}`);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleConfirmScan = () => {
    if (!establishment || !amount || Number(amount) <= 0) return;

    onAddScannedTransaction({
      description: establishment,
      amount: Number(amount),
      category,
      subcategory,
      date,
      type: 'despesa',
      tags: ['IA-Scan', ...items.slice(0, 2).map(i => i.split(' ')[0].toLowerCase())],
      confidence: scanResult?.confidence || 90,
      items: items,
      cnpj: cnpj || undefined,
      time: time || undefined,
      paymentMethod: paymentMethod || undefined
    });

    // Clear and success message
    setSuccessMsg("Lançamento via IA adicionado com sucesso!");
    setFile(null);
    setPreviewUrl(null);
    setScanResult(null);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div id="receipt-scanner" className="space-y-8 animate-fade-in max-w-4xl mx-auto text-neutral-200">
      {/* Top Description */}
      <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            Escanear Notas & Recibos com IA
          </h2>
          <p className="text-neutral-450 text-xs">Tire foto ou arraste notas fiscais para classificação automática com o modelo Gemini.</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2.5 text-xs animate-slide-up">
          <Check className="w-4 h-4 text-emerald-450" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Upload & Action Container */}
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Modo de Processamento
              </span>
              <span className="text-[10px] text-neutral-450 font-medium">Escolha a velocidade</span>
            </div>
            <div className="flex bg-neutral-950/80 p-1 rounded-xl border border-neutral-850">
              <button
                type="button"
                onClick={() => setScanMode('instant')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  scanMode === 'instant'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white bg-transparent'
                }`}
              >
                ⚡ Instantâneo (Fast)
              </button>
              <button
                type="button"
                onClick={() => setScanMode('gemini')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  scanMode === 'gemini'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white bg-transparent'
                }`}
              >
                🤖 IA Gemini (Nuvem)
              </button>
            </div>
            <p className="text-[10px] text-neutral-450 leading-normal font-medium">
              {scanMode === 'instant' 
                ? "⚡ Real: Processa sua imagem real em 1-2 segundos usando o modelo ultraleve Gemini 3.1 Flash-Lite."
                : "🤖 Real: Processa sua imagem real usando o modelo Gemini Flash avançado para maior detalhamento."}
            </p>
          </div>

          {/* Drag & Drop Area */}
          {!previewUrl ? (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={handleTriggerUpload}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-64 ${
                dragActive 
                  ? "border-emerald-500 bg-emerald-500/5" 
                  : "border-neutral-850 bg-neutral-900/20 hover:border-neutral-700"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="p-4 bg-neutral-950 text-emerald-400 border border-neutral-850 rounded-full mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white">Arraste a nota fiscal aqui</h4>
              <p className="text-xs text-neutral-450 mt-1">ou clique para selecionar arquivo (JPEG, PNG)</p>
            </div>
          ) : (
            /* Selected File Preview */
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Visualização da Nota
                </span>
                <button 
                  onClick={() => { setFile(null); setPreviewUrl(null); setScanResult(null); }}
                  className="text-xs text-rose-450 hover:text-rose-400 font-bold transition-colors"
                >
                  Substituir Foto
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden max-h-72 bg-neutral-950/80 flex items-center justify-center border border-neutral-850 p-2">
                <img src={previewUrl} alt="Receipt preview" className="max-h-72 object-contain rounded-md" referrerPolicy="no-referrer" />
              </div>

              {/* Action Buttons */}
              {!scanResult && !loading && (
                <button
                  onClick={handleScanReceipt}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Analisar Nota com IA
                </button>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-450" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Animation Card */}
          {loading && (
            <div className="bg-neutral-900/40 p-8 rounded-2xl border border-neutral-800/80 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 border-4 border-neutral-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
              </div>
              <p className="text-white font-bold text-sm">Escaneando...</p>
              <p className="text-neutral-450 text-xs animate-pulse">{loadingStep}</p>
            </div>
          )}
        </div>

        {/* Right Side: Scanned Results & Confirmations */}
        <div>
          {scanResult ? (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/80 shadow-xl space-y-5 animate-slide-up">
              <div className="flex justify-between items-center border-b border-neutral-850 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-450" />
                  Extração Inteligente Realizada
                </h3>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-sm">
                  Confiança: {scanResult.confidence}%
                </span>
              </div>

              {/* Interactive confirmation form */}
              <div className="space-y-4">
                {/* Establishment & CNPJ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Estabelecimento</label>
                    <input
                      type="text"
                      value={establishment}
                      onChange={e => setEstablishment(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm font-semibold text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">CNPJ</label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={e => setCnpj(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm font-semibold text-white focus:outline-hidden focus:border-emerald-500"
                      placeholder="Não detectado"
                    />
                  </div>
                </div>

                {/* Amount & Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm font-mono font-bold text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Data da Compra</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Hora da Compra</label>
                    <input
                      type="text"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>

                {/* Category & Subcategory & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Categoria</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Subcategoria</label>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={e => setSubcategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Forma de Pagamento</label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                      placeholder="Não detectada"
                    />
                  </div>
                </div>

                {/* Scanned Items list */}
                {items.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase block">Itens Individuais Detectados</label>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((it, idx) => (
                        <span key={idx} className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-[10px] px-2 py-0.5 rounded-xs">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description summary */}
                {description && (
                  <div className="bg-neutral-950/60 p-3 border border-neutral-850 rounded-lg text-xs text-neutral-350">
                    <strong>Resumo IA:</strong> {description}
                  </div>
                )}

                {/* Confirm Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setScanResult(null)}
                    className="flex-1 py-2 border border-neutral-800 hover:bg-neutral-950 text-neutral-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Descartar / Refazer
                  </button>
                  <button
                    onClick={handleConfirmScan}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Gasto
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900/10 rounded-2xl border border-neutral-850 p-8 text-center min-h-[400px] flex flex-col justify-center items-center">
              <FileText className="w-16 h-16 text-neutral-800 mb-4" />
              <h4 className="text-neutral-400 font-bold text-sm">Pronto para digitalizar</h4>
              <p className="text-neutral-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                Insira a imagem de um comprovante fiscal à esquerda e clique em "Analisar Nota com IA" para processar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
