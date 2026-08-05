import { Link } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, School } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEstadoEscola } from "../data/store";
import { ENTRADA } from "../lib/acesso";

/**
 * Porta de entrada do sistema. As duas áreas são separadas e cada uma tem o seu
 * link — esta página existe para escolher, e para a escola saber qual endereço
 * mandar para cada pessoa.
 */
export default function Portaria() {
  const estado = useEstadoEscola();

  const areas = [
    {
      titulo: "Sou professora",
      descricao: "Lançar a chamada do dia e acompanhar a frequência da minha turma.",
      icone: GraduationCap,
      para: ENTRADA.professora,
    },
    {
      titulo: "Sou da gestão",
      descricao: "Acompanhar as chamadas, os acessos e os avisos de faltas da escola.",
      icone: Building2,
      para: ENTRADA.gestao,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <School className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{estado.escola.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {estado.escola.municipio} · Ano letivo {estado.escola.anoLetivo}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {areas.map((area) => (
            <Link key={area.para} to={area.para}>
              <Card className="h-full hover:border-foreground/20 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <area.icone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold flex items-center gap-1.5">
                      {area.titulo}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{area.descricao}</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{area.para}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Cada área tem o seu endereço e o seu login. Entrar em uma não dá acesso à outra.
        </p>
      </div>
    </div>
  );
}
