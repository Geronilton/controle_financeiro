import { Login_usuario } from "@/app/actions/usuario";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            CONTROLE FINANCEIRO
          </span>

          <h1>Entrar</h1>

          <p>
            Acesse sua conta para continuar.
          </p>
        </div>

        <form
          action={Login_usuario}
          className={styles.formulario}
        >
          <div className={styles.campo}>
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="senha">
              Senha
            </label>

            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.botao}
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}