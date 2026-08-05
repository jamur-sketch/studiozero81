import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LIMITE_FALTAS_AVISO, type ResumoTurma } from "../lib/chamada";
import { formatarBr } from "../lib/datas";

/**
 * Frequência criança a criança. Mesma tabela para a professora e para a
 * gestão — muda só para onde o nome leva.
 */
export function TabelaFrequencia({
  resumo,
  linkDoAluno,
}: {
  resumo: ResumoTurma;
  linkDoAluno?: (alunoId: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Estudante</TableHead>
            <TableHead className="text-center">Dias presentes</TableHead>
            <TableHead className="text-center">Faltas</TableHead>
            <TableHead className="min-w-[160px]">Frequência</TableHead>
            <TableHead>Última falta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumo.linhas.map((linha) => {
            const emAlerta = linha.faltas >= LIMITE_FALTAS_AVISO;
            return (
              <TableRow key={linha.aluno.id}>
                <TableCell>
                  {linkDoAluno ? (
                    <Link
                      to={linkDoAluno(linha.aluno.id)}
                      className="font-medium hover:underline underline-offset-4"
                    >
                      {linha.aluno.nome}
                    </Link>
                  ) : (
                    <span className="font-medium">{linha.aluno.nome}</span>
                  )}
                  {emAlerta && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
                      {linha.faltas} faltas
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {linha.diasPresentes}
                  <span className="text-muted-foreground">/{linha.diasLancados}</span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center tabular-nums",
                    emAlerta && "font-semibold text-red-600 dark:text-red-400",
                  )}
                >
                  {linha.faltas}
                </TableCell>
                <TableCell>
                  {linha.percentual === null ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Progress value={linha.percentual} className="h-2 w-24" />
                      <span
                        className={cn(
                          "text-sm tabular-nums",
                          linha.percentual < 75 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {linha.percentual.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {linha.ultimaFalta ? formatarBr(linha.ultimaFalta) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
