import {
  excluir_participante,
  Listar_participantes,
} from "@/app/actions/participante";

import Link from "next/link";
import styles from "@/app/styles/listagem.module.css";

export default async function ListarParticipantes() {
  const participantes = await Listar_participantes();

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Participantes</h2>
          <p>Pessoas relacionadas à sua conta</p>
        </div>

        <Link
          href="/participantes/novo"
          className={styles.newButton}
        >
          + Novo participante
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Apelido</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {participantes.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  Nenhum participante cadastrado.
                </td>
              </tr>
            ) : (
              participantes.map((participante) => (
                <tr key={participante.id}>
                  <td>
                    <strong>{participante.nome}</strong>
                  </td>

                  <td>
                    {participante.telefone || "-"}
                  </td>

                  <td>
                    {participante.apelido || "-"}
                  </td>

                  <td>
                    {participante.nome !== "Eu" ? (
                      <div className={styles.actions}>
                        <Link
                          href={`/participantes/${participante.id}`}
                          className={styles.editButton}
                        >
                          Editar
                        </Link>

                        <form
                          action={excluir_participante.bind(
                            null,
                            participante.id
                          )}
                        >
                          <button
                            type="submit"
                            className={styles.deleteButton}
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className={styles.badge + " " + styles.neutro}>
                        Conta principal
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}