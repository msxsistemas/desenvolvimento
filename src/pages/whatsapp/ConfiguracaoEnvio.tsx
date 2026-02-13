import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Timer,
  TimerOff,
  Layers,
  CirclePause,
  CalendarClock,
  
  Save,
  RotateCcw,
  Clock,
  AlertTriangle,
  Power,
} from "lucide-react";

interface EnvioConfig {
  tempoMinimo: string;
  tempoMaximo: string;
  limiteLote: string;
  pausaProlongada: string;
  limiteDiario: string;
  variarIntervalo: boolean;
  configuracoesAtivas: boolean;
}

const DEFAULT_CONFIG: EnvioConfig = {
  tempoMinimo: "10",
  tempoMaximo: "15",
  limiteLote: "10",
  pausaProlongada: "15",
  limiteDiario: "",
  variarIntervalo: true,
  configuracoesAtivas: true,
};

const MIN_TEMPO = 10;
const MIN_TEMPO_MAX = 15;
const STORAGE_KEY = "whatsapp_envio_config";

function ValidationWarning({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function ConfiguracaoEnvio() {
  const [config, setConfig] = useState<EnvioConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          tempoMinimo: String(parsed.tempoMinimo ?? DEFAULT_CONFIG.tempoMinimo),
          tempoMaximo: String(parsed.tempoMaximo ?? DEFAULT_CONFIG.tempoMaximo),
          limiteLote: String(parsed.limiteLote ?? DEFAULT_CONFIG.limiteLote),
          pausaProlongada: String(parsed.pausaProlongada ?? DEFAULT_CONFIG.pausaProlongada),
          limiteDiario: String(parsed.limiteDiario ?? ""),
          configuracoesAtivas: parsed.configuracoesAtivas ?? true,
        });
      } catch {
        // ignore
      }
    }
  }, []);

  const num = (v: string) => Number(v) || 0;

  const tempoMinimoWarn =
    config.tempoMinimo !== "" && num(config.tempoMinimo) < MIN_TEMPO
      ? `O valor tem de ser superior ou igual a ${MIN_TEMPO}.`
      : config.tempoMinimo !== "" && num(config.tempoMinimo) > 120
        ? "O valor máximo é 120 segundos."
        : null;

  const tempoMaximoWarn =
    config.tempoMaximo !== "" && num(config.tempoMaximo) < MIN_TEMPO_MAX
      ? `O valor tem de ser superior ou igual a ${MIN_TEMPO_MAX}.`
      : config.tempoMaximo !== "" && num(config.tempoMaximo) > 120
        ? "O valor máximo é 120 segundos."
        : config.tempoMaximo !== "" && config.tempoMinimo !== "" && num(config.tempoMaximo) < num(config.tempoMinimo)
          ? "Deve ser maior ou igual ao tempo mínimo."
          : null;

  const limiteLoteWarn =
    config.limiteLote !== "" && num(config.limiteLote) < 1
      ? "O valor mínimo é 1."
      : null;

  const pausaWarn =
    config.pausaProlongada !== "" && num(config.pausaProlongada) < 1
      ? "O valor mínimo é 1 segundo."
      : config.pausaProlongada !== "" && num(config.pausaProlongada) > 120
        ? "O valor máximo é 120 segundos."
        : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.configuracoesAtivas && (tempoMinimoWarn || tempoMaximoWarn || limiteLoteWarn || pausaWarn)) {
      toast.error("Corrija os erros de validação antes de salvar");
      return;
    }

    const toSave = {
      tempoMinimo: num(config.tempoMinimo),
      tempoMaximo: num(config.tempoMaximo),
      limiteLote: num(config.limiteLote),
      pausaProlongada: num(config.pausaProlongada),
      limiteDiario: config.limiteDiario,
      variarIntervalo: config.variarIntervalo,
      configuracoesAtivas: config.configuracoesAtivas,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    toast.success("Configurações salvas com sucesso!");
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Configurações restauradas ao padrão!");
  };

  const calcEstimatedTime = () => {
    const min = num(config.tempoMinimo);
    const max = num(config.tempoMaximo);
    const avgInterval = (min + max) / 2;
    const batches = Math.ceil(100 / (num(config.limiteLote) || 1));
    const pauses = batches - 1;
    const totalSeconds = 100 * avgInterval + pauses * num(config.pausaProlongada);
    const minutes = Math.round(totalSeconds / 60);
    return `~${minutes} minutos`;
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Configurações de Envio</h1>
          <p className="text-sm text-muted-foreground">Configure os intervalos e limites para envio de mensagens pelo WhatsApp</p>
        </div>
      </header>

      {/* Toggle Configurações Ativas */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
        <Switch
          checked={config.configuracoesAtivas}
          onCheckedChange={(v) => setConfig((c) => ({ ...c, configuracoesAtivas: v }))}
        />
        <div className="flex items-center gap-2">
          <Power className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Configurações Ativas</p>
            <p className="text-xs text-muted-foreground">
              Quando desativado, serão usados os valores padrão do sistema.
            </p>
          </div>
        </div>
      </div>

      <form id="config-envio-form" onSubmit={handleSave} className={!config.configuracoesAtivas ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
        {/* Intervalos de Envio */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Intervalos de Envio</h2>

          {/* Tempo Mínimo e Máximo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4 text-primary" />
                Tempo Mínimo (segundos) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="number"
                min={MIN_TEMPO}
                max={120}
                value={config.tempoMinimo}
                onChange={(e) => setConfig((c) => ({ ...c, tempoMinimo: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Intervalo mínimo entre mensagens ({MIN_TEMPO}-120 segundos)
              </p>
              <ValidationWarning message={tempoMinimoWarn} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <TimerOff className="h-4 w-4 text-primary" />
                Tempo Máximo (segundos) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="number"
                min={MIN_TEMPO_MAX}
                max={120}
                value={config.tempoMaximo}
                onChange={(e) => setConfig((c) => ({ ...c, tempoMaximo: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Intervalo máximo entre mensagens ({MIN_TEMPO_MAX}-120 segundos)
              </p>
              <ValidationWarning message={tempoMaximoWarn} />
            </div>
          </div>

          {/* Limite de lote e pausa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-primary" />
                Limite de Mensagens por Lote <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="number"
                min={1}
                value={config.limiteLote}
                onChange={(e) => setConfig((c) => ({ ...c, limiteLote: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                A cada X mensagens enviadas, o sistema irá pausar
              </p>
              <ValidationWarning message={limiteLoteWarn} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <CirclePause className="h-4 w-4 text-destructive" />
                Pausa Prolongada (segundos) <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                type="number"
                min={1}
                max={120}
                value={config.pausaProlongada}
                onChange={(e) => setConfig((c) => ({ ...c, pausaProlongada: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Tempo de pausa após atingir o limite do lote (máx. 2 minutos)
              </p>
              <ValidationWarning message={pausaWarn} />
            </div>
          </div>

          {/* Limite diário e variar intervalo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" />
                Limite Diário de Mensagens
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="Sem limite"
                value={config.limiteDiario}
                onChange={(e) => setConfig((c) => ({ ...c, limiteDiario: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para não limitar (opcional)
              </p>
            </div>

          </div>
        </div>

        {/* Prévia de Tempo Estimado */}
        <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Prévia de Tempo Estimado
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-primary">
                {`${config.tempoMinimo || 0}s - ${config.tempoMaximo || 0}s`}
              </p>
              <p className="text-xs text-muted-foreground">Intervalo entre mensagens</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {config.limiteLote || 0} mensagens
              </p>
              <p className="text-xs text-muted-foreground">Antes da pausa</p>
            </div>
            <div>
              <p className="text-xl font-bold text-destructive">
                {config.pausaProlongada || 0}s
              </p>
              <p className="text-xs text-muted-foreground">Pausa prolongada</p>
            </div>
          </div>

          <div className="w-full h-1 bg-primary/20 rounded-full">
            <div className="h-full bg-primary rounded-full w-full" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <Clock className="inline h-3 w-3 mr-1" />
            Tempo estimado para 100 mensagens:{" "}
            <span className="text-primary font-semibold">{calcEstimatedTime()}</span>
          </p>
        </div>
      </form>

      {/* Botões */}
      <div className="flex justify-center gap-4">
        <Button type="submit" form="config-envio-form" className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Restaurar Padrão
        </Button>
      </div>
    </main>
  );
}
