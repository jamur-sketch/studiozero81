import { Navigate } from "react-router-dom";
import { useProfessora } from "../hooks/useProfessora";

/**
 * Guarda das telas da professora. Hoje só verifica quem foi selecionado na
 * tela de entrada; quando os acessos existirem, este é o ponto onde entra a
 * verificação de sessão real (e, depois, o papel de gestão).
 */
export function ProfessoraRoute({ children }: { children: React.ReactNode }) {
  const { professora, carregando } = useProfessora();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!professora) {
    return <Navigate to="/escola/entrar" replace />;
  }

  return <>{children}</>;
}
