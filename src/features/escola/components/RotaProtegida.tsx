import { Navigate } from "react-router-dom";
import { useSessao } from "../hooks/useSessao";
import { ENTRADA } from "../lib/acesso";

/**
 * Guarda de cada área. Sem sessão do papel certo, manda para o login daquela
 * área — a da professora e a da gestão são portas separadas.
 */
export function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, papel, carregando } = useSessao();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!usuario) return <Navigate to={ENTRADA[papel]} replace />;

  return <>{children}</>;
}
