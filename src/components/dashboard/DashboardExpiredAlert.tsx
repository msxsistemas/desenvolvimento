import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  clientesVencidos: number;
}

export default function DashboardExpiredAlert({ clientesVencidos }: Props) {
  if (clientesVencidos === 0) return null;

  return (
    <Alert variant="destructive" className="bg-dashboard-red/10 border-dashboard-red/20">
      <AlertTriangle className="h-4 w-4 text-dashboard-red" />
      <AlertTitle className="text-dashboard-red">Clientes com plano vencido</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>Você tem {clientesVencidos} cliente(s) com plano vencido.</span>
        <Button variant="outline" size="sm" asChild className="border-dashboard-red/50 text-dashboard-red hover:bg-dashboard-red/10">
          <Link to="/clientes">Ver clientes</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
