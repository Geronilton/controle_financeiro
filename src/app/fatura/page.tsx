
import { prisma } from "@/app/lib/prisma";
import FaturaParticipante from "@/app/componentes/faturaParticipante";
import SeletorFatura from "@/app/componentes/seletorFatura";
import styles from "./page.module.css";
import { exigirUsuarioId } from "../lib/auth";

type Props = {
  searchParams: Promise<{
    participante?: string;
    mes?: string;
    ano?: string;
  }>;
};

export default async function Fatura({
  searchParams,
}: Props) {
   const usuarioId = await exigirUsuarioId();
  const params = await searchParams;

  const hoje = new Date();

  const mes =
    Number(params.mes) ||
    hoje.getMonth() + 1;

  const ano =
    Number(params.ano) ||
    hoje.getFullYear();

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

  const participanteEu =
    participantes.find(
      (participante) =>
        participante.nome === "Eu"
    );

  const participanteSelecionado =
    params.participante ||
    participanteEu?.id.toString() ||
    "todos";

  /*
   * Se estiver selecionado "todos",
   * mostramos a fatura de cada participante.
   */
  if (participanteSelecionado === "todos") {

    return (
      <main className={styles.container}>

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              CONTROLE FINANCEIRO
            </span>

            <h1>Faturas</h1>

            <p>
              Acompanhe os gastos por participante
              e por mês.
            </p>
          </div>
        </header>

        <section className={styles.controles}>
          <SeletorFatura
            participantes={participantes}
            participanteSelecionado={
              participanteSelecionado
            }
            mes={mes}
            ano={ano}
          />
        </section>

        <section>
          {participantes.map(
            (participante) => (

              <FaturaParticipante
                key={participante.id}
                participanteId={
                  participante.id
                }
                participanteNome={
                  participante.nome
                }
                mes={mes}
                ano={ano}
                mostrarAcesso={true}
              />

            )
          )}
        </section>

      </main>
    );
  }

  /*
   * Fatura de um participante específico.
   */

  const participanteAtual =
    participantes.find(
      (participante) =>
        participante.id ===
        Number(participanteSelecionado)
    );

  if (!participanteAtual) {
    return (
      <main className={styles.container}>
        <p>
          Participante não encontrado.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.container}>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            CONTROLE FINANCEIRO
          </span>

          <h1>Faturas</h1>

          <p>
            Acompanhe os gastos por participante
            e por mês.
          </p>
        </div>
      </header>

      <section className={styles.controles}>
        <SeletorFatura
          participantes={participantes}
          participanteSelecionado={
            participanteSelecionado
          }
          mes={mes}
          ano={ano}
        />
      </section>

      <FaturaParticipante
        participanteId={
          participanteAtual.id
        }
        participanteNome={
          participanteAtual.nome
        }
        mes={mes}
        ano={ano}
      />
      

    </main>
  );
}

