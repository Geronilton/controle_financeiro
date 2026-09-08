"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/styles/menu.module.css";
import { Logout_usuario } from "../actions/usuario";

export default function Menu() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div
        className={`${styles.overlay} ${
          aberto ? styles.overlayAberto : ""
        }`}
        onClick={() => setAberto(false)}
      />

      <aside
        className={`${styles.menu} ${
          aberto ? styles.menuAberto : ""
        }`}
      >
        <div className={styles.menuHeader}>
          <div>
            <strong>Fluxo de Caixa</strong>
            <span>Controle financeiro</span>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          <Link href="/">
            <span>▦</span>
            Dashboard
          </Link>

          <Link href="/lancamento/listar">
            <span>⇄</span>
            Lançamentos
          </Link>

          <Link href="/fatura">
            <span>▤</span>
            Faturas
          </Link>
          
          <Link href="/conta-financeira">
            <span>▣</span>
            Contas financeiras
          </Link>

          <Link href="/categoria/listar">
            <span>◈</span>
            Categorias
          </Link>

          <Link href="/participantes/listar">
            <span>♙</span>
            Participantes
          </Link>

          <Link href="/lancamento/recorrencia">
            Recorrências
          </Link>


          <div className={styles.divider} />
{/* 
          <Link href="/configuracoes">
            <span>⚙</span>
            Configurações
          </Link> */}  
        <form action={Logout_usuario}>
          <button
            type="submit"
            className={styles.botaoSair}
          >
            <span>↪</span>
            Sair
          </button>
        </form>

        </nav>

        <div className={styles.menuFooter}>
          <span>Fluxo de Caixa</span>
          <small>v1.0</small>
        </div>
      </aside>
    </>
  );
}