import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, CheckCircle, XCircle, Wallet, RefreshCw, QrCode, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Fatura {
  id: string;
  cliente_nome: string;
  plano_nome: string | null;
  valor: number;
  status: string;
  gateway: string | null;
  pix_qr_code: string | null;
  pix_copia_cola: string | null;
  pix_manual_key: string | null;
  paid_at: string | null;
  created_at: string;
}

const POLL_INTERVAL = 5000;

export default function FaturaPublica() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStatusRef = useRef<string | null>(null);

  const fetchFatura = useCallback(async (isPolling = false) => {
    if (!id) return;
    try {
      const resp = await fetch(
        `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/generate-fatura`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-fatura", fatura_id: id }),
        }
      );
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        if (!isPolling) setError(data.error || "Fatura não encontrada");
        return;
      }
      const newFatura = data.fatura as Fatura;

      if (previousStatusRef.current === "pendente" && newFatura.status === "pago") {
        toast({ title: "✅ Pagamento confirmado!", description: "Seu plano será renovado automaticamente." });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }

      previousStatusRef.current = newFatura.status;
      setFatura(newFatura);
    } catch {
      if (!isPolling) setError("Erro ao carregar fatura");
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchFatura(false);
  }, [fetchFatura]);

  useEffect(() => {
    if (!fatura || fatura.status === "pago") return;
    intervalRef.current = setInterval(() => {
      fetchFatura(true);
    }, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fatura?.status, fetchFatura]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleGeneratePix = async () => {
    if (!id) return;
    setGeneratingPix(true);
    try {
      const resp = await fetch(
        `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/generate-fatura`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate-pix", fatura_id: id }),
        }
      );
      const data = await resp.json();
      if (data.success && data.fatura) {
        setFatura(data.fatura as Fatura);
        toast({ title: "✅ PIX gerado!", description: "QR Code e código disponíveis para pagamento." });
      } else {
        toast({ title: "Erro", description: data.error || "Não foi possível gerar o PIX.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao gerar PIX. Tente novamente.", variant: "destructive" });
    } finally {
      setGeneratingPix(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8edf2]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#3b9ede] border-t-transparent" />
          <p className="text-slate-500 text-sm">Carregando fatura...</p>
        </div>
      </div>
    );
  }

  if (error || !fatura) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8edf2] p-4">
        <div className="max-w-sm w-full bg-white rounded-lg p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Fatura não encontrada</h2>
          <p className="text-sm text-slate-500 mt-2">{error || "O link pode estar expirado ou inválido."}</p>
        </div>
      </div>
    );
  }

  const isPaid = fatura.status === "pago";
  const isPending = fatura.status === "pendente";
  const statusLabel = isPaid ? "PAGO" : "EM ABERTO";
  const hasPix = fatura.pix_qr_code || fatura.pix_copia_cola || (fatura.gateway === "pix_manual" && fatura.pix_manual_key);
  const valorFormatted = Number(fatura.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[#e8edf2] py-6 px-4 sm:py-10 print:bg-white print:py-0">
      <div className="max-w-[620px] mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden relative print:shadow-none">

          {/* Status Ribbon */}
          <div className="absolute top-0 right-0 overflow-hidden w-28 h-28 pointer-events-none z-10">
            <div className={`${isPaid ? "bg-emerald-500" : "bg-red-500"} text-white text-[11px] font-bold tracking-wider text-center py-1.5 w-40 absolute top-[26px] right-[-40px] rotate-45 shadow-md`}>
              {statusLabel}
            </div>
          </div>

          {/* Blue Header */}
          <div className="bg-[#3b9ede] px-6 py-8 text-center border-4 border-[#3b9ede] rounded-t-lg">
            <div className="border-2 border-white/30 rounded-lg py-6 px-4">
              <h1 className="text-white text-3xl font-bold tracking-wide">Fatura</h1>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 py-6 space-y-5">

            {/* Cliente Section */}
            <div>
              <p className="text-xs text-slate-400 italic mb-0.5">Cliente</p>
              <p className="text-base font-bold text-slate-800">{fatura.cliente_nome}</p>
            </div>

            <hr className="border-slate-200" />

            {/* Empresa / Fatura Info */}
            <div>
              <p className="text-xs text-slate-400 italic mb-0.5">Empresa</p>
              <p className="text-base font-bold text-red-500">Fatura: {fatura.id.slice(0, 10).toUpperCase()}</p>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                <p>Data: {new Date(fatura.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200">
                <thead>
                  <tr className="bg-[#3b9ede] text-white">
                    <th className="text-left px-3 py-2.5 font-semibold text-xs">Descrição</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs">Valor</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs">Desconto</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-3 text-slate-700 text-sm">{fatura.plano_nome || "Pagamento"}</td>
                    <td className="px-3 py-3 text-center text-slate-600">R$ {valorFormatted}</td>
                    <td className="px-3 py-3 text-center text-slate-600">R$ 0,00</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-800">R$ {valorFormatted}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="space-y-1 text-sm">
              <p className="text-slate-700"><strong>Total:</strong> R$ {valorFormatted}</p>
              <p className="text-slate-700"><strong>Vencimento:</strong> {new Date(fatura.created_at).toLocaleDateString("pt-BR")}</p>
              <p className="text-slate-700">
                <strong>Fatura:</strong>{" "}
                <span className={isPaid ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                  {isPaid ? "Pago" : "Em aberto"}
                </span>
              </p>
              {fatura.paid_at && (
                <p className="text-slate-700"><strong>Pago em:</strong> {new Date(fatura.paid_at).toLocaleString("pt-BR")}</p>
              )}
            </div>

            {/* PIX Payment Modal */}
            <Dialog open={showPix} onOpenChange={setShowPix}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-800">PIX AUTOMÁTICO</DialogTitle>
                  <p className="text-sm text-red-500 font-medium">
                    Após confirmar o pagamento, clique no botão Fechar logo abaixo!
                  </p>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Gateway info */}
                  {fatura.gateway && fatura.gateway !== "pix_manual" && (
                    <div className="text-center text-sm text-slate-500">
                      <span className="font-medium capitalize">{fatura.gateway}</span>
                    </div>
                  )}

                  {/* QR Code */}
                  {fatura.pix_qr_code && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <img src={`data:image/png;base64,${fatura.pix_qr_code}`} alt="QR Code PIX" className="w-48 h-48" />
                      </div>
                      <p className="text-xs text-slate-400">Escaneie com o app do seu banco</p>
                    </div>
                  )}

                  {/* Copia e Cola */}
                  {fatura.pix_copia_cola && (
                    <div className="space-y-2">
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs break-all font-mono text-slate-600 max-h-24 overflow-y-auto">
                        {fatura.pix_copia_cola}
                      </div>
                      <Button
                        className={`w-full h-10 text-sm font-medium ${copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#3b9ede] hover:bg-[#2d8ace]"} text-white`}
                        onClick={() => handleCopy(fatura.pix_copia_cola!)}
                      >
                        {copied ? <><CheckCircle className="h-4 w-4 mr-1.5" /> Copiado!</> : <><Copy className="h-4 w-4 mr-1.5" /> PIX Copia e Cola</>}
                      </Button>
                    </div>
                  )}

                  {/* PIX Manual */}
                  {fatura.gateway === "pix_manual" && fatura.pix_manual_key && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-[#3b9ede]" />
                        <span className="text-sm font-semibold text-slate-600">Chave PIX</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm break-all font-mono text-slate-700">
                        {fatura.pix_manual_key}
                      </div>
                      <Button
                        className={`w-full h-10 text-sm font-medium ${copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#3b9ede] hover:bg-[#2d8ace]"} text-white`}
                        onClick={() => handleCopy(fatura.pix_manual_key!)}
                      >
                        {copied ? <><CheckCircle className="h-4 w-4 mr-1.5" /> Copiado!</> : <><Copy className="h-4 w-4 mr-1.5" /> Copiar Chave PIX</>}
                      </Button>
                      <p className="text-xs text-slate-400 text-center">
                        Envie <strong className="text-[#3b9ede]">R$ {valorFormatted}</strong> para a chave acima
                      </p>
                    </div>
                  )}

                  {!fatura.pix_qr_code && !fatura.pix_copia_cola && !(fatura.gateway === "pix_manual" && fatura.pix_manual_key) && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <p className="text-sm text-slate-500 text-center">Clique abaixo para gerar seu código PIX</p>
                      <Button
                        className="h-11 gap-2 text-sm px-8 bg-[#3b9ede] hover:bg-[#2d8ace] text-white"
                        onClick={handleGeneratePix}
                        disabled={generatingPix}
                      >
                        {generatingPix ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> Gerando PIX...</>
                        ) : (
                          <><QrCode className="h-4 w-4" /> Gerar PIX</>
                        )}
                      </Button>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Verificando pagamento automaticamente...</span>
                    </div>
                  )}

                  {/* Close button */}
                  <Button
                    variant="destructive"
                    className="w-full h-10"
                    onClick={() => setShowPix(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {!isPaid && isPending && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Verificando pagamento automaticamente...</span>
              </div>
            )}

            {/* Paid banner */}
            {isPaid && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-700 text-sm">Pagamento Confirmado</p>
                  <p className="text-xs text-emerald-600">Seu plano será renovado automaticamente.</p>
                </div>
              </div>
            )}
          </div>

           {/* Footer */}
           <div className="border-t border-slate-200 px-6 sm:px-8 py-6 space-y-4">
             <p className="text-xs text-slate-400 italic text-center">
               Obrigado por escolher nossos serviços! Entre em contato conosco se tiver alguma dúvida.
             </p>

             {/* Action Buttons */}
             <div className="flex justify-center gap-3 print:hidden pt-2">
               <Button
                 variant="outline"
                 className="h-10 gap-2 text-sm rounded-full px-6"
                 onClick={() => window.print()}
               >
                 <Printer className="h-4 w-4" />
                 Imprimir
               </Button>
               
               {!isPaid && (
                 <Button
                    className="h-10 gap-2 text-sm rounded-full px-6 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => setShowPix(!showPix)}
                  >
                    <QrCode className="h-4 w-4" />
                    Pagar com PIX
                  </Button>
                )}

               {isPaid && (
                 <Button
                   disabled
                   className="h-10 gap-2 text-sm rounded-full px-6 bg-emerald-500 text-white"
                 >
                   <CheckCircle className="h-4 w-4" />
                   Pagamento Confirmado
                 </Button>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
