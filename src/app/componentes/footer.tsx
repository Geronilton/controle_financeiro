import styles from "@/app/styles/footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>MiReis</strong>
        <span>"Conhecer o valor de cada moeda também é uma forma de 
          proteger seus sonhos."</span>
      </div>

      <span className={styles.version}>
        © 2026 • v1.0
      </span>
    </footer>
  );
}