import pandas as pd

COLUNAS_OBRIGATORIAS = {
    "Relatorio_Operacional": [
        "mes_referencia", "visitas_qtd", "banhos_qtd", "banhos_receita",
        "kits_distribuidos_qtd", "social_atendimentos_qtd", "social_pecas_qtd",
        "social_peso_kg", "social_ciclos_qtd", "social_receita",
        "comercial_ciclos_toalhas", "comercial_toalhas_qtd",
        "comercial_receita", "bazar_receita",
    ],
    "Insumos_Mensais": [
        "mes_referencia",
        "sabao_liquido_qtd", "sabao_liquido_vol_unitario",
        "amaciante_qtd", "amaciante_vol_unitario",
        "candida_qtd", "candida_vol_unitario",
        "desinfetante_qtd", "desinfetante_vol_unitario",
        "multiuso_qtd", "alcool_qtd", "vinagre_qtd",
        "sabao_po_qtd", "sabao_pedra_qtd", "tira_mancha_pedra_qtd",
        "esponja_qtd", "seringa_qtd", "luvas_qtd",
    ],
    "Custos_Operacionais": [
        "mes_referencia", "custo_sabesp", "consumo_agua_m3",
        "custo_enel", "consumo_energia_kwh", "custo_gas",
    ],
    "Contratos_Comerciais": [
        "cnpj", "cliente_nome", "numero_contrato",
        "data_inicio", "data_fim", "valor_contrato", "status",
    ],
}

COLUNAS_NUMERICAS = {
    "Relatorio_Operacional": [
        "visitas_qtd", "banhos_qtd", "banhos_receita",
        "kits_distribuidos_qtd", "social_atendimentos_qtd",
        "social_pecas_qtd", "social_peso_kg", "social_ciclos_qtd",
        "social_receita", "comercial_ciclos_toalhas",
        "comercial_toalhas_qtd", "comercial_receita", "bazar_receita",
    ],
    "Insumos_Mensais": [
        "sabao_liquido_qtd", "sabao_liquido_vol_unitario",
        "amaciante_qtd", "amaciante_vol_unitario",
        "candida_qtd", "candida_vol_unitario",
        "desinfetante_qtd", "desinfetante_vol_unitario",
        "multiuso_qtd", "alcool_qtd", "vinagre_qtd",
        "sabao_po_qtd", "sabao_pedra_qtd", "tira_mancha_pedra_qtd",
        "esponja_qtd", "seringa_qtd", "luvas_qtd",
    ],
    "Custos_Operacionais": [
        "custo_sabesp", "consumo_agua_m3",
        "custo_enel", "consumo_energia_kwh", "custo_gas",
    ],
    "Contratos_Comerciais": ["valor_contrato"],
}

STATUS_VALIDOS_PLANILHA = {"Ativo", "Inativo", "Encerrado"}

MAPA_STATUS_BANCO = {
    "Ativo":     "ATIVO",
    "Inativo":   "SUSPENSO",
    "Encerrado": "FINALIZADO",
}


def _preencher_numeros(df: pd.DataFrame, tipo: str) -> pd.DataFrame:
    for coluna in COLUNAS_NUMERICAS.get(tipo, []):
        if coluna in df.columns:
            df[coluna] = pd.to_numeric(df[coluna], errors="coerce").fillna(0)
    return df


def _parse_datas(df: pd.DataFrame, coluna: str) -> tuple[pd.Series, list[int]]:
    """
    Converte uma coluna de datas.
    - Célula vazia/NaN → NaT (vira NULL no Supabase)
    - Célula preenchida mas inválida → erro (linha reportada)
    Retorna (series_convertida, lista_de_linhas_invalidas).
    """
    valores_originais = df[coluna]
    datas = pd.to_datetime(valores_originais, errors="coerce")

    preenchida = valores_originais.notna() & (
        valores_originais.astype(str).str.strip() != ""
    )
    invalidas = df.index[preenchida & datas.isna()].tolist()
    return datas, invalidas


def validar_planilha(df: pd.DataFrame, tipo: str) -> tuple[pd.DataFrame, list[str]]:
    """Retorna (df_normalizado, lista_de_erros). Se lista vazia → válido."""
    df = df.copy()

    if tipo not in COLUNAS_OBRIGATORIAS:
        return df, [f"Tipo de planilha '{tipo}' não é suportado."]

    colunas = COLUNAS_OBRIGATORIAS[tipo]
    faltantes = [coluna for coluna in colunas if coluna not in df.columns]
    if faltantes:
        return df, [
            f"Faltam colunas obrigatórias para '{tipo}': {', '.join(faltantes)}."
        ]

    erros: list[str] = []

    #  mes_referencia 
    if tipo in {"Relatorio_Operacional", "Insumos_Mensais", "Custos_Operacionais"}:
        datas = pd.to_datetime(df["mes_referencia"], errors="coerce")
        linhas_invalidas = df.index[datas.isna()].tolist()
        if linhas_invalidas:
            erros.append(
                "Coluna 'mes_referencia' contém valores inválidos nas linhas: "
                f"{linhas_invalidas}."
            )
        df["mes_referencia"] = datas.dt.to_period("M").dt.to_timestamp()

    # ---------- Contratos Comerciais ----------
    if tipo == "Contratos_Comerciais":
        # CNPJ
        df["cnpj"] = df["cnpj"].astype(str).str.replace(r"\D", "", regex=True)
        linhas_invalidas = df.index[df["cnpj"].str.len() != 14].tolist()
        if linhas_invalidas:
            erros.append(
                "Coluna 'cnpj' contém valores inválidos nas linhas: "
                f"{linhas_invalidas}."
            )

        # Status — FORA do if de CNPJ! Sempre executa.
        df["status"] = df["status"].astype(str).str.strip().str.title()
        invalidos = sorted(
            set(df.loc[~df["status"].isin(STATUS_VALIDOS_PLANILHA), "status"].tolist())
        )
        if invalidos:
            erros.append(
                "Coluna 'status' contém valores inválidos: "
                f"{', '.join(invalidos)}. "
                f"Use: {', '.join(sorted(STATUS_VALIDOS_PLANILHA))}."
            )
        df["status"] = df["status"].map(MAPA_STATUS_BANCO).fillna(df["status"])

        # Datas — FORA do if de CNPJ! Sempre executam.
        datas_inicio, inv_inicio = _parse_datas(df, "data_inicio")
        if inv_inicio:
            erros.append(
                "Coluna 'data_inicio' contém datas inválidas nas linhas: "
                f"{inv_inicio}."
            )
        df["data_inicio"] = datas_inicio

        datas_fim, inv_fim = _parse_datas(df, "data_fim")
        if inv_fim:
            erros.append(
                "Coluna 'data_fim' contém datas inválidas nas linhas: "
                f"{inv_fim}."
            )
        df["data_fim"] = datas_fim  # NaT vira NULL no Supabase via where(pd.notna)

    # Numéricos
    df = _preencher_numeros(df, tipo)

    return df, erros