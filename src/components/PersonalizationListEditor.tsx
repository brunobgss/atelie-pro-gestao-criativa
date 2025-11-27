import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLOTHING_SIZES } from "@/constants/sizes";

export type PersonalizationEntry = {
  id: string;
  personName: string;
  size?: string;
  quantity: number;
  notes?: string;
};

export type PersonalizationListEditorProps = {
  entries: PersonalizationEntry[];
  onChange: (entries: PersonalizationEntry[]) => void;
  className?: string;
  showNotes?: boolean;
  title?: string;
  description?: string;
};

export function createEmptyPersonalization(): PersonalizationEntry {
  const generateId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID.bind(crypto)
      : () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return {
    id: generateId(),
    personName: "",
    size: "",
    quantity: 1,
    notes: "",
  };
}

export function PersonalizationListEditor({
  entries,
  onChange,
  className,
  showNotes = false,
  title = "Personalizações",
  description = "Liste cada peça com tamanho, nome ou detalhes específicos.",
}: PersonalizationListEditorProps) {
  const handleEntryChange = (id: string, field: keyof PersonalizationEntry, value: string) => {
    onChange(
      entries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]:
                field === "quantity"
                  ? Math.max(0, Number(value) || 0)
                  : value,
            }
          : entry
      )
    );
  };

  const handleAddEntry = () => {
    onChange([...entries, createEmptyPersonalization()]);
  };

  const handleDuplicateEntry = (entry: PersonalizationEntry) => {
    const duplicate = {
      ...entry,
      id: createEmptyPersonalization().id,
    };
    onChange([...entries, duplicate]);
  };

  const handleRemoveEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
  };

  const hasEntries = entries.length > 0;

  return (
    <div className={cn("rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-primary">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start border-primary/40 text-primary hover:bg-primary/10"
          onClick={handleAddEntry}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar linha
        </Button>
      </div>

      {hasEntries ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border/80 bg-background p-4 sm:grid-cols-[2fr,1fr,1fr,auto]"
            >
              <div className="space-y-1">
                <Label>Nome / Identificação</Label>
                <Input
                  value={entry.personName}
                  placeholder="Ex: Camiseta G — Luiz"
                  onChange={(event) => handleEntryChange(entry.id, "personName", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Tamanho</Label>
                <Select
                  value={entry.size || undefined}
                  onValueChange={(value) => handleEntryChange(entry.id, "size", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOTHING_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  value={entry.quantity}
                  onChange={(event) => handleEntryChange(entry.id, "quantity", event.target.value)}
                />
              </div>
              <div className="flex items-start justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => handleDuplicateEntry(entry)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => handleRemoveEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {showNotes && (
                <div className="sm:col-span-3 space-y-1">
                  <Label>Observações</Label>
                  <Textarea
                    value={entry.notes ?? ""}
                    placeholder="Detalhes adicionais para esta peça"
                    onChange={(event) => handleEntryChange(entry.id, "notes", event.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-primary/40 bg-white p-4 text-sm text-muted-foreground">
          Nenhuma peça listada ainda. Clique em “Adicionar linha” para começar.
        </div>
      )}
    </div>
  );
}



