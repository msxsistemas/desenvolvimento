import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Construction } from "lucide-react";

export default function PagSeguro() {
  useEffect(() => {
    document.title = "PagSeguro - Gateway de Pagamentos | Gestor Tech Play";
  }, []);

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow" aria-label="Configuração do PagSeguro">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            <h1 className="text-base font-semibold tracking-tight">Configuração do PagSeguro</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configure seu gateway de pagamentos PagSeguro.</p>
        </div>
      </header>

      <main className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Construction className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Em Breve</CardTitle>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <CardDescription>
              A integração com o PagSeguro está em desenvolvimento e será disponibilizada em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve você poderá configurar o PagSeguro como gateway de pagamentos para seus clientes.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
