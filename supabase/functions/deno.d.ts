// Declarações de tipos para Deno (usado nas Edge Functions do Supabase)
// Este arquivo resolve os erros de TypeScript sobre APIs globais do Deno

declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

