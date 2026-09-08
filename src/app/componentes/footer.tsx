import styles from "@/app/styles/footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>Fluxo de Caixa</strong>
        <span>Organize suas finanças de forma simples.</span>
      </div>

      <span className={styles.version}>
        © 2026 • v1.0
      </span>
    </footer>
  );
}