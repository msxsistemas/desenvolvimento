import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Info, Shield, Eye, CheckCircle, XCircle, Plus, Loader2 } from "lucide-react";
import { Panel } from "./ProvedoresList";

interface AddPanelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  formData: { nomePainel: string; urlPainel: string; usuario: string; senha: string };
  setFormData: (data: { nomePainel: string; urlPainel: string; usuario: string; senha: string }) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  autoRenewal: boolean;
  setAutoRenewal: (auto: boolean) => void;
  isTestingConnection: boolean;
  onCreatePanel: () => void;
  onTestConnection: () => void;
}

export function AddPanelModal({
  isOpen,
  onOpenChange,
  providerName,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  autoRenewal,
  setAutoRenewal,
  isTestingConnection,
  onCreatePanel,
  onTestConnection,
}: AddPanelModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Painel {providerName}</DialogTitle>
          <DialogDescription>Configure suas credenciais para integração</DialogDescription>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-xs">⚠️</span>
            <span className="text-sm font-medium text-orange-400">IMPORTANTE:</span>
            <span className="text-sm text-muted-foreground">Desabilite 2FA no painel se necessário</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8">
              <Shield className="w-4 h-4 mr-1" />
              <span className="text-xs">AES-256</span>
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Painel *</Label>
            <Input
              value={formData.nomePainel}
              onChange={(e) => setFormData({ ...formData, nomePainel: e.target.value })}
              placeholder="Ex: Meu Painel Principal"
            />
          </div>

          <div className="space-y-2">
            <Label>URL do Painel *</Label>
            <Input
              value={formData.urlPainel}
              onChange={(e) => setFormData({ ...formData, urlPainel: e.target.value })}
              placeholder="https://painel.exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Usuário do Painel *</Label>
            <Input
              value={formData.usuario}
              onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
              placeholder="seu_usuario"
            />
          </div>

          <div className="space-y-2">
            <Label>Senha do Painel *</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="sua_senha"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🔄</span>
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">Renovação Automática</p>
              <p className="text-xs text-muted-foreground">Clientes serão renovados automaticamente</p>
            </div>
          </div>
          <Switch checked={autoRenewal} onCheckedChange={setAutoRenewal} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onTestConnection} disabled={isTestingConnection}>
            {isTestingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button onClick={onCreatePanel} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Criar Painel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditPanelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: { id: string; nome: string; url: string };
  setEditForm: (form: { id: string; nome: string; url: string }) => void;
  onSave: () => void;
}

export function EditPanelModal({ isOpen, onOpenChange, editForm, setEditForm, onSave }: EditPanelModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Painel</DialogTitle>
          <DialogDescription>Atualize as informações do painel</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Painel</Label>
            <Input
              value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>URL do Painel</Label>
            <Input
              value={editForm.url}
              onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TestResultModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  success: boolean;
  message: string;
  details?: string;
}

export function TestResultModal({ isOpen, onOpenChange, success, message, details }: TestResultModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Resultado do Teste</DialogTitle>
          <DialogDescription className="sr-only">Resultado do teste de conexão</DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <div className="mb-4">
            {success ? (
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${success ? 'text-green-500' : 'text-destructive'}`}>
            {success ? "Teste - Sucesso" : "Teste - Erro"}
          </h3>
          <p className={`text-sm mb-4 ${success ? 'text-green-500/80' : 'text-destructive/80'}`}>
            {message}
          </p>
          {details && (
            <div className="bg-muted rounded-lg p-3 mb-4 text-left">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{details}</pre>
            </div>
          )}
          <Button onClick={() => onOpenChange(false)} className="w-full">OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panelName: string;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ isOpen, onOpenChange, panelName, onConfirm }: DeleteConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir painel</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o painel "{panelName}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SuccessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onClose?: () => void;
}

export function SuccessModal({ isOpen, onOpenChange, message, onClose }: SuccessModalProps) {
  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Sucesso</DialogTitle>
          <DialogDescription className="sr-only">Operação realizada com sucesso</DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-green-500 mb-2">Sucesso</h3>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          <Button onClick={handleClose} className="w-full">OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
