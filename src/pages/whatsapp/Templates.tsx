import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Copy, Trash2, Loader2 } from "lucide-react";
import { useTemplatesMensagens, TemplateMensagem } from "@/hooks/useTemplatesMensagens";

export default function Templates() {
  const { 
    templates, 
    loading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    duplicateTemplate, 
    restoreDefaults 
  } = useTemplatesMensagens();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateMensagem | null>(null);
  const [formData, setFormData] = useState({ nome: "", mensagem: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Templates | Tech Play";
  }, []);

  const handleEdit = (template: TemplateMensagem) => {
    setEditingTemplate(template);
    setFormData({ nome: template.nome, mensagem: template.mensagem });
    setDialogOpen(true);
  };

  const handleCopy = async (template: TemplateMensagem) => {
    await duplicateTemplate(template);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
  };

  const handleTogglePadrao = async (template: TemplateMensagem) => {
    await updateTemplate(template.id, { padrao: !template.padrao });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, { 
          nome: formData.nome, 
          mensagem: formData.mensagem 
        });
      } else {
        await createTemplate({
          nome: formData.nome,
          mensagem: formData.mensagem,
          midia: false,
          padrao: false,
        });
      }
      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ nome: "", mensagem: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({ nome: "", mensagem: "" });
    setDialogOpen(true);
  };

  const handleRestaurarPadrao = async () => {
    await restoreDefaults();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Templates</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRestaurarPadrao}>
            Restaurar Padrão
          </Button>
          <Button onClick={handleNew} className="bg-cyan-500 hover:bg-cyan-600">
            Novo
          </Button>
        </div>
      </div>

      {/* Templates Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Templates de mensagens</h2>
          
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground">{template.nome}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-muted-foreground text-sm mt-4">
            Mostrando 1 até {templates.length} de {templates.length} resultados
          </p>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Template</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Digite o nome do template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensagem">Mensagem</Label>
              <Textarea
                id="mensagem"
                value={formData.mensagem}
                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                placeholder="Digite a mensagem do template"
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {"{nome_cliente}"}, {"{saudacao}"}, {"{vencimento}"}, {"{br}"} (quebra de linha)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-cyan-500 hover:bg-cyan-600"
              disabled={saving || !formData.nome || !formData.mensagem}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
