// Script para adicionar coluna country na tabela empresas
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoyMDE1NTc1OTk5fQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCountryColumn() {
  try {
    console.log('🔄 Adicionando coluna country na tabela empresas...');
    
    // Adicionar coluna country como VARCHAR(2) com default 'BR'
    const { error } = await supabase.rpc('add_column_if_not_exists', {
      table_name: 'empresas',
      column_name: 'country',
      column_type: 'VARCHAR(2) DEFAULT \'BR\''
    });
    
    if (error) {
      console.error('❌ Erro ao adicionar coluna:', error);
      return;
    }
    
    console.log('✅ Coluna country adicionada com sucesso!');
    
    // Atualizar empresas existentes para ter país padrão BR
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ country: 'BR' })
      .is('country', null);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar empresas existentes:', updateError);
      return;
    }
    
    console.log('✅ Empresas existentes atualizadas com país padrão BR');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addCountryColumn();
}

export { addCountryColumn };
