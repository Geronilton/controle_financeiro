import Menu from "@/app/componentes/menu";
import styles from "@/app/styles/header.module.css";
import Link from "next/link";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Menu />

        <div className={styles.brand}>
           <Link href="/">
            <strong>Fluxo de Caixa</strong>
            <br />
            <span>Controle financeiro</span>
          </Link>
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