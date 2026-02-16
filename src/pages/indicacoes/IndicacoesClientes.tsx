import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Users, Gift, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";

interface RowData {
  id: string;
  nome: string;
  indicador_nome: string;
  plano_nome: string;
  created_at: string | null;
  ativo: boolean | null;
}

const ITEMS_PER_PAGE = 10;

export default function Indicacoes() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [periodo, setPeriodo] = useState("todos");
  const { userId } = useCurrentUser();

  useEffect(() => { document.title = "Indicações | Tech Play"; }, []);

  useEffect(() => {
    if (userId) fetchIndicacoes();
  }, [userId]);

  const fetchIndicacoes = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Get clients with indicador filled
      const { data: clientes, error } = await supabase
        .from("clientes")
        .select("id, nome, indicador, plano, created_at, ativo")
        .eq("user_id", userId)
        .not("indicador", "is", null)
        .not("indicador", "eq", "");

      if (error) throw error;
      if (!clientes?.length) { setRows([]); setLoading(false); return; }

      // Collect unique indicador IDs and plano IDs to resolve names
      const indicadorIds = [...new Set(clientes.map(c => c.indicador).filter(Boolean))] as string[];
      const planoIds = [...new Set(clientes.map(c => c.plano).filter(Boolean))] as string[];

      // Fetch indicador names (they are client IDs)
      const indicadorMap = new Map<string, string>();
      if (indicadorIds.length) {
        const { data: indicadores } = await supabase
          .from("clientes")
          .select("id, nome")
          .in("id", indicadorIds);
        indicadores?.forEach(i => indicadorMap.set(i.id, i.nome));
      }

      // Fetch plano names
      const planoMap = new Map<string, string>();
      if (planoIds.length) {
        const { data: planos } = await supabase
          .from("planos")
          .select("id, nome")
          .in("id", planoIds);
        planos?.forEach(p => planoMap.set(p.id, p.nome));
      }

      const resolved: RowData[] = clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        indicador_nome: indicadorMap.get(c.indicador!) || c.indicador || "-",
        plano_nome: planoMap.get(c.plano!) || c.plano || "-",
        created_at: c.created_at,
        ativo: c.ativo,
      }));

      setRows(resolved);
    } catch (error) {
      console.error("Erro ao carregar indicações:", error);
      toast.error("Erro ao carregar indicações");
    } finally {
      setLoading(false);
    }
  };

  const getDateFrom = () => {
    const now = new Date();
    switch (periodo) {
      case "7dias": return subDays(now, 7);
      case "15dias": return subDays(now, 15);
      case "30dias": return subDays(now, 30);
      case "mes": return startOfMonth(now);
      case "ano": return startOfYear(now);
      default: return null;
    }
  };

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.indicador_nome.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    const dateLimit = getDateFrom();
    if (dateLimit && r.created_at) {
      matchesDate = new Date(r.created_at) >= dateLimit;
    } else if (dateLimit && !r.created_at) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedRows = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, periodo]);

  const totalIndicadores = new Set(rows.map(r => r.indicador_nome)).size;
  const totalIndicados = rows.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Indicações</h1>
          <p className="text-sm text-muted-foreground">Clientes indicados e seus indicadores</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Indicadores</p>
              <p className="text-2xl font-bold text-foreground">{totalIndicadores}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Indicados</p>
              <p className="text-2xl font-bold text-foreground">{totalIndicados}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Gift className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Bônus Acumulado</p>
              <p className="text-2xl font-bold text-foreground">R$ 0,00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Busca</Label>
            <Input placeholder="Nome ou indicador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="15dias">Últimos 15 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="ano">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { setSearchTerm(""); setPeriodo("todos"); }}>Limpar</Button>
          </div>
        </div>
      </div>

      <div className="text-right text-sm text-muted-foreground">
        Mostrando {paginatedRows.length} de {filtered.length} registros.
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="px-6 py-3">Indicado</TableHead>
              <TableHead className="px-6 py-3">Quem Indicou</TableHead>
              <TableHead className="px-6 py-3">Registro</TableHead>
              <TableHead className="px-6 py-3">Plano</TableHead>
              <TableHead className="px-6 py-3 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length ? (
              paginatedRows.map((row) => (
                <TableRow key={row.id} className="border-border">
                  <TableCell className="px-6 py-4 font-medium text-blue-600 dark:text-blue-500">{row.nome}</TableCell>
                  <TableCell className="px-6 py-4 text-blue-600 dark:text-blue-500">{row.indicador_nome}</TableCell>
                  <TableCell className="px-6 py-4">
                    {row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4">{row.plano_nome}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover indicação</AlertDialogTitle>
                          <AlertDialogDescription>
                            Para remover a indicação, edite o cliente e limpe o campo "Indicador".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Entendi</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma indicação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
