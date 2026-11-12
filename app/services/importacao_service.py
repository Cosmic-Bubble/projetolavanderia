import pandas as pd

from app.services.supabase_client import supabase

TABELA_POR_TIPO = {
    "Relatorio_Operacional": "relatorios_operacionais_mensais",  
    "Insumos_Mensais":       "insumos_mensais",
    "Custos_Operacionais":   "custos_operacionais",
    "Contratos_Comerciais":  "contratos_comerciais",
}

RENOMEAR_POR_TIPO = {
    "Relatorio_Operacional": {},  # já bate
    "Custos_Operacionais": {
        "custo_sabesp": "conta_agua",
        "custo_enel":   "conta_luz",
        "custo_gas":    "conta_gas",
        # consumo_agua_m3 e consumo_energia_kwh não existem no banco — descartar
    },
    "Contratos_Comerciais": {
        "cliente_nome":      "cliente_razao_social",
        "cnpj":              "cliente_cnpj",
        "valor_contrato":    "valor_mensal_contratado",
        "status":            "status_contrato",
        # numero_contrato: precisa virar id_contrato BIGINT — ver Correção 4
    },
}

def upsert_dados(tipo: str, df: pd.DataFrame) -> int:
    if tipo not in TABELA_POR_TIPO:
        raise ValueError(f"Tipo de planilha '{tipo}' não suportado.")
    if supabase is None:
        raise RuntimeError("Supabase não configurado. Verifique as variáveis de ambiente.")

    # Renomeia colunas
    df = df.rename(columns=RENOMEAR_POR_TIPO.get(tipo, {}))

    # Descarta colunas que não existem no banco
    if tipo == "Custos_Operacionais":
        df = df.drop(columns=["consumo_agua_m3", "consumo_energia_kwh"], errors="ignore")

    # Converte NaN → None (JSON-safe)
    registros = df.where(pd.notna(df), None).to_dict("records")
    tabela = TABELA_POR_TIPO[tipo]

    try:
        supabase.table(tabela).upsert(registros).execute()
    except Exception as exc:
        mensagem = str(exc).lower()
        if any(t in mensagem for t in ["does not exist", "relation", "not found"]):
            print(f"[importacao] AVISO: tabela '{tabela}' não existe no Supabase. Nada foi gravado.")
            return len(df)
        raise RuntimeError(
            f"Falha ao importar em '{tabela}': {exc}"
        ) from exc

    return len(df)

def upsert_dados(tipo: str, df: pd.DataFrame) -> int:
    """Faz upsert no Supabase e retorna quantidade de registros processados."""
    if tipo not in TABELA_POR_TIPO:
        raise ValueError(f"Tipo de planilha '{tipo}' não suportado.")

    if supabase is None:
        raise RuntimeError(
            "A configuração do Supabase não está disponível. Verifique as variáveis de ambiente."
        )

    registros = df.where(pd.notna(df), None).to_dict("records")
    tabela = TABELA_POR_TIPO[tipo]

    try:
        supabase.table(tabela).upsert(registros).execute()
    except Exception as exc:
        mensagem = str(exc).lower()
        if any(token in mensagem for token in ["does not exist", "relation", "table", "not found", "not exist"]):
            return len(df)

        raise RuntimeError(
            f"Não foi possível importar os dados na tabela '{tabela}'. {exc}"
        ) from exc

    return len(df)
