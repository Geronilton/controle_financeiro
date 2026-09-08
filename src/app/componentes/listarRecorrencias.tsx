import { Ativar_recorrencia, Listar_recorrencias, Pausar_recorrencia } from "@/app/actions/lancamento";
import styles from "@/app/styles/listagem.module.css";

export default async function ListarRecorrencias() {
  const recorrencias = await Listar_recorrencias();

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Recorrências</h2>
          <p>Veja suas despesas e receitas recorrentes</p>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Periodicidade</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {recorrencias.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={styles.empty}
                >
                  Nenhuma recorrência cadastrada.
                </td>
              </tr>
            ) : (
              recorrencias.map((recorrencia) => (
                <tr key={recorrencia.id}>
                  <td>
                    <strong>
                      {recorrencia.descricao}
                    </strong>
                  </td>

                  <td>
                    R${" "}
                    {Number(
                      recorrencia.valor
                    ).toFixed(2)}
                  </td>

                  <td>
                    {recorrencia.periodicidade}
                  </td>

                  <td>
                    {new Date(
                      recorrencia.vencimento
                    ).toLocaleDateString("pt-BR")}
                  </td>

                  <td>
                    {recorrencia.ativo
                      ? "Ativa"
                      : "Pausada"}
                  </td>

                  <td>
                 <div className={styles.acoes}>
                      {recorrencia.ativo ? (
                        <form
                          action={Pausar_recorrencia.bind(
                            null,
                            recorrencia.id
                          )}
                        >
                          <button
                            type="submit"
                            className={styles.apagar}
                          >
                            Pausar
                          </button>
                        </form>
                      ) : (
                        <form
                          action={Ativar_recorrencia.bind(
                            null,
                            recorrencia.id
                          )}
                        >
                          <button
                            type="submit"
                            className={styles.editar}
                          >
                            Ativar
                          </button>
                        </form>
                      )}
                    </div>
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