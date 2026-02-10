import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/config/provedores";
import {
  Users, CreditCard, RefreshCw, Search, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

interface MundoGFClient {
  user_id: string;
  username: string;
  password: string;
  status: string;
  expire: string;
  max_cons: number;
  online: number;
  notes: string;
  created_at: string;
}

interface MundoGFClientsProps {
  panels: Panel[];
}

export default function MundoGFClients({ panels }: MundoGFClientsProps) {
  const activePanels = panels.filter(p => p.status === "Ativo");
  const [selectedPanelId, setSelectedPanelId] = useState<string>("");
  const [credits, setCredits] = useState<string | null>(null);
  const [clients, setClients] = useState<MundoGFClient[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"username" | "expire" | "status">("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Renewal modal
  const [renewModal, setRenewModal] = useState<{ open: boolean; client: MundoGFClient | null }>({ open: false, client: null });
  const [renewDuration, setRenewDuration] = useState("1");
  const [renewUnit, setRenewUnit] = useState("months");
  const [renewing, setRenewing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (activePanels.length > 0 && !selectedPanelId) {
      setSelectedPanelId(activePanels[0].id);
    }
  }, [activePanels, selectedPanelId]);

  const fetchCredits = async (panelId: string) => {
    setLoadingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke("mundogf-renew", {
        body: { action: "get_credits", panelId },
      });
      if (error) throw error;
      setCredits(data?.credits ?? "N/D");
    } catch {
      setCredits("Erro");
    } finally {
      setLoadingCredits(false);
    }
  };

  const fetchClients = async (panelId: string) => {
    setLoading(true);
    setClients([]);
    try {
      const { data, error } = await supabase.functions.invoke("mundogf-renew", {
        body: { action: "list_clients", panelId },
      });
      if (error) throw error;
      if (data?.success) {
        setClients(data.clients || []);
        setTotalClients(data.total || data.clients?.length || 0);
      } else {
        toast({ title: "Erro", description: data?.error || "Falha ao carregar clientes" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadPanel = (panelId: string) => {
    setSelectedPanelId(panelId);
    fetchCredits(panelId);
    fetchClients(panelId);
  };

  const handleRenew = async () => {
    if (!renewModal.client || !selectedPanelId) return;
    setRenewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mundogf-renew", {
        body: {
          action: "renew_client",
          panelId: selectedPanelId,
          clientUserId: renewModal.client.user_id,
          duration: parseInt(renewDuration),
          durationIn: renewUnit,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Renovado!", description: data.message || `Cliente ${renewModal.client.username} renovado com sucesso` });
        setRenewModal({ open: false, client: null });
        // Refresh
        fetchClients(selectedPanelId);
        fetchCredits(selectedPanelId);
      } else {
        toast({ title: "Erro na renovação", description: data?.error || "Falha ao renovar" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setRenewing(false);
    }
  };

  // Filter & sort
  const filtered = clients
    .filter(c => {
      const term = searchTerm.toLowerCase();
      return !term || c.username.toLowerCase().includes(term) || c.notes?.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      const valA = a[sortField] || "";
      const valB = b[sortField] || "";
      return sortDir === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

  const isExpired = (expire: string) => {
    if (!expire) return false;
    try {
      return new Date(expire) < new Date();
    } catch { return false; }
  };

  const expiredCount = clients.filter(c => isExpired(c.expire)).length;
  const activeCount = clients.filter(c => !isExpired(c.expire)).length;

  if (activePanels.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Panel selector + load */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Gerenciar Clientes MundoGF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedPanelId} onValueChange={setSelectedPanelId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um painel" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {activePanels.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => loadPanel(selectedPanelId)}
              disabled={!selectedPanelId || loading}
              className="bg-primary"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Carregar Clientes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      {(credits !== null || clients.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold text-primary">
                {loadingCredits ? <Skeleton className="h-6 w-16 mx-auto" /> : credits}
              </div>
              <p className="text-[11px] text-muted-foreground">Créditos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{totalClients}</div>
              <p className="text-[11px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-xl font-bold text-green-500">{activeCount}</div>
              <p className="text-[11px] text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <div className="text-xl font-bold text-destructive">{expiredCount}</div>
              <p className="text-[11px] text-muted-foreground">Expirados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clients table */}
      {clients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Clientes ({filtered.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou notas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <SortHeader label="Usuário" field="username" current={sortField} dir={sortDir} onSort={(f) => { setSortField(f as any); setSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                    <SortHeader label="Expira" field="expire" current={sortField} dir={sortDir} onSort={(f) => { setSortField(f as any); setSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                    <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onSort={(f) => { setSortField(f as any); setSortDir(d => d === "asc" ? "desc" : "asc"); }} />
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Telas</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(client => {
                    const expired = isExpired(client.expire);
                    return (
                      <tr key={client.user_id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{client.username}</div>
                          {client.notes && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{client.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1 text-xs ${expired ? "text-destructive" : "text-foreground"}`}>
                            <Clock className="h-3 w-3" />
                            {client.expire || "N/D"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {expired ? (
                            <Badge variant="destructive" className="text-[10px]">Expirado</Badge>
                          ) : (
                            <Badge className="bg-green-500 hover:bg-green-500 text-[10px]">Ativo</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{client.max_cons || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-primary/50 text-primary hover:bg-primary/10"
                            onClick={() => {
                              setRenewDuration("1");
                              setRenewUnit("months");
                              setRenewModal({ open: true, client });
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Renovar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Autenticando no painel e carregando clientes...</span>
            </div>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Renew Modal */}
      <Dialog open={renewModal.open} onOpenChange={open => setRenewModal({ open, client: open ? renewModal.client : null })}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Renovar Cliente
            </DialogTitle>
          </DialogHeader>
          {renewModal.client && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <div className="text-sm"><span className="text-muted-foreground">Usuário:</span> <span className="font-medium text-foreground">{renewModal.client.username}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Expira:</span> <span className={`font-medium ${isExpired(renewModal.client.expire) ? "text-destructive" : "text-foreground"}`}>{renewModal.client.expire || "N/D"}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Telas:</span> <span className="font-medium text-foreground">{renewModal.client.max_cons || "-"}</span></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Duração da renovação</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    value={renewDuration}
                    onChange={e => setRenewDuration(e.target.value)}
                    className="w-20"
                  />
                  <Select value={renewUnit} onValueChange={setRenewUnit}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="days">Dias</SelectItem>
                      <SelectItem value="weeks">Semanas</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="years">Anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewModal({ open: false, client: null })} disabled={renewing}>
              Cancelar
            </Button>
            <Button onClick={handleRenew} disabled={renewing || !renewDuration || parseInt(renewDuration) < 1}>
              {renewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Renovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({ label, field, current, dir, onSort }: { label: string; field: string; current: string; dir: string; onSort: (f: string) => void }) {
  return (
    <th
      className="px-4 py-3 text-left text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {current === field && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}
