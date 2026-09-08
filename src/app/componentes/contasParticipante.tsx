import Link from "next/link";
import styles from "@/app/styles/contasParticipantes.module.css";

type Participante = {
  id: number;
  nome: string;
};

type Props = {
  participantes: Participante[];
  participanteSelecionado?: number;
};

export default function ContasParticipantes({
  participantes,
  participanteSelecionado,
}: Props) {
  return (
    <section className={styles.container}>

      <div className={styles.header}>
        <div>
          <h2>Contas</h2>
          <p>Selecione um participante</p>
        </div>
      </div>

      <div className={styles.lista}>
        {participantes.map((participante) => {
          const selecionado =
            participante.id === participanteSelecionado;

          return (
            <Link
              key={participante.id}
              href={`/?participante=${participante.id}`}
              className={`${styles.participante} ${
                selecionado ? styles.selecionado : ""
              }`}
            >
              <span className={styles.icone}>
                {participante.nome === "Eu" ? "👤" : "👥"}
              </span>

              <strong>{participante.nome}</strong>
            </Link>
          );
        })}
      </div>

    </section>
  );
}