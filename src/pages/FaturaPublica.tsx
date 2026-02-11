import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, CheckCircle, Clock, XCircle, Wallet, RefreshCw } from "lucide-react";
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

const POLL_INTERVAL = 5000; // 5 seconds

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

      // Detect transition to paid
      if (previousStatusRef.current === "pendente" && newFatura.status === "pago") {
        setJustPaid(true);
        toast({ title: "✅ Pagamento confirmado!", description: "Seu plano será renovado automaticamente." });
        // Stop polling
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

  // Initial fetch
  useEffect(() => {
    fetchFatura(false);
  }, [fetchFatura]);

  // Polling for status updates (only while pending)
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !fatura) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Fatura não encontrada</h2>
            <p className="text-sm text-muted-foreground mt-1">{error || "O link pode estar expirado ou inválido."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = fatura.status === "pago";
  const isPending = fatura.status === "pendente";
  const statusConfig = isPaid
    ? { icon: CheckCircle, label: "Pago", variant: "default" as const, color: "text-green-600" }
    : { icon: Clock, label: "Aguardando Pagamento", variant: "secondary" as const, color: "text-yellow-600" };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold">Fatura de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Renove seu plano de forma rápida e segura</p>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Detalhes</CardTitle>
              <Badge variant={statusConfig.variant}>
                <statusConfig.icon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                {statusConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{fatura.cliente_nome}</span>
            </div>
            {fatura.plano_nome && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium">{fatura.plano_nome}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="text-lg font-bold text-primary">
                R$ {Number(fatura.valor).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {!isPaid && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Pagar com PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Asaas PIX QR Code */}
              {fatura.pix_qr_code && (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <img
                      src={`data:image/png;base64,${fatura.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Escaneie o QR Code acima com seu app do banco
                  </p>
                </div>
              )}

              {/* Copia e Cola */}
              {fatura.pix_copia_cola && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">PIX Copia e Cola</label>
                  <div className="bg-muted rounded-md p-3 text-xs break-all font-mono max-h-24 overflow-y-auto">
                    {fatura.pix_copia_cola}
                  </div>
                  <Button
                    className="w-full"
                    variant={copied ? "secondary" : "default"}
                    onClick={() => handleCopy(fatura.pix_copia_cola!)}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" /> Copiar Código PIX
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* PIX Manual */}
              {fatura.gateway === "pix_manual" && fatura.pix_manual_key && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Chave PIX</span>
                  </div>
                  <div className="bg-muted rounded-md p-3 text-sm break-all font-mono">
                    {fatura.pix_manual_key}
                  </div>
                  <Button
                    className="w-full"
                    variant={copied ? "secondary" : "default"}
                    onClick={() => handleCopy(fatura.pix_manual_key!)}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" /> Copiar Chave PIX
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Envie o valor de <strong>R$ {Number(fatura.valor).toFixed(2)}</strong> para a chave acima
                  </p>
                </div>
              )}

              {/* No payment method */}
              {!fatura.pix_qr_code && !fatura.pix_copia_cola && fatura.gateway !== "pix_manual" && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhum método de pagamento configurado. Entre em contato com o vendedor.
                  </p>
                </div>
              )}

              {isPending && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Verificando pagamento automaticamente...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paid confirmation */}
        {isPaid && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 dark:text-green-400">Pagamento Confirmado!</h3>
              <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                Seu plano será renovado automaticamente. Obrigado!
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Fatura gerada em {new Date(fatura.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
