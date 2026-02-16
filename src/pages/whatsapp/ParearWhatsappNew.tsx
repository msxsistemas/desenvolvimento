import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, Crown, Zap, QrCode, LogOut } from "lucide-react";
import { useEvolutionAPISimple } from "@/hooks/useEvolutionAPISimple";
import { Badge } from "@/components/ui/badge";

export default function ParearWhatsappNew() {
  const evolution = useEvolutionAPISimple();
  const { session, connecting, connect, disconnect, isConnected, hydrated, checkStatus } = evolution;

  useEffect(() => {
    document.title = "Parear WhatsApp | Gestor MSX";
  }, []);

  return (
    <main className="space-y-6 max-w-xl mx-auto py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Conectar WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Conecte seu WhatsApp via Evolution API
        </p>
      </div>

      {/* Provider Info */}
      <div className="relative rounded-xl border-2 border-cyan-500/40 p-6" style={{ background: 'hsl(var(--card))' }}>
        <div className="absolute -top-3 right-4">
          <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold px-3 py-1 text-white">
            PREMIUM <Zap className="h-3 w-3 ml-1" />
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shrink-0">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Evolution API</h3>
            <p className="text-sm text-muted-foreground">Conexão estável e confiável com o WhatsApp</p>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-2 mt-4">
          {["Conexão estável", "Envio de mensagens", "QR Code e código de pareamento", "Envio de mídias"].map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Connection Card */}
      <Card className="border-border">
        <CardContent className="p-8">
          {!hydrated ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Carregando status da sessão...</p>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Badge className="bg-success/20 text-success border-success/30 mb-6 px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                Conectado
              </Badge>

              <div className="border-2 border-success/30 rounded-xl p-8 max-w-sm w-full text-center" style={{ background: 'hsl(var(--card))' }}>
                <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-9 w-9 text-success-foreground" strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-success mb-2">WhatsApp Conectado!</h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Sua instância está ativa e funcionando perfeitamente.
                </p>
                {session?.phoneNumber && (
                  <p className="text-sm text-muted-foreground">
                    Número: <span className="text-foreground font-medium">{session.phoneNumber}</span>
                  </p>
                )}
                {session?.profileName && (
                  <p className="text-sm text-muted-foreground">
                    Nome: <span className="text-foreground font-medium">{session.profileName}</span>
                  </p>
                )}
                <div className="flex gap-3 justify-center mt-6">
                  <Button onClick={() => checkStatus(true)} variant="outline" size="sm" disabled={connecting}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button onClick={disconnect} variant="destructive" size="sm">
                    <LogOut className="h-4 w-4 mr-2" /> Desconectar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <h2 className="text-lg font-semibold text-foreground mb-2">Conectar WhatsApp</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {session?.status === 'connecting'
                  ? 'Escaneie o QR Code com seu WhatsApp para conectar.'
                  : 'Clique para gerar o QR Code de conexão.'}
              </p>

              {session?.qrCode ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                    <img
                      src={session.qrCode.startsWith('data:') ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-[220px] h-[220px]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={connect} variant="outline" size="sm" disabled={connecting}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                      Novo QR
                    </Button>
                    <Button onClick={disconnect} variant="destructive" size="sm">
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-[220px] h-[220px] bg-muted rounded-xl flex items-center justify-center">
                  {connecting ? (
                    <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Button onClick={connect} className="bg-success hover:bg-success/90 text-success-foreground">
                      <QrCode className="h-4 w-4 mr-2" /> Gerar QR Code
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              <span className="font-medium text-success">1.</span> Aponte seu celular para o QR Code até que complete o pareamento
            </p>
            <p className="text-warning">
              <span className="font-medium">2.</span> Após o pareamento ficar ativo, aguarde a confirmação automática
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">3.</span> Se tudo ocorrer corretamente, a sessão será ativada automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
