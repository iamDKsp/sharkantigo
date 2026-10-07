"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ConfiguracoesSistema {
  perguntar_whatsapp_renovacao: boolean;
  preservar_dia_base_reprogramacao: boolean;
  regra_carencia_30_dias: boolean;
}

export async function obterConfiguracoesSistema(): Promise<ConfiguracoesSistema> {
  try {
    const configs = await prisma.configuracao.findMany({
      where: {
        chave: {
          in: [
            "perguntar_whatsapp_renovacao",
            "preservar_dia_base_reprogramacao",
            "regra_carencia_30_dias",
          ],
        },
      },
    });

    const mapa = new Map(configs.map((c) => [c.chave, c.valor]));

    return {
      perguntar_whatsapp_renovacao: mapa.get("perguntar_whatsapp_renovacao") === "true",
      preservar_dia_base_reprogramacao: mapa.get("preservar_dia_base_reprogramacao") === "true",
      regra_carencia_30_dias: mapa.get("regra_carencia_30_dias") === "true",
    };
  } catch (error) {
    console.error("Erro ao carregar configurações do sistema:", error);
    return {
      perguntar_whatsapp_renovacao: false,
      preservar_dia_base_reprogramacao: false,
      regra_carencia_30_dias: false,
    };
  }
}

export async function salvarConfiguracaoSistema(
  chave: "perguntar_whatsapp_renovacao" | "preservar_dia_base_reprogramacao" | "regra_carencia_30_dias",
  valor: boolean
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await prisma.configuracao.upsert({
      where: { chave },
      create: {
        chave,
        valor: valor ? "true" : "false",
      },
      update: {
        valor: valor ? "true" : "false",
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/perfil");
    revalidatePath("/emprestimos");
    revalidatePath("/cobrancas");
    revalidatePath("/");
    return { ok: true };
  } catch (error: any) {
    console.error(`Erro ao salvar configuração ${chave}:`, error);
    return { ok: false, erro: error.message || "Erro ao salvar configuração" };
  }
}
