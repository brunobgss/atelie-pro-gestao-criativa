import { useParams } from "react-router-dom";

export default function OrcamentoImpressaoTeste() {
  console.log("🧪 COMPONENTE DE TESTE EXECUTANDO!");
  
  const { id } = useParams<{ id: string }>();
  
  console.log("🧪 ID recebido:", id);
  
  return (
    <div style={{ padding: "20px", backgroundColor: "red", color: "white" }}>
      <h1>TESTE DE IMPRESSÃO</h1>
      <p>ID: {id}</p>
      <p>Se você está vendo isso, o componente está funcionando!</p>
    </div>
  );
}
