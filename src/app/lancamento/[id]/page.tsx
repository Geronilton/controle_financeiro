import {
  Editar_lancamento,
} from "@/app/actions/lancamento";
import { prisma } from "@/app/lib/prisma";
import LancamentoForm from "../componentes/lancamentoForm";
import { Listar_contas_financeiras } from "@/app/actions/contaFinanceira";
import { exigirUsuarioId } from "@/app/lib/auth";

type Props = {
  params: Promise<{
    id: string;
    usuarioId:number
  }>;
};

export default async function EditarLancamento({
  params,
}: Props) {

  const { id } = await params;
  const usuarioId = await exigirUsuarioId();
  const lancamento =
    await prisma.lancamento.findUnique({
      where: {
        id: Number(id),
        usuarioId
      },
    });

  if (!lancamento) {
    return <div>Lançamento não encontrado.</div>;
  }

  const categorias =
    await prisma.categoria.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

  const participantes =
    await prisma.participante.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

  const formatarData = (data: Date | null) =>
    data
      ? data.toISOString().split("T")[0]
      : "";
  const contasFinanceiras = (
    await Listar_contas_financeiras()
  ).map((conta) => ({
    ...conta,
    saldo: Number(conta.saldo),
    objetivo: conta.objetivo
      ? Number(conta.objetivo)
      : null,
  }));
  return (
    <LancamentoForm
      action={Editar_lancamento.bind(
        null,
        lancamento.id
      )}
      tipoInicial={lancamento.tipo}
      descricao={lancamento.descricao}
      valor={Number(lancamento.valor)}
      status={lancamento.status}
      formaPagamento={
        lancamento.formaPagamento ?? ""
      }
      dataLancamento={formatarData(
        lancamento.dataLancamento
      )}
      dataVencimento={formatarData(
        lancamento.dataVencimento
      )}
      categoriaId={lancamento.categoriaId}
      participanteId={
        lancamento.participanteId
      }
      categorias={categorias}
      participantes={participantes}
      contasFinanceiras={contasFinanceiras}
      modoEdicao
    />
  );
}