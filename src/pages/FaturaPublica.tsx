import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, CheckCircle, Clock, XCircle, Wallet, RefreshCw, Receipt, User, CreditCard, ShieldCheck } from "lucide-react";
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
  const [justPaid, setJustPaid] = useState(false);
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
        setJustPaid(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Carregando fatura...</p>
        </div>
      </div>
    );
  }

  if (error || !fatura) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-sm w-full bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Fatura não encontrada</h2>
          <p className="text-sm text-slate-400 mt-2">{error || "O link pode estar expirado ou inválido."}</p>
        </div>
      </div>
    );
  }

  const isPaid = fatura.status === "pago";
  const isPending = fatura.status === "pendente";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="max-w-lg w-full space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 backdrop-blur border border-slate-700/40 rounded-full px-4 py-1.5 mb-3">
            <Receipt className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Fatura de Pagamento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            R$ {Number(fatura.valor).toFixed(2)}
          </h1>
          <p className="text-sm text-slate-400">
            {fatura.plano_nome || "Pagamento"} • {fatura.cliente_nome}
          </p>
        </div>

        {/* Status Banner */}
        {isPaid ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-emerald-300 text-lg">Pagamento Confirmado!</h3>
            <p className="text-sm text-emerald-400/80 mt-1">
              Seu plano será renovado automaticamente. Obrigado!
            </p>
            {fatura.paid_at && (
              <p className="text-xs text-emerald-500/60 mt-3">
                Pago em {new Date(fatura.paid_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300">Aguardando pagamento</p>
              <p className="text-xs text-amber-400/70">Realize o pagamento para renovar seu plano</p>
            </div>
          </div>
        )}

        {/* Details Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700/40">
            <h3 className="text-sm font-semibold text-slate-200">Detalhes da Fatura</h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Cliente</span>
              </div>
              <span className="text-sm font-medium text-white">{fatura.cliente_nome}</span>
            </div>
            {fatura.plano_nome && (
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-400">Plano</span>
                </div>
                <span className="text-sm font-medium text-white">{fatura.plano_nome}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Valor</span>
              </div>
              <span className="text-base font-bold text-emerald-400">
                R$ {Number(fatura.valor).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Data</span>
              </div>
              <span className="text-sm text-slate-300">
                {new Date(fatura.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {!isPaid && (
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/40 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Pagar com PIX</h3>
            </div>
            <div className="p-5 space-y-4">

              {/* QR Code */}
              {fatura.pix_qr_code && (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img
                      src={`data:image/png;base64,${fatura.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="w-52 h-52"
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Escaneie o QR Code com o app do seu banco
                  </p>
                </div>
              )}

              {/* Copia e Cola */}
              {fatura.pix_copia_cola && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PIX Copia e Cola
                  </label>
                  <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 text-xs break-all font-mono text-slate-300 max-h-20 overflow-y-auto">
                    {fatura.pix_copia_cola}
                  </div>
                  <Button
                    className={`w-full h-11 font-medium text-sm rounded-lg transition-all ${
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    }`}
                    onClick={() => handleCopy(fatura.pix_copia_cola!)}
                  >
                    {copied ? (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copiar Código PIX</>
                    )}
                  </Button>
                </div>
              )}

              {/* PIX Manual */}
              {fatura.gateway === "pix_manual" && fatura.pix_manual_key && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-slate-200">Chave PIX</span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3.5 text-sm break-all font-mono text-slate-300">
                    {fatura.pix_manual_key}
                  </div>
                  <Button
                    className={`w-full h-11 font-medium text-sm rounded-lg transition-all ${
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    }`}
                    onClick={() => handleCopy(fatura.pix_manual_key!)}
                  >
                    {copied ? (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Copiado!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copiar Chave PIX</>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 text-center">
                    Envie <strong className="text-emerald-400">R$ {Number(fatura.valor).toFixed(2)}</strong> para a chave acima
                  </p>
                </div>
              )}

              {/* No payment method */}
              {!fatura.pix_qr_code && !fatura.pix_copia_cola && fatura.gateway !== "pix_manual" && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                    <QrCode className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400">
                    Nenhum método de pagamento configurado.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Entre em contato com o vendedor.
                  </p>
                </div>
              )}

              {/* Polling indicator */}
              {isPending && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-700/30">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Verificando pagamento automaticamente...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 pb-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Pagamento seguro e verificado</span>
        </div>
      </div>
    </div>
  );
}
