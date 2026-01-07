import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
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

  // Buscar clientes quando o componente montar
  useEffect(() => {
    loadClients();
  }, []);

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
    // Usar setTimeout para garantir que as atualizações de estado aconteçam antes de fechar o popover
    // Isso evita erros de removeChild durante a desmontagem do componente
    try {
      onChange(client.name);
      if (onPhoneChange && client.phone) {
        onPhoneChange(client.phone);
      }
      
      // Fechar popover e limpar busca de forma assíncrona para evitar conflitos
      setTimeout(() => {
        setOpen(false);
        setSearchTerm("");
      }, 0);
    } catch (error) {
      // Se houver erro, tentar fechar o popover de qualquer forma
      console.warn('Erro ao selecionar cliente:', error);
      setOpen(false);
      setSearchTerm("");
    }
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
        
        // Fechar popover e limpar busca de forma assíncrona para evitar conflitos
        setTimeout(() => {
          setOpen(false);
          setSearchTerm("");
        }, 0);
        
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
    <div className="space-y-2">
      <Label htmlFor="client">
        Cliente {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
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
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col gap-2 p-2">
                  <p className="text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </p>
                  {searchTerm.trim() && (
                    <Button
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
              </CommandEmpty>
              <CommandGroup>
                {filteredClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => handleSelectClient(client)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{client.name}</div>
                        {client.phone && (
                          <div className="text-xs text-muted-foreground">
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === client.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

