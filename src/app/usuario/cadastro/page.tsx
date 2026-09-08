import { Cadastrar_usuario } from "@/app/actions/usuario";
import styles from "@/app/lancamento/novo/page.module.css";

export default async function Cadastro (){

    return(
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Cadastro</h2>
        <form action={Cadastrar_usuario} >
          <label className="labelNome" htmlFor="nome">Nome</label>
          <br />
          <input 
            className="inputNome" 
            type="text"
            id="nome"
            name="nome"
            placeholder="Digite seu nome"
          />
          <br />

          <label className="labelEmail" htmlFor="email">Email</label>
          <br />
          <input 
            className="inputEmail" 
            type="email"
            id="email"
            name="email"
            placeholder="Digite seu email"
          />
          <br />
          
          <label className="labelPass" htmlFor="password">Senha</label>
          <br />
          <input 
            className="inputPass" 
            type="password"
            id="password"
            name="senha"
            placeholder="Digite sua senha"
          />
          <br />

          <button 
            className="buttonSubmit" 
            type="submit"
          >
            Cadastrar
          </button>
        </form>
      </div>  
    </div>

    )
}