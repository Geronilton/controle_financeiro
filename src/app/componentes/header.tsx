import Menu from "@/app/componentes/menu";
import styles from "@/app/styles/header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Menu />

        <div className={styles.brand}>
          <strong>Fluxo de Caixa</strong>
          <span>Controle financeiro</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.user}>
          <div className={styles.avatar}>
            E
          </div>

          <div className={styles.userInfo}>
            <strong>Eu</strong>
            <span>Minha conta</span>
          </div>
        </div>
      </div>
    </header>
  );
}