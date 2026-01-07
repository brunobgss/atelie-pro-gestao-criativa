import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCustomers, createCustomer } from "@/integrations/supabase/customers";
import { toast } from "sonner";

interface ClientSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPhoneChange?: (phone: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function ClientSearch({ 
  value, 
  onChange, 
  onPhoneChange, 
  placeholder = "Nome do cliente",
  required = false 
}: ClientSearchProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone?: string; email?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar clientes quando o componente montar
  useEffect(() => {
    loadClients();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setClients(data);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes baseado no termo de busca
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectClient = (client: { id: string; name: string; phone?: string; email?: string }) => {
    // Atualizar valores primeiro
    onChange(client.name);
    if (onPhoneChange && client.phone) {
      onPhoneChange(client.phone);
    }
    
    // Fechar dropdown e limpar busca
    setOpen(false);
    setSearchTerm("");
  };

  const handleCreateNewClient = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um nome para o cliente");
      return;
    }

    try {
      setLoading(true);
      const result = await createCustomer({ name: searchTerm.trim() });
      
      if (result.ok && result.data) {
        toast.success("Cliente criado com sucesso!");
        onChange(result.data.name);
        setOpen(false);
        setSearchTerm("");
        // Recarregar lista de clientes
        loadClients();
      } else {
        toast.error(result.error || "Erro ao criar cliente");
      }
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast.error("Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="client">
        Cliente {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            if (!open && inputRef.current) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className="w-full justify-between border-input"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className={cn(
              "truncate",
              !value && "text-muted-foreground"
            )}>
              {value || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-[300px] overflow-auto">
            <div className="p-2 border-b">
              <Input
                ref={inputRef}
                placeholder="Pesquisar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
              />
            </div>
            <div className="p-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col gap-2 p-2">
                  <p className="text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </p>
                  {searchTerm.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNewClient}
                      disabled={loading}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar "{searchTerm.trim()}"
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                        value === client.name && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium truncate">{client.name}</div>
                          {client.phone && (
                            <div className="text-xs text-muted-foreground truncate">
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 shrink-0",
                          value === client.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

