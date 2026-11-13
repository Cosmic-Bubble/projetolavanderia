"""
Serviço de previsão de demanda.
NÃO deve importar de app.routes nem de app.services.previsao_service.
Este módulo é PURO (sem Flask).
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from app.services.supabase_client import supabase


# ============================================================
# Mapeamento de KPIs → tabela de origem
# ============================================================

KPI_POR_TABELA = {
    "relatorios_operacionais_mensais": [
        "visitas_qtd",
        "banhos_qtd",
        "banhos_receita",
        "kits_distribuidos_qtd",
        "social_atendimentos_qtd",
        "social_pecas_qtd",
        "social_peso_kg",
        "social_ciclos_qtd",
        "social_receita",
        "comercial_ciclos_toalhas",
        "comercial_toalhas_qtd",
        "comercial_receita",
        "bazar_receita",
    ],
    "custos_operacionais": [
        "conta_agua",
        "conta_luz",
        "conta_gas",
    ],
}

METODO_POR_KPI = {
    # Oscilam muito → SMA
    "visitas_qtd":              "sma",
    "kits_distribuidos_qtd":    "sma",
    "bazar_receita":            "sma",
    "conta_agua":               "sma",
    "conta_luz":                "sma",
    "conta_gas":                "sma",
    "comercial_receita":        "sma", 
    "banhos_qtd":               "regressao",
    "banhos_receita":           "regressao",
    "social_atendimentos_qtd":  "regressao",
    "social_pecas_qtd":         "regressao",
    "social_peso_kg":           "regressao",
    "social_ciclos_qtd":        "regressao",
    "social_receita":           "regressao",
    "comercial_ciclos_toalhas": "regressao",
    "comercial_toalhas_qtd":    "regressao",
}


# ============================================================
# Métodos de previsão
# ============================================================

def prever_regressao(serie: list[float], periodos: int = 1) -> list[float]:
    """Regressão linear com amortecimento (evita projeções irreais)."""
    if not serie:
        return [0] * periodos
    if len(serie) < 3: # Se tiver poucos dados, só repete o último
        return [float(serie[-1])] * periodos

    X = np.arange(len(serie)).reshape(-1, 1)
    y = np.array(serie, dtype=float)
    modelo = LinearRegression().fit(X, y)
    
    previsoes = []
    ultimo_valor = serie[-1]
    
    # Pega a inclinação (tendência) da reta
    inclinacao = modelo.coef_[0]
    
    for i in range(periodos):
        # Amortece a tendência a cada mês (fator de 0.85)
        valor_projetado = ultimo_valor + (inclinacao * (0.85 ** i))
        
        # Nunca deixa prever valor negativo
        valor_projetado = max(0.0, valor_projetado)
        previsoes.append(round(valor_projetado, 2))
        ultimo_valor = valor_projetado
        
    return previsoes

def prever_sma(serie: list[float], periodos: int = 1, janela: int = 3) -> list[float]:
    if not serie:
        return [0] * periodos
    janela = min(janela, len(serie))
    media = sum(serie[-janela:]) / janela
    return [round(media, 2)] * periodos


def prever_kpi(serie: list[float], metodo: str, periodos: int = 3) -> list[float]:
    if metodo == "sma":
        return prever_sma(serie, periodos)
    return prever_regressao(serie, periodos)


# ============================================================
# Busca dados + calcula
# ============================================================

def _buscar_serie(tabela: str, coluna: str, meses: int = 12) -> pd.DataFrame:
    if supabase is None:
        return pd.DataFrame()
    resp = (
        supabase.table(tabela)
        .select(f"mes_referencia, {coluna}")
        .order("mes_referencia", desc=False)
        .limit(meses) 
        .execute()
    )
    df = pd.DataFrame(resp.data or [])
    if not df.empty:
        df["mes_referencia"] = pd.to_datetime(df["mes_referencia"])
        df = df.sort_values("mes_referencia")
    return df

def _meses_futuros(ultimo_mes: pd.Timestamp, periodos: int) -> list[str]:
    return pd.date_range(
        ultimo_mes + pd.offsets.MonthBegin(1),
        periods=periodos,
        freq="MS",
    ).strftime("%Y-%m").tolist()


def gerar_previsoes(periodos: int = 3) -> dict:
    resultado = {}
    for tabela, kpis in KPI_POR_TABELA.items():
        for coluna in kpis:
            try:
                df = _buscar_serie(tabela, coluna, meses=24) 
                
                if df.empty:
                    resultado[coluna] = { "historico": [], "meses_historico": [], "previsoes": [], "meses_futuros": [], "metodo": METODO_POR_KPI.get(coluna, "regressao"), "erro": "sem dados" }
                    continue

                serie = df[coluna].fillna(0).astype(float).tolist()
                meses = df["mes_referencia"].dt.strftime("%Y-%m").tolist()
                metodo = METODO_POR_KPI.get(coluna, "regressao")
                
                if len(serie) > 12:
                    serie = serie[-12:]
                    meses = meses[-12:]

                previsoes = prever_kpi(serie, metodo, periodos)
                futuros = _meses_futuros(df["mes_referencia"].max(), periodos)

                resultado[coluna] = {
                    "historico": serie,
                    "meses_historico": meses,
                    "previsoes": previsoes,
                    "meses_futuros": futuros,
                    "metodo": metodo,
                    "ultimo_valor": serie[-1],
                    "previsao_proximo": previsoes[0] if previsoes else 0,
                }
            except Exception as exc:
                resultado[coluna] = { "historico": [], "meses_historico": [], "previsoes": [], "meses_futuros": [], "metodo": METODO_POR_KPI.get(coluna, "regressao"), "erro": str(exc) }
    return resultado


def comparar_previsto_realizado(coluna: str) -> dict:
    try:
        df = _buscar_serie("relatorios_operacionais_mensais", coluna, meses=12)
        if len(df) < 2:
            return {"erro": "dados insuficientes", "previsto": 0, "realizado": 0}

        serie = df[coluna].fillna(0).astype(float).tolist()
        meses = df["mes_referencia"].dt.strftime("%Y-%m").tolist()

        realizado = serie[-1]
        mes_atual = meses[-1]

        serie_anterior = serie[:-1]
        metodo = METODO_POR_KPI.get(coluna, "regressao")
        previsto = prever_kpi(serie_anterior, metodo, periodos=1)[0]

        desvio_pct = ((realizado - previsto) / previsto * 100) if previsto > 0 else 0

        return {
            "mes": mes_atual,
            "previsto": round(previsto, 2),
            "realizado": round(realizado, 2),
            "desvio_pct": round(desvio_pct, 1),
        }
    except Exception as exc:
        return {"erro": str(exc), "previsto": 0, "realizado": 0}