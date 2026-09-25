'use server'
import { prisma } from "@/app/lib/prisma";
import {TipoLancamento} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuarioId } from "../lib/auth";


export async function Criar_categoria(formData: FormData){
  const nome = formData.get("nome")?.toString() ?? "";
  const tipoRaw = formData.get("tipo")?.toString();
  const tipo = tipoRaw === "AMBOS" ? null : (tipoRaw as TipoLancamento); 
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  if (!nome) {
  throw new Error("Nome da categoria é obrigatório.");
  }
  try {
    await prisma.categoria.create({
    data: {
      nome,
      tipo,
      usuarioId,
    },
  });

  } catch (error) {
    console.log("Erro ao criar categoria:",error);
    throw new Error("Não foi possível criar a categoria.");
  }  
  revalidatePath("/categoria");
  revalidatePath("/categoria/listar");
  redirect("/categoria/listar")
}

export async function Listar_categorias(){

  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  try {
   return await prisma.categoria.findMany({
    where: {
      usuarioId,
      ativo: true,
    },
    orderBy: {
      nome: "asc",
    },
  });
  } catch (error) {
    console.log("Erro ao listar categorias:",error);
    return [];
  }
}

export async function Editar_categoria( id: number, formData: FormData){
  const nome = formData.get("nome")?.toString() ?? "";
  const tipo = formData.get("tipo") as TipoLancamento;
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  try {
    await prisma.categoria.update({
      where: { 
        id,
        usuarioId,
        ativo:true
       },
      data: {
        nome,
        tipo,
      },
    });

    revalidatePath(`/categoria/${id}`);
    revalidatePath("/categoria");
  } catch (error) {
    console.error(error);
    throw new Error("Erro ao atualizar categoria.");
  }

  redirect("/categoria/listar")

}

export async function excluir_categoria(id: number) {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  try {
    await prisma.categoria.update({
      where: { 
        id,
        usuarioId
      },
      data: {
        ativo: false,
      },
    });

    revalidatePath("/categoria/listar");
  } catch (error) {
    console.error(error);
    throw new Error("Erro ao excluir categoria.");
  }

  redirect("/categoria/listar")

}