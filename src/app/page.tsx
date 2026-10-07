import Link from "next/link";
import styles from "@/app/styles/home.module.css";
import ContasParticipantes from "./componentes/contasParticipante";
import FaturaParticipante from "./componentes/faturaParticipante";
import { Dados_dashboard, Processar_recorrencias } from "./actions/lancamento";
import { prisma } from "./lib/prisma";
import { obterUsuarioId } from "./lib/auth";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    participante?: string;
  }>;
};

export default async function Home({
  searchParams,
}: Props) {

  const params = await searchParams;
  const usuarioId = await obterUsuarioId();

  if (usuarioId === null) {
    redirect("/usuario/login");
  }
  try {
    await Processar_recorrencias();
  } catch (erro) {
    console.error("Erro ao processar recorrências:", erro);
  }
  const dados = await Dados_dashboard();

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

  const participanteSelecionado =
    params.participante
      ? Number(params.participante)
      : participantes.find(
          (p) => p.nome === "Eu"
        )?.id ?? participantes[0]?.id;


  const participante =
    participantes.find(
      (p) => p.id === participanteSelecionado
    );


  const hoje = new Date();
  const nomeMesAtual = hoje.toLocaleDateString("pt-BR", { month: "long" });
  const nomeMesFormatado = nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1);

  return (
    <main className={styles.container}>

      <section className={styles.header}>
        <div>
          <p>
            Controle suas movimentações financeiras.
          </p>
        </div>
      </section>


      {/* RESUMO */}

      <section className={styles.resumo}>

        <div className={styles.saldoCard}>
          <span>Saldo atual</span>

          <strong>
            R${" "}
            {dados.saldo.toLocaleString(
              "pt-BR",
              {
                minimumFractionDigits: 2,
              }
            )}
          </strong>
        </div>


        <div className={styles.resumoValores}>

          <div className={styles.entradaCard}>
            <span>Entradas</span>

            <strong>
              + R${" "}
              {dados.totalEntradas.toLocaleString(
                "pt-BR",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>


          <div className={styles.saidaCard}>
            <span>Saídas de {nomeMesFormatado}</span>

            <strong>
              - R${" "}
              {dados.totalDividas.toLocaleString(
                "pt-BR",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

        </div>

      </section>


      {/* AÇÕES */}

      <section className={styles.quickActions}>

        <Link
          href="/lancamento/novo?tipo=SAIDA"
          className={`${styles.actionButton} ${styles.divida}`}
        >
          <span className={styles.icon}>−</span>

          <div>
            <strong>Lançar dívida</strong>
            <small>Registrar uma saída</small>
          </div>
        </Link>


        <Link
          href="/lancamento/novo?tipo=ENTRADA"
          className={`${styles.actionButton} ${styles.entrada}`}
        >
          <span className={styles.icon}>+</span>

          <div>
            <strong>Lançar entrada</strong>
            <small>Registrar um recebimento</small>
          </div>
        </Link>

      </section>


      {/* CONTAS */}

      <ContasParticipantes
        participantes={participantes}
        participanteSelecionado={
          participanteSelecionado
        }
      />


      {/* FATURA */}

      {participante && (
        <FaturaParticipante
          participanteId={participante.id}
          participanteNome={participante.nome}
          mes={hoje.getMonth() + 1}
          ano={hoje.getFullYear()}
          mostrarAcesso={true}
        />
      )}

    </main>
  );
}