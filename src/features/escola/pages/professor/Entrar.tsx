import { GraduationCap } from "lucide-react";
import FormularioEntrada from "../../components/FormularioEntrada";
import { useEstadoEscola } from "../../data/store";

/** Link de acesso das professoras: /escola/professor/entrar */
export default function EntrarProfessor() {
  const estado = useEstadoEscola();
  const sugestoes = estado.usuarios
    .filter((usuario) => usuario.papel === "professora" && usuario.ativo)
    .map((usuario) => ({ email: usuario.email, rotulo: usuario.nome }));

  return (
    <FormularioEntrada
      titulo="Diário da professora"
      descricao="Entre com o e-mail e a senha que a escola cadastrou para você."
      icone={<GraduationCap className="h-7 w-7" />}
      sugestoes={sugestoes}
    />
  );
}
