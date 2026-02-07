import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  clientesVencidos: number;
}

export default function DashboardExpiredAlert({ clientesVencidos }: Props) {
  if (clientesVencidos === 0) return null;

  return (
    <section className="rounded-xl bg-gradient-to-r from-[hsl(0,84%,55%)] to-[hsl(0,70%,45%)] p-5 text-white shadow-[0_8px_32px_hsl(0,84%,60%/0.25)]">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-6 w-6" />
        <div>
          <h3 className="text-lg font-bold">Clientes com Plano Vencido</h3>
          <p className="text-sm text-white/70">
            Informe seus clientes sobre o vencimento
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white/10 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left">
              <th className="px-4 py-3 font-medium text-white/80">Nome</th>
              <th className="px-4 py-3 font-medium text-white/80">Plano</th>
              <th className="px-4 py-3 font-medium text-white/80">Dias Vencido</th>
              <th className="px-4 py-3 font-medium text-white/80">Ação</th>
            </tr>
          </thead>
          <tbody>
            {clientesVencidos > 0 && (
              <tr className="border-b border-white/10">
                <td className="px-4 py-3" colSpan={3}>
                  <span className="text-white/60">{clientesVencidos} cliente(s) vencido(s)</span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Cobrar via WhatsApp
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
