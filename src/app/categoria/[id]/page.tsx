import Styles from "@/app/lancamento/novo/page.module.css";
import {Editar_categoria} from "@/app/actions/categoria";
import { prisma } from "@/app/lib/prisma";
import { notFound } from "next/navigation";
import { exigirUsuarioId } from "@/app/lib/auth";


export default async function editarCategoria(
    {params}: {params: Promise<{id: string}>}
)
{
  const {id} = await params;
    const usuarioId = await exigirUsuarioId();
  const categoriaId = Number(id);

  const categoria = await prisma.categoria.findUnique({
    where: {
      id: categoriaId,
      usuarioId,
    },
  });

  if (!categoria) {
    notFound();
  }
    return (

    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2>Editar Categoria</h2>

     <form action={Editar_categoria.bind(null, categoriaId)} className={Styles.formulario}>

        <label>Nome</label>
        <input
          type="text"
          name="nome"
          defaultValue={categoria?.nome}
          required
        />

        <label>Tipo</label>
        <select
          name="tipo"
          required
          defaultValue={categoria.tipo ?? ""}
        >
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
        </select>

        <button type="submit">
          Salvar
        </button>

      </form>
      </div>
    </div>
    )
}