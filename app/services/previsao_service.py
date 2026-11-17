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

def calcular_posicoes_mensais(meses: list[str]) -> np.ndarray:
    """Converte meses em posições que respeitam intervalos reais."""

    datas = pd.to_datetime(meses)

    inicio = datas.min()

    posicoes = (
        (datas.year - inicio.year) * 12
        + (datas.month - inicio.month)
    )

    return np.asarray(posicoes, dtype=float)


def prever_naive(
    serie: list[float],
    periodos: int = 1
) -> list[float]:
    """Prevê os próximos períodos usando o último valor."""

    if periodos <= 0:
        return []

    if not serie:
        return [0.0] * periodos

    ultimo_valor = max(0.0, float(serie[-1]))

    return [
        round(ultimo_valor, 2)
        for _ in range(periodos)
    ]

def prever_regressao(
    serie: list[float],
    periodos: int = 1,
    meses: list[str] | None = None
) -> list[float]:
    """Regressão linear usando a posição real dos meses."""

    if periodos <= 0:
        return []

    if not serie:
        return [0.0] * periodos

    if meses is not None and len(meses) != len(serie):
        raise ValueError(
            "A quantidade de meses deve ser igual "
            "à quantidade de valores."
        )

    if len(serie) < 3:
        return [float(serie[-1])] * periodos

    if meses is not None:
        posicoes = calcular_posicoes_mensais(meses)
    else:
        posicoes = np.arange(len(serie), dtype=float)

    X = posicoes.reshape(-1, 1)
    y = np.asarray(serie, dtype=float)

    modelo = LinearRegression()
    modelo.fit(X, y)

    ultima_posicao = float(posicoes[-1])
    previsoes = []

    for horizonte in range(1, periodos + 1):
        proxima_posicao = ultima_posicao + horizonte

        valor = float(
            modelo.predict([[proxima_posicao]])[0]
        )

        valor = max(0.0, valor)
        previsoes.append(round(valor, 2))

    return previsoes

def prever_sma(serie: list[float], periodos: int = 1, janela: int = 3) -> list[float]:
    if not serie:
        return [0] * periodos
    janela = min(janela, len(serie))
    media = sum(serie[-janela:]) / janela
    return [round(media, 2)] * periodos



def prever_kpi(
    serie: list[float],
    metodo: str,
    periodos: int = 3,
    meses: list[str] | None = None
) -> list[float]:

    if metodo == "sma":
        return prever_sma(serie, periodos)

    return prever_regressao(
        serie,
        periodos,
        meses=meses
    )



# ============================================================
# Busca dados + calcula
# ============================================================


def _buscar_serie(tabela: str, coluna: str, meses: int = 12) -> pd.DataFrame:
    if supabase is None:
        return pd.DataFrame()

    resp = (
        supabase.table(tabela)
        .select(f"mes_referencia, {coluna}")
        .order("mes_referencia", desc=True)
        .limit(meses)
        .execute()
    )

    df = pd.DataFrame(resp.data or [])

    if not df.empty:
        df["mes_referencia"] = pd.to_datetime(
            df["mes_referencia"]
        )

        df = df.sort_values(
            "mes_referencia"
        ).reset_index(drop=True)

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

                
                # Converte os valores para números, preservando ausências
                df[coluna] = pd.to_numeric(df[coluna], errors="coerce")

                # Remove apenas observações sem valor para este indicador
                df_validos = df.dropna(subset=[coluna]).copy()

                if df_validos.empty:
                    raise ValueError(
                        f"Não existem valores válidos para o indicador {coluna}."
                    )

                # Mantém os valores e os meses correspondentes alinhados
                serie = df_validos[coluna].astype(float).tolist()

                meses = (
                    df_validos["mes_referencia"]
                    .dt.strftime("%Y-%m")
                    .tolist()
                )

                metodo = METODO_POR_KPI.get(coluna, "regressao")
                
                if len(serie) > 12:
                    serie = serie[-12:]
                    meses = meses[-12:]

                previsoes = prever_kpi(
                    serie,
                    metodo,
                    periodos,
                    meses=meses
                )
                ultimo_mes_valido = df_validos["mes_referencia"].max()

                futuros = _meses_futuros(ultimo_mes_valido, periodos)

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
        df = _buscar_serie(
            "relatorios_operacionais_mensais",
            coluna,
            meses=12
        )

        if df.empty:
            return {"erro": "sem dados"}

        df = df.copy()

        df[coluna] = pd.to_numeric(
            df[coluna],
            errors="coerce"
        )

        df = df.dropna(subset=[coluna])
        df = df.sort_values("mes_referencia")

        if len(df) < 2:
            return {"erro": "dados insuficientes"}

        serie = df[coluna].astype(float).tolist()

        meses = (
            df["mes_referencia"]
            .dt.strftime("%Y-%m")
            .tolist()
        )

        realizado = serie[-1]
        mes_atual = meses[-1]

        serie_anterior = serie[:-1]
        meses_anteriores = meses[:-1]

        metodo = METODO_POR_KPI.get(
            coluna,
            "regressao"
        )

        
        # Calcula a distância real entre os meses
        data_anterior = pd.to_datetime(meses_anteriores[-1])
        data_atual = pd.to_datetime(mes_atual)

        horizonte = (
            (data_atual.year - data_anterior.year) * 12
            + (data_atual.month - data_anterior.month)
        )

        if horizonte <= 0:
            return {
                "erro": "Datas inválidas para comparação."
            }

        # Gera previsões até o mês realizado
        previsoes = prever_kpi(
            serie_anterior,
            metodo,
            periodos=horizonte,
            meses=meses_anteriores
        )

        # Seleciona a previsão correspondente ao mês realizado
        previsto = previsoes[-1]


        # Erro absoluto
        erro_absoluto = abs(realizado - previsto)

        # Desvio percentual só existe se previsto != 0
        if previsto != 0:
            desvio_pct = (
                (realizado - previsto) / previsto
            ) * 100
            desvio_pct = round(desvio_pct, 1)
        else:
            desvio_pct = None

        return {
            "mes": mes_atual,
            "previsto": round(previsto, 2),
            "realizado": round(realizado, 2),
            "erro_absoluto": round(erro_absoluto, 2),
            "desvio_pct": desvio_pct,
        }

    except Exception as exc:
        return {"erro": str(exc)}