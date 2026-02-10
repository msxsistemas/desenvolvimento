import ServidorPageLayout from "@/components/servidores/ServidorPageLayout";
import MundoGFClients from "@/components/servidores/MundoGFClients";
import { useServidorPage } from "@/hooks/useServidorPage";

export default function ServidorMundogf() {
  const { panels } = useServidorPage("mundogf");

  return (
    <div className="space-y-4">
      <ServidorPageLayout providerId="mundogf" title="Painel MundoGF" />
      <div className="px-0">
        <MundoGFClients panels={panels} />
      </div>
    </div>
  );
}
