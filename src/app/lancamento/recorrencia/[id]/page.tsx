import { prisma } from "@/app/lib/prisma";
import { Editar_recorrencia } from "@/app/actions/lancamento";
import LancamentoForm from "../../componentes/lancamentoForm";
import { exigirUsuarioId } from "@/app/lib/auth";
import { Listar_contas_financeiras } from "@/app/actions/contaFinanceira";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatarData(data: Date | null) {
  if (!data) return "";

  return data.toISOString().split("T")[0];
}

export default async function EditarRecorrencia({
  params,
}: Props) {
  const { id } = await params;
  const usuarioId = await exigirUsuarioId();
  const recorrenciaId = Number(id);

  const recorrencia =
    await prisma.recorrencia.findUnique({
      where: {
        id: recorrenciaId,
        usuarioId
      },
    });

  if (!recorrencia) {
    return (
      <div>
        Recorrência não encontrada.
      </div>
    );
  }

  /*
   * A recorrência não possui participanteId.
   *
   * Pegamos o participante do primeiro
   * lançamento gerado por ela.
   */
  const primeiroLancamento =
    await prisma.lancamento.findFirst({
      where: {
        recorrenciaId,
        usuarioId
      },
      orderBy: {
        dataLancamento: "asc",
      },
    });

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
      action={Editar_recorrencia.bind(
        null,
        recorrencia.id
      )}

      tipoInicial={recorrencia.tipo}

      descricao={recorrencia.descricao}

      valor={Number(recorrencia.valor)}

      status={recorrencia.status}

      formaPagamento={
        recorrencia.formaPagamento ?? ""
      }

      periodicidade={
        recorrencia.periodicidade
      }

      dataLancamento={
        primeiroLancamento
          ? formatarData(
              primeiroLancamento.dataLancamento
            )
          : ""
      }

      dataVencimento={formatarData(
        recorrencia.vencimento
      )}

      categoriaId={
        recorrencia.categoriaId
      }

      participanteId={
        primeiroLancamento?.participanteId
      }

      categorias={categorias}

      participantes={participantes}

      contasFinanceiras={contasFinanceiras}

      modoEdicao

      modoRecorrencia
    />
  );
}