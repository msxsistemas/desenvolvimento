import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogSistema {
  id: string;
  componente: string;
  evento: string;
  nivel: string;
  created_at: string;
}

const getBadgeVariant = (nivel: string) => {
  switch (nivel) {
    case "success": return "default";
    case "error": return "destructive";
    case "warning": return "secondary";
    default: return "outline";
  }
};

const getNivelLabel = (nivel: string) => {
  switch (nivel) {
    case "success": return "OK";
    case "error": return "ERROR";
    case "warning": return "WARN";
    default: return "INFO";
  }
};

export default function LogsSistema() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["logs-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_sistema")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as LogSistema[];
    },
  });

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Logs do Sistema</h1>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Eventos do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead className="w-[140px]">Componente</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="w-[100px]">Nível</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {log.componente}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.evento}</TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(log.nivel)}>
                          {getNivelLabel(log.nivel)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
              <p className="text-sm text-muted-foreground/70">
                Os eventos do sistema aparecerão aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
