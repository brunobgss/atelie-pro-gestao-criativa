import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { focusNFService, FocusNFConfig } from "@/integrations/focusnf/service";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, ExternalLink, Eye, EyeOff, Upload, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/components/AuthProvider";

export default function ConfiguracaoFocusNF() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showTokenHomologacao, setShowTokenHomologacao] = useState(false);
  const [showTokenProducao, setShowTokenProducao] = useState(false);
  const [showCertificadoSenha, setShowCertificadoSenha] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoFileName, setCertificadoFileName] = useState<string>('');
  const [config, setConfig] = useState<Partial<FocusNFConfig>>({
    ambiente: 'homologacao',
    ativo: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const existing = await focusNFService.getConfig();
      if (existing) {
        setConfig(existing);
        // Se já tem certificado configurado, mostrar nome do arquivo
        if (existing.certificado_arquivo) {
          setCertificadoFileName('Certificado já configurado (clique para substituir)');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleCertificadoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo (.pfx ou .p12)
    const validExtensions = ['.pfx', '.p12'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Certificado deve ser um arquivo .pfx ou .p12');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Certificado muito grande. Máximo permitido: 5MB');
      return;
    }

    try {
      // Converter para Base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Remover prefixo "data:application/x-pkcs12;base64," ou similar
        const base64Data = base64.split(',')[1] || base64;
        setConfig({ ...config, certificado_arquivo: base64Data });
        setCertificadoFile(file);
        setCertificadoFileName(file.name);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo do certificado');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Erro ao processar certificado:', error);
      toast.error('Erro ao processar certificado: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.cnpj_emitente || !config.razao_social) {
      toast.error('Preencha pelo menos CNPJ e Razão Social');
      return;
    }

    if (!config.token_homologacao && !config.token_producao) {
      toast.error('Configure pelo menos um token (homologação ou produção)');
      return;
    }

    // Validar campos obrigatórios do endereço
    if (!config.endereco_uf || config.endereco_uf.length !== 2) {
      toast.error('Preencha o campo UF (2 letras, ex: SP, MG)');
      return;
    }

    if (!config.endereco_cidade) {
      toast.error('Preencha o campo Cidade');
      return;
    }

    if (!config.endereco_logradouro) {
      toast.error('Preencha o campo Logradouro');
      return;
    }

    if (!config.endereco_cep) {
      toast.error('Preencha o campo CEP');
      return;
    }

    try {
      setLoading(true);
      const result = await focusNFService.saveConfig(config as FocusNFConfig);
      
      if (result.ok) {
        toast.success('Configuração salva com sucesso!');
        await loadConfig();
      } else {
        toast.error(result.error || 'Erro ao salvar configuração');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-gray-700 hover:bg-gray-100" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuração Focus NF</h1>
              <p className="text-gray-600 text-sm mt-0.5">Configure sua empresa emitente e tokens da API</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        {/* Aviso se não tiver plano profissional */}
        {!empresa?.tem_nota_fiscal && empresa?.is_premium && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-900">⚠️ Plano Profissional Necessário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-yellow-800">
                Você está usando o <strong>Plano Básico</strong>. Para emitir notas fiscais, você precisa do <strong>Plano Profissional</strong>.
              </p>
              <Button 
                onClick={() => navigate('/assinatura')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Ver Planos Disponíveis
              </Button>
              <p className="text-sm text-yellow-700">
                Você pode configurar os dados aqui, mas não poderá emitir notas até fazer upgrade para o Plano Profissional.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuração Focus NF</CardTitle>
            <CardDescription>
              Configure sua empresa emitente e tokens da API Focus NF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ambiente e Tokens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Ambiente e Autenticação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ambiente">Ambiente</Label>
                    <Select
                      value={config.ambiente}
                      onValueChange={(value: 'homologacao' | 'producao') => 
                        setConfig({ ...config, ambiente: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Use homologação durante os 30 dias de teste
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="token_homologacao">Token Homologação</Label>
                    <div className="relative">
                      <Input
                        id="token_homologacao"
                        type={showTokenHomologacao ? "text" : "password"}
                        value={config.token_homologacao || ''}
                        onChange={(e) => setConfig({ ...config, token_homologacao: e.target.value })}
                        placeholder="Token de homologação"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowTokenHomologacao(!showTokenHomologacao)}
                      >
                        {showTokenHomologacao ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token_producao">Token Produção</Label>
                    <div className="relative">
                      <Input
                        id="token_producao"
                        type={showTokenProducao ? "text" : "password"}
                        value={config.token_producao || ''}
                        onChange={(e) => setConfig({ ...config, token_producao: e.target.value })}
                        placeholder="Token de produção"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowTokenProducao(!showTokenProducao)}
                      >
                        {showTokenProducao ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados da Empresa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados da Empresa Emitente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={config.cnpj_emitente || ''}
                      onChange={(e) => {
                        // Aceitar apenas números
                        let valor = e.target.value.replace(/\D/g, '');
                        // Limitar a 14 dígitos (CNPJ)
                        valor = valor.substring(0, 14);
                        setConfig({ ...config, cnpj_emitente: valor });
                      }}
                      placeholder="00000000000000"
                      maxLength={14}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas números (14 dígitos)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={config.razao_social || ''}
                      onChange={(e) => setConfig({ ...config, razao_social: e.target.value })}
                      placeholder="Razão Social"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={config.nome_fantasia || ''}
                      onChange={(e) => setConfig({ ...config, nome_fantasia: e.target.value })}
                      placeholder="Nome Fantasia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricao_estadual"
                      value={config.inscricao_estadual || ''}
                      onChange={(e) => setConfig({ ...config, inscricao_estadual: e.target.value })}
                      placeholder="Inscrição Estadual"
                    />
                  </div>

                      <div className="space-y-2">
                        <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                        <Input
                          id="inscricao_municipal"
                          value={config.inscricao_municipal || ''}
                          onChange={(e) => setConfig({ ...config, inscricao_municipal: e.target.value })}
                          placeholder="Inscrição Municipal"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="regime_tributario">Regime Tributário *</Label>
                        <Select
                          value={config.regime_tributario || 'simples_nacional'}
                          onValueChange={(value: 'simples_nacional' | 'simples_nacional_excesso_sublimite' | 'regime_normal') => 
                            setConfig({ ...config, regime_tributario: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                            <SelectItem value="simples_nacional_excesso_sublimite">Simples Nacional - Excesso de Sublimite</SelectItem>
                            <SelectItem value="regime_normal">Regime Normal</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Importante: Selecione o regime correto para evitar erros na emissão
                        </p>
                      </div>
                    </div>
                  </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Endereço</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={config.endereco_logradouro || ''}
                      onChange={(e) => setConfig({ ...config, endereco_logradouro: e.target.value })}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={config.endereco_numero || ''}
                      onChange={(e) => setConfig({ ...config, endereco_numero: e.target.value })}
                      placeholder="Número"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={config.endereco_complemento || ''}
                      onChange={(e) => setConfig({ ...config, endereco_complemento: e.target.value })}
                      placeholder="Apt, Sala, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={config.endereco_bairro || ''}
                      onChange={(e) => setConfig({ ...config, endereco_bairro: e.target.value })}
                      placeholder="Bairro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={config.endereco_cidade || ''}
                      onChange={(e) => setConfig({ ...config, endereco_cidade: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uf">UF *</Label>
                    <Input
                      id="uf"
                      value={config.endereco_uf || ''}
                      onChange={(e) => setConfig({ ...config, endereco_uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2) })}
                      placeholder="SP"
                      maxLength={2}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Obrigatório. Exemplo: SP, MG, RJ
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={config.endereco_cep || ''}
                      onChange={(e) => {
                        // Aceitar apenas números e formatação
                        let valor = e.target.value.replace(/\D/g, '');
                        // Limitar a 8 dígitos
                        valor = valor.substring(0, 8);
                        setConfig({ ...config, endereco_cep: valor });
                      }}
                      placeholder="00000000"
                      maxLength={8}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Obrigatório. Apenas números (8 dígitos)
                    </p>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={config.telefone || ''}
                    onChange={(e) => {
                      // Aceitar apenas números
                      let valor = e.target.value.replace(/\D/g, '');
                      // Se começar com 55 (código do país), remover
                      if (valor.startsWith('55') && valor.length > 11) {
                        valor = valor.substring(2);
                      }
                      // Limitar a 11 dígitos
                      valor = valor.substring(0, 11);
                      setConfig({ ...config, telefone: valor });
                    }}
                    placeholder="35996911688"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas números (sem DDD + código do país)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={config.email || ''}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Certificado Digital A1 (Opcional) */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Certificado Digital A1 (Opcional)</h3>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Informação:</strong> Na maioria dos casos, você não precisa fazer upload do certificado aqui.
                    A Focus NF gerencia o certificado digital no próprio painel deles após você fazer upload lá.
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Quando usar:</strong> Apenas se você tiver um certificado A1 (.pfx/.p12) e quiser armazená-lo aqui 
                    para uso futuro ou se a Focus NF solicitar envio via API.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="certificado">Arquivo do Certificado (.pfx ou .p12)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="certificado"
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleCertificadoFileChange}
                        className="hidden"
                      />
                      <Label
                        htmlFor="certificado"
                        className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                          {certificadoFileName || 'Selecionar arquivo'}
                        </span>
                      </Label>
                      {certificadoFileName && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCertificadoFile(null);
                            setCertificadoFileName('');
                            setConfig({ 
                              ...config, 
                              certificado_arquivo: undefined,
                              certificado_senha: undefined 
                            });
                          }}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Máximo: 5MB. Formatos aceitos: .pfx, .p12
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="certificado_senha">Senha do Certificado</Label>
                    <div className="relative">
                      <Input
                        id="certificado_senha"
                        type={showCertificadoSenha ? "text" : "password"}
                        value={config.certificado_senha || ''}
                        onChange={(e) => setConfig({ ...config, certificado_senha: e.target.value })}
                        placeholder="Senha do certificado (se houver)"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCertificadoSenha(!showCertificadoSenha)}
                      >
                        {showCertificadoSenha ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Senha do certificado digital (se necessário)
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Segurança:</strong> O certificado e senha serão armazenados de forma segura no banco de dados. 
                    Certifique-se de que você tem permissão para usar este certificado digital.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Passo a Passo para Configurar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-blue-900">Como obter acesso à API Focus NF:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>
                  <strong>Cadastre sua empresa:</strong>{' '}
                  <a href="https://focusnfe.com.br/cadastro/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Clique aqui para se cadastrar <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <strong>Confirme sua conta:</strong> Verifique seu e-mail e confirme o cadastro
                </li>
                <li>
                  <strong>Cadastre um emitente e gere os tokens:</strong>{' '}
                  <a href="https://focusnfe.com.br/guides/criacao-empresa-emitente/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Siga este guia passo a passo <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <strong>⚠️ IMPORTANTE - Ative o tipo de documento:</strong> No painel da Focus NF, após cadastrar o emitente, vá na aba <strong>"DOCUMENTOS FISCAIS"</strong> e ative o toggle <strong>"NFe"</strong> (Nota Fiscal Eletrônica). Sem isso, você receberá erro "Endpoint não encontrado". Depois, clique em <strong>"SALVAR"</strong>.
                </li>
                <li>
                  <strong>Configure aqui:</strong> Cole os tokens gerados nos campos acima
                </li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-green-900">✅ Período de Teste</h3>
              <p className="text-sm text-green-800">
                Você terá <strong>30 dias de testes gratuitos</strong> sem compromisso. 
                Durante esse período, use o ambiente de <strong>homologação</strong> para testar a emissão de notas fiscais.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-yellow-900">⚠️ Importante</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>Você precisa ter o <strong>plano Profissional (com NF)</strong> para usar esta funcionalidade</li>
                <li>Cada empresa precisa fazer seu próprio cadastro na Focus NF</li>
                <li><strong>NÃO ESQUEÇA:</strong> Ative o toggle <strong>"NFe"</strong> na aba "DOCUMENTOS FISCAIS" do painel da Focus NF, caso contrário receberá erro ao tentar emitir notas</li>
                <li>Os tokens são únicos e pessoais - não compartilhe com ninguém</li>
                <li>Após os 30 dias, a Focus NF entrará em contato sobre a contratação</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-red-900">🔍 Checklist Completo - Verifique se está tudo configurado:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-red-800">
                <li>
                  <strong>CNPJ cadastrado como emitente:</strong> O CNPJ deve estar cadastrado no painel da Focus NF
                </li>
                <li>
                  <strong>Toggle NFe ativado:</strong> Na aba "DOCUMENTOS FISCAIS", o toggle "NFe" deve estar <strong>ATIVO (laranja)</strong>
                </li>
                <li>
                  <strong>Salvar alterações:</strong> Após ativar o toggle, você <strong>DEVE</strong> clicar em "SALVAR" no final da página
                </li>
                <li>
                  <strong>Aguardar processamento:</strong> Após salvar, aguarde <strong>2-5 minutos</strong> para a ativação ser processada
                </li>
                <li>
                  <strong>Token correto:</strong> O token de homologação deve ser o gerado para este CNPJ específico na aba "TOKENS"
                </li>
                <li>
                  <strong>Ambiente correto:</strong> Use "homologação" durante os 30 dias de teste
                </li>
                <li>
                  <strong>Certificado Digital:</strong> Deve estar válido no painel da Focus NF (aparece como "Certificado Digital: Válido"). 
                  Você pode fazer upload do certificado A1 no painel da Focus NF ou, opcionalmente, armazená-lo aqui na configuração.
                </li>
                <li>
                  <strong>Dados da empresa completos:</strong> Preencha todas as abas:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>IDENTIFICAÇÃO: Razão Social, Nome Fantasia, Inscrição Estadual, Inscrição Municipal</li>
                    <li>CONTATO: Email, telefone</li>
                    <li>ENDEREÇO: Logradouro, número, bairro, cidade, UF, CEP</li>
                    <li>RESPONSÁVEL: Nome do responsável</li>
                  </ul>
                </li>
                <li>
                  <strong>Série e numeração:</strong> Na aba "DOCUMENTOS FISCAIS", verifique se a série e próximo número estão configurados (geralmente começam em 1)
                </li>
              </ol>
              <div className="bg-red-100 border border-red-300 rounded p-3 mt-4">
                <p className="text-xs text-red-900 font-semibold mb-2">⚠️ Erro "Endpoint não encontrado" (404)?</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                  <li>Verifique se o toggle NFe está <strong>realmente ativado (laranja)</strong> e se você salvou</li>
                  <li>Aguarde 2-5 minutos após salvar antes de tentar emitir</li>
                  <li>Verifique se o token foi gerado para o CNPJ correto</li>
                  <li>Certifique-se de que o certificado digital está válido</li>
                  <li>Se persistir, contate o suporte da Focus NF informando o CNPJ e o erro</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">📚 Documentação:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <a href="https://focusnfe.com.br/doc/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Documentação completa da API <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://focusnfe.com.br/guides/criacao-empresa-emitente/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Guia completo de cadastro de emitente <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

