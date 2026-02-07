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
import { Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  nome: string;
  mensagem: string;
  midia: boolean;
  padrao: boolean;
}

const defaultTemplates: Template[] = [
  { id: "1", nome: "Dados de acesso do cliente", mensagem: "{saudacao} *{nome_cliente}*.{br}Segue suas informações abaixo:{br}{br}Login: *{usuario}*{br}Senha: *{senha}*", midia: false, padrao: false },
  { id: "2", nome: "Confirmação de Pagamento", mensagem: "Olá, *{nome_cliente}*. {br}{br} ✅ *Seu pagamento foi realizado!*", midia: false, padrao: false },
  { id: "3", nome: "Plano Venceu Ontem", mensagem: "{saudacao}. *{nome_cliente}*. {br}{br} 🟥 *SEU PLANO VENCEU*", midia: false, padrao: false },
  { id: "4", nome: "Plano Vencendo Hoje", mensagem: "{saudacao}. *{nome_cliente}*. {br}{br} ⚠️ *SEU VENCIMENTO É HOJE!*", midia: false, padrao: false },
  { id: "5", nome: "Plano Vencendo Amanhã", mensagem: "{saudacao}. *{nome_cliente}*. {br}{br} 📅 *SEU PLANO VENCE AMANHÃ!*", midia: false, padrao: false },
  { id: "6", nome: "Fatura Criada", mensagem: "{saudacao}. *{nome_cliente}*. {br}{br}* 📄 Sua fatura foi gerada com sucesso!*", midia: false, padrao: false },
  { id: "7", nome: "Bem vindo", mensagem: "{saudacao} *{nome_cliente}*. {br}{br}🎉 Seja bem-vindo(a) à *Tech Play!*", midia: false, padrao: false },
];

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({ nome: "", mensagem: "" });

  useEffect(() => {
    document.title = "Templates | Tech Play";
  }, []);

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ nome: template.nome, mensagem: template.mensagem });
    setDialogOpen(true);
  };

  const handleCopy = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: Date.now().toString(),
      nome: `${template.nome} (cópia)`,
    };
    setTemplates([...templates, newTemplate]);
    toast.success("Template duplicado com sucesso!");
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success("Template excluído com sucesso!");
  };

  const handleTogglePadrao = (id: string) => {
    setTemplates(
      templates.map((t) =>
        t.id === id ? { ...t, padrao: !t.padrao } : t
      )
    );
  };

  const handleSave = () => {
    if (editingTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, nome: formData.nome, mensagem: formData.mensagem }
            : t
        )
      );
      toast.success("Template atualizado com sucesso!");
    } else {
      const newTemplate: Template = {
        id: Date.now().toString(),
        nome: formData.nome,
        mensagem: formData.mensagem,
        midia: false,
        padrao: false,
      };
      setTemplates([...templates, newTemplate]);
      toast.success("Template criado com sucesso!");
    }
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ nome: "", mensagem: "" });
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({ nome: "", mensagem: "" });
    setDialogOpen(true);
  };

  const handleRestaurarPadrao = () => {
    setTemplates(defaultTemplates);
    toast.success("Templates restaurados para o padrão!");
  };

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
                <TableHead className="text-muted-foreground text-center">Mídia</TableHead>
                <TableHead className="text-muted-foreground text-center">Padrão</TableHead>
                <TableHead className="text-muted-foreground text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-foreground">{template.nome}</TableCell>
                  <TableCell className="text-center">
                    <span className="bg-red-500 text-white text-xs px-3 py-1 rounded">
                      NÃO
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={template.padrao}
                      onCheckedChange={() => handleTogglePadrao(template.id)}
                    />
                  </TableCell>
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
            <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
