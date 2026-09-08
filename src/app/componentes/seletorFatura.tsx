"use client";

import { useRouter } from "next/navigation";
import styles from "../styles/seletorFatura.module.css";

type Participante = {
  id: number;
  nome: string;
};

type Props = {
  participantes: Participante[];
  participanteSelecionado: string;
  mes: number;
  ano: number;
};

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function SeletorFatura({
  participantes,
  participanteSelecionado,
  mes,
  ano,
}: Props) {

  const router = useRouter();

  function alterarParticipante(
    participante: string
  ) {
    router.push(
      `/fatura?participante=${participante}&mes=${mes}&ano=${ano}`
    );
  }

  function alterarMes(
    novoMes: number,
    novoAno: number
  ) {
    router.push(
      `/fatura?participante=${participanteSelecionado}&mes=${novoMes}&ano=${novoAno}`
    );
  }

  function mesAnterior() {
    if (mes === 1) {
      alterarMes(12, ano - 1);
    } else {
      alterarMes(mes - 1, ano);
    }
  }

  function proximoMes() {
    if (mes === 12) {
      alterarMes(1, ano + 1);
    } else {
      alterarMes(mes + 1, ano);
    }
  }

  return (
    <div className={styles.seletor}>

      {/* PARTICIPANTES */}

      <div className={styles.participantes}>

        <button
          type="button"
          onClick={() =>
            alterarParticipante("todos")
          }
          className={
            participanteSelecionado === "todos"
              ? styles.participanteAtivo
              : styles.participante
          }
        >
          Todos
        </button>

        {participantes.map(
          (participante) => (
            <button
              key={participante.id}
              type="button"
              onClick={() =>
                alterarParticipante(
                  participante.id.toString()
                )
              }
              className={
                participanteSelecionado ===
                participante.id.toString()
                  ? styles.participanteAtivo
                  : styles.participante
              }
            >
              {participante.nome}
            </button>
          )
        )}

      </div>

      {/* MESES */}

      <div className={styles.mesesContainer}>

        <button
          type="button"
          onClick={mesAnterior}
          className={styles.navegar}
          aria-label="Mês anterior"
        >
          ←
        </button>

        <div className={styles.meses}>

          {meses.map(
            (nomeMes, index) => {

              const numeroMes =
                index + 1;

              const ativo =
                numeroMes === mes;

              return (
                <button
                  key={numeroMes}
                  type="button"
                  onClick={() =>
                    alterarMes(
                      numeroMes,
                      ano
                    )
                  }
                  className={
                    ativo
                      ? styles.mesAtivo
                      : styles.mes
                  }
                >
                  {nomeMes}
                </button>
              );
            }
          )}

        </div>

        <button
          type="button"
          onClick={proximoMes}
          className={styles.navegar}
          aria-label="Próximo mês"
        >
          →
        </button>

      </div>

      <div className={styles.ano}>
        {ano}
      </div>

    </div>
  );
}

