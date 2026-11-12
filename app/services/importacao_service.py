import pandas as pd

from app.services.supabase_client import supabase

TABELA_POR_TIPO = {
    "Relatorio_Operacional": "relatorios_operacionais_mensais",
    "Insumos_Mensais":       "insumos_mensais",
    "Custos_Operacionais":   "custos_operacionais",
    "Contratos_Comerciais":  "contratos_comerciais",
}

RENOMEAR_POR_TIPO = {
    "Relatorio_Operacional": {},
    "Custos_Operacionais": {
        "custo_sabesp": "conta_agua",
        "custo_enel":   "conta_luz",
        "custo_gas":    "conta_gas",
    },
    "Contratos_Comerciais": {
        "cliente_nome":   "cliente_razao_social",
        "cnpj":           "cliente_cnpj",
        "valor_contrato": "valor_mensal_contratado",
        "status":         "status_contrato",
    },
}

DESCARTAR_POR_TIPO = {
    "Custos_Operacionais": ["consumo_agua_m3", "consumo_energia_kwh"],
    "Contratos_Comerciais": ["numero_contrato"],
}

INSUMOS_MAP = {
    "sabao_liquido_qtd":      "Sabão Líquido",
    "amaciante_qtd":          "Amaciante",
    "candida_qtd":            "Cândida",
    "desinfetante_qtd":       "Desinfetante",
    "multiuso_qtd":           "Multiuso",
    "alcool_qtd":             "Álcool",
    "vinagre_qtd":            "Vinagre",
    "sabao_po_qtd":           "Sabão em Pó",
    "sabao_pedra_qtd":        "Sabão em Pedra",
    "tira_mancha_pedra_qtd":  "Tira-mancha",
    "esponja_qtd":            "Esponja",
    "seringa_qtd":            "Seringa",
    "luvas_qtd":              "Luvas",
}

# Helpers
def _resolver_insumo_id(nome_insumo: str) -> int:
    if supabase is None:
        raise RuntimeError("Supabase não configurado.")
    resp = (
        supabase.table("tipos_insumos")
        .select("id, nome_insumo")
        .eq("nome_insumo", nome_insumo)
        .execute()
    )
    if not resp.data:
        raise RuntimeError(
            f"Insumo '{nome_insumo}' não está cadastrado em 'tipos_insumos'."
        )
    return resp.data[0]["id"]


def _transformar_insumos(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for _, row in df.iterrows():
        mes = row["mes_referencia"]
        for coluna_planilha, nome_insumo in INSUMOS_MAP.items():
            if coluna_planilha not in df.columns:
                continue
            valor = row.get(coluna_planilha)
            if pd.isna(valor) or valor == 0:
                continue
            linhas.append({
                "insumo_id": _resolver_insumo_id(nome_insumo),
                "mes_referencia": mes,
                "quantidade_consumida": float(valor),
            })
    return pd.DataFrame(linhas)

# Upsert principal (unificado)
def upsert_dados(tipo: str, df: pd.DataFrame) -> int:
    """Faz upsert no Supabase e retorna quantidade de registros processados."""
    if tipo not in TABELA_POR_TIPO:
        raise ValueError(f"Tipo de planilha '{tipo}' não suportado.")
    if supabase is None:
        raise RuntimeError("Supabase não configurado. Verifique as variáveis de ambiente.")

    # --- Transformações específicas ---
    if tipo == "Insumos_Mensais":
        df_transformado = _transformar_insumos(df)
        if df_transformado.empty:
            return 0
        registros = df_transformado.where(pd.notna(df_transformado), None).to_dict("records")
    else:
        df = df.rename(columns=RENOMEAR_POR_TIPO.get(tipo, {}))
        df = df.drop(columns=DESCARTAR_POR_TIPO.get(tipo, []), errors="ignore")
        registros = df.where(pd.notna(df), None).to_dict("records")

    tabela = TABELA_POR_TIPO[tipo]

    try:
        supabase.table(tabela).upsert(registros).execute()
    except Exception as exc:
        mensagem = str(exc).lower()
        if any(t in mensagem for t in ["does not exist", "relation", "not found"]):
            print(f"[importacao] AVISO: tabela '{tabela}' não existe. Nada gravado.")
            return len(registros)
        raise RuntimeError(f"Falha ao importar em '{tabela}': {exc}") from exc

    return len(registros)


# Log de importação — status em MINÚSCULO para bater com o enum
def registrar_importacao(
    nome_arquivo: str,
    status: str = "sucesso",
    administrador_id: int | None = None,
) -> None:
    """
    Registra a importação em historico_importacoes.
    Status aceitos (enum do banco): 'processando', 'sucesso', 'erro'.
    """
    if supabase is None:
        print("[importacao] aviso: Supabase indisponível, log não registrado.")
        return

    # Normaliza status para o enum do banco (minúsculo)
    status_normalizado = status.strip().lower()
    if status_normalizado not in {"processando", "sucesso", "erro"}:
        print(f"[importacao] aviso: status '{status}' inválido. Usando 'erro'.")
        status_normalizado = "erro"

    try:
        resposta = supabase.table("historico_importacoes").insert({
            "nome_arquivo": nome_arquivo,
            "status_importacao": status_normalizado,
            "administrador_id": administrador_id,
        }).execute()
        print(f"[importacao] log registrado: {nome_arquivo} ({status_normalizado})")
        if resposta.data:
            print(f"[importacao]    id={resposta.data[0].get('id')}")
    except Exception as exc:
        print(f"[importacao] FALHA ao registrar log: {exc}")
        # Diagnóstico extra: mostra o payload que tentou inserir
        print(f"[importacao]    payload tentado: nome_arquivo={nome_arquivo!r}, "
              f"status_importacao={status_normalizado!r}, administrador_id={administrador_id!r}")