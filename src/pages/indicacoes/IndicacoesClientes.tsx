import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Users, Gift, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { format } from "date-fns";

interface RowData {
  id: string;
  nome: string;
  indicador_nome: string;
  plano_nome: string;
  created_at: string | null;
  ativo: boolean | null;
}

export default function Indicacoes() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filtered = rows.filter(
    (r) =>
      r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.indicador_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setSearchTerm("")}>Limpar</Button>
          </div>
        </div>
      </div>

      <div className="text-right text-sm text-muted-foreground">
        Mostrando {filtered.length} de {rows.length} registros.
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Nome</TableHead>
              <TableHead className="w-[20%]">Quem Indicou</TableHead>
              <TableHead className="w-[15%]">Registro</TableHead>
              <TableHead className="w-[30%]">Plano</TableHead>
              <TableHead className="w-[15%] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sky-400">{row.nome}</TableCell>
                  <TableCell className="text-sky-400">{row.indicador_nome}</TableCell>
                  <TableCell>
                    {row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell>{row.plano_nome}</TableCell>
                  <TableCell className="text-right">
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
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma indicação encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
