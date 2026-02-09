import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { exportToCSV, parseCSV, downloadTemplate, type ExportColumn } from "@/utils/csv-export";
import { toast } from "sonner";

interface ImportExportButtonsProps<T extends Record<string, any>> {
  data: T[];
  exportColumns: ExportColumn<T>[];
  importColumnMap: Record<string, keyof T>;
  filename: string;
  onImport: (data: Partial<T>[]) => Promise<void>;
  templateColumns?: string[];
  disabled?: boolean;
}

export function ImportExportButtons<T extends Record<string, any>>({
  data,
  exportColumns,
  importColumnMap,
  filename,
  onImport,
  templateColumns,
  disabled = false,
}: ImportExportButtonsProps<T>) {
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<T>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      if (data.length === 0) {
        toast.error("Nenhum dado para exportar");
        return;
      }
      exportToCSV(data, exportColumns, filename);
      toast.success(`${data.length} registros exportados com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao exportar:", error);
      toast.error(error.message || "Erro ao exportar dados");
    }
  };

  const handleDownloadTemplate = () => {
    const columns = templateColumns || exportColumns.map((c) => c.header);
    downloadTemplate(columns, filename);
    toast.success("Template baixado com sucesso!");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV<T>(text, importColumnMap);
        
        if (parsed.length === 0) {
          setImportError("Nenhum dado válido encontrado no arquivo");
          return;
        }

        setPreviewData(parsed);
        setImportError(null);
        setImportDialogOpen(true);
      } catch (error: any) {
        setImportError(error.message || "Erro ao processar arquivo");
        toast.error(error.message || "Erro ao processar arquivo");
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = "";
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      await onImport(previewData);
      toast.success(`${previewData.length} registros importados com sucesso!`);
      setImportDialogOpen(false);
      setPreviewData([]);
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error(error.message || "Erro ao importar dados");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          disabled={disabled}
          title="Baixar template CSV"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Template</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Importar CSV"
        >
          <Upload className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Importar</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={disabled || data.length === 0}
          title="Exportar CSV"
        >
          <Download className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".csv,.txt"
        className="hidden"
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Importação</DialogTitle>
            <DialogDescription>
              {previewData.length} registros serão importados
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {importError}
            </div>
          )}

          <div className="max-h-[300px] overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Prévia</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2 truncate max-w-[300px]">
                      {JSON.stringify(row).slice(0, 100)}...
                    </td>
                  </tr>
                ))}
                {previewData.length > 10 && (
                  <tr className="border-t">
                    <td colSpan={2} className="p-2 text-center text-muted-foreground">
                      ... e mais {previewData.length - 10} registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
