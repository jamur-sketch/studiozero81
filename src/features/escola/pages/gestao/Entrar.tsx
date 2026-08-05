import { Building2 } from "lucide-react";
import FormularioEntrada from "../../components/FormularioEntrada";
import { useEstadoEscola } from "../../data/store";

/** Link de acesso da gestão: /escola/gestao/entrar */
export default function EntrarGestao() {
  const estado = useEstadoEscola();
  const sugestoes = estado.usuarios
    .filter((usuario) => usuario.papel === "gestao" && usuario.ativo)
    .map((usuario) => ({ email: usuario.email, rotulo: `${usuario.nome} — ${usuario.cargo}` }));

  return (
    <FormularioEntrada
      titulo="Painel da gestão"
      descricao="Acesso restrito à direção e à coordenação da escola."
      icone={<Building2 className="h-7 w-7" />}
      sugestoes={sugestoes}
    />
  );
}
