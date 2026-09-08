import Link from "next/link";
import {
  Listar_lancamento,
  Excluir_lancamento,
  Pausar_recorrencia,
} from "@/app/actions/lancamento";
import styles from "@/app/styles/listarLancamento.module.css";
import { exigirUsuarioId } from "@/app/lib/auth";

type Props = {
  limite?: number;
};

export default async function ListarLancamento({
  limite,
}: Props) {

  const usuarioId = await exigirUsuarioId();
  const lancamentos = await Listar_lancamento();

  const lancamentosExibidos = limite
    ? lancamentos.slice(0, limite)
    : lancamentos;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Lançamentos</h2>

          <p>
            {limite
              ? "Movimentações mais recentes"
              : "Movimentações financeiras"}
          </p>
        </div>

        <span className={styles.total}>
          {lancamentosExibidos.length} lançamento(s)
        </span>
      </div>

      <div className={styles.lista}>
        {lancamentosExibidos.map((lancamento) => {
          const recorrente = !!lancamento.recorrenciaId;

          return (
            <article
              key={lancamento.id}
              className={`${styles.card} ${
                lancamento.tipo === "ENTRADA"
                  ? styles.entrada
                  : styles.saida
              }`}
            >
              <div className={styles.cardPrincipal}>
                <div className={styles.info}>
                  <span className={styles.tipo}>
                    {lancamento.tipo}
                  </span>

                  <h3>{lancamento.descricao}</h3>
                </div>

                <strong
                  className={`${styles.valor} ${
                    lancamento.tipo === "ENTRADA"
                      ? styles.valorEntrada
                      : styles.valorSaida
                  }`}
                >
                  {lancamento.tipo === "ENTRADA"
                    ? "+"
                    : "-"}{" "}
                  R${" "}
                  {Number(lancamento.valor).toFixed(2)}
                </strong>
              </div>

              <div className={styles.detalhes}>
                <div>
                  <span>Data</span>

                  <strong>
                    {new Date(
                      lancamento.dataLancamento
                    ).toLocaleDateString("pt-BR")}
                  </strong>
                </div>

                <div>
                  <span>Status</span>

                  <strong className={styles.status}>
                    {lancamento.status}
                  </strong>
                </div>

                <div>
                  <span>Pagamento</span>

                  <strong>
                    {lancamento.formaPagamento ??
                      "Não informado"}
                  </strong>
                </div>

                {lancamento.dataVencimento && (
                  <div>
                    <span>Vencimento</span>

                    <strong>
                      {new Date(
                        lancamento.dataVencimento
                      ).toLocaleDateString("pt-BR")}
                    </strong>
                  </div>
                )}

                <div>
                  <span>Valor pago</span>

                  <strong>
                    R${" "}
                    {Number(
                      lancamento.valorPago
                    ).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className={styles.acoes}>
                <Link
                  href={
                    recorrente
                      ? `/lancamento/recorrencia/${lancamento.recorrenciaId}`
                      : `/lancamento/${lancamento.id}`
                  }
                  className={styles.editar}
                >
                  Editar
                </Link>

                {recorrente ? (
                  <form
                    action={Pausar_recorrencia.bind(
                      null,
                      lancamento.recorrenciaId!
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
                    action={Excluir_lancamento.bind(
                      null,
                      lancamento.id
                    )}
                  >
                    <button
                      type="submit"
                      className={styles.apagar}
                    >
                      Apagar
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}