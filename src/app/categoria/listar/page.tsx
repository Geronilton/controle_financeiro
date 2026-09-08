import { excluir_categoria, Listar_categorias } from "@/app/actions/categoria";
import Link from "next/link";
import styles from "@/app/styles/listagem.module.css";

export default async function Categorias() {
  const categorias = await Listar_categorias();

  return (
    <section className={styles.container}>

      <div className={styles.header}>
        <div>
          <h2>Categorias</h2>
          <p>Organize suas entradas e saídas</p>
        </div>

        <Link href="/categoria/novo" className={styles.newButton}>
          + Nova categoria
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            ) : (
              categorias.map((categoria) => (
                <tr key={categoria.id}>
                  <td>
                    <strong>{categoria.nome}</strong>
                  </td>

                  <td>
                    <span
                      className={`${styles.badge} ${
                        categoria.tipo === "ENTRADA"
                          ? styles.entrada
                          : categoria.tipo === "SAIDA"
                          ? styles.saida
                          : styles.neutro
                      }`}
                    >
                      {categoria.tipo}
                    </span>
                  </td>

                  <td>
                    <div className={styles.actions}>
                      <Link
                        href={`/categoria/${categoria.id}`}
                        className={styles.editButton}
                      >
                        Editar
                      </Link>

                      <form
                        action={excluir_categoria.bind(
                          null,
                          categoria.id
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