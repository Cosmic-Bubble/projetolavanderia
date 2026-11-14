"""
Serviço da tela "Visão Geral" (dashboard).
Módulo PURO (sem Flask). Reaproveita as funções de previsão já existentes.
"""

import pandas as pd

from app.services.supabase_client import supabase
from app.services.previsao_service import prever_kpi, METODO_POR_KPI
from app.services.comercial_service import listar_contratos_ativos

MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
               "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

COLUNAS = ["social_atendimentos_qtd", "social_peso_kg", "comercial_receita"]
HIST = 3        # meses de histórico no gráfico
FUTURO = 3      # meses de previsão no gráfico


# ------------------------------------------------------------
# Auxiliares
# ------------------------------------------------------------

def _buscar_relatorios(meses: int = 12) -> pd.DataFrame:
    """Últimos N meses (ordem cronológica) de relatorios_operacionais_mensais."""
    if supabase is None:
        return pd.DataFrame()
    resp = (
        supabase.table("relatorios_operacionais_mensais")
        .select("mes_referencia, " + ", ".join(COLUNAS))
        .order("mes_referencia", desc=True)   # pega os MAIS RECENTES
        .limit(meses)
        .execute()
    )
    df = pd.DataFrame(resp.data or [])
    if df.empty:
        return df
    df["mes_referencia"] = pd.to_datetime(df["mes_referencia"])
    return df.sort_values("mes_referencia").reset_index(drop=True)


def _serie(df: pd.DataFrame, coluna: str) -> list[float]:
    return df[coluna].fillna(0).astype(float).tolist()


def _variacao_pct(atual: float, anterior: float):
    if not anterior:
        return None
    return round((atual - anterior) / anterior * 100, 1)


def calcular_capacidade_mensal_kg() -> float:
    """Capacidade mensal máxima de lavagem (mesma conta de /api/capacidade)."""
    if supabase is None:
        return 0.0
    resp = (
        supabase.table("maquinas_capacidade")
        .select("*")
        .eq("status_operacional", "OPERACIONAL")
        .execute()
    )
    total = 0.0
    for m in resp.data or []:
        if m.get("tipo_maquina") != "LAVADORA":
            continue
        cap_nominal = float(m.get("capacidade_nominal_kg") or 0)
        tempo_ciclo = float(m.get("tempo_medio_ciclo_min") or 1)
        horas_dia = float(m.get("horas_disponiveis_dia") or 8)
        dias_semana = float(m.get("dias_operacao_semana") or 5)
        eficiencia = float(m.get("eficiencia_esperada_pct") or 100) / 100.0

        ciclos_dia = (horas_dia * 60) / tempo_ciclo
        kg_dia = ciclos_dia * cap_nominal * eficiencia
        total += kg_dia * dias_semana * 4.33
    return round(total, 0)


def _franquia_comercial_kg() -> float:
    return sum(float(c.get("franquia_kg_mes") or 0) for c in listar_contratos_ativos())


# ------------------------------------------------------------
# Principal
# ------------------------------------------------------------

def obter_dashboard() -> dict:
    df = _buscar_relatorios(12)
    if df.empty:
        return {"sem_dados": True}

    ultimo_mes = df["mes_referencia"].max()

    # ---- séries e previsões ----
    atend = _serie(df, "social_atendimentos_qtd")
    peso_social = _serie(df, "social_peso_kg")
    receita_com = _serie(df, "comercial_receita")

    prev_peso = prever_kpi(peso_social, METODO_POR_KPI["social_peso_kg"], FUTURO)
    prev_receita = prever_kpi(receita_com, METODO_POR_KPI["comercial_receita"], 1)

    # ---- cards ----
    atend_atual = atend[-1]
    atend_ant = atend[-2] if len(atend) > 1 else 0

    fat_previsto = prev_receita[0]
    fat_ultimo = receita_com[-1]

    capacidade = calcular_capacidade_mensal_kg()
    franquia = _franquia_comercial_kg()

    # ---- gráfico: demanda total = social + franquia comercial ----
    hist_social = peso_social[-HIST:]
    hist_total = [round(v + franquia, 1) for v in hist_social]
    prev_total = [round(v + franquia, 1) for v in prev_peso]

    meses_hist = df["mes_referencia"].iloc[-HIST:].tolist()
    meses_fut = pd.date_range(
        ultimo_mes + pd.offsets.MonthBegin(1), periods=FUTURO, freq="MS"
    ).tolist()
    todos_meses = meses_hist + meses_fut

    # ---- uso da capacidade (último mês realizado) ----
    demanda_atual = hist_total[-1]
    uso_pct = round(demanda_atual / capacidade * 100) if capacidade > 0 else None

    # ---- alerta: primeiro mês previsto acima da capacidade ----
    alerta = None
    if capacidade > 0:
        for mes, valor in zip(meses_fut, prev_total):
            if valor > capacidade:
                excesso = valor - capacidade
                alerta = {
                    "mes": MESES_LONGO[mes.month - 1],
                    "excesso_kg": round(excesso),
                    "pct_acima": round(excesso / capacidade * 100),
                }
                break

    return {
        "sem_dados": False,
        "alerta": alerta,
        "cards": {
            "atendimentos": {
                "valor": int(atend_atual),
                "variacao_pct": _variacao_pct(atend_atual, atend_ant),
            },
            "faturamento": {
                "valor": round(fat_previsto, 2),
                "variacao_pct": _variacao_pct(fat_previsto, fat_ultimo),
            },
            "capacidade": {"uso_pct": uso_pct},
        },
        "grafico": {
            "limite_kg": capacidade,
            "meses": [MESES_ABREV[m.month - 1] for m in todos_meses],
            "valores": hist_total + prev_total,
            "qtd_historico": len(hist_total),   # a partir daí é previsão
        },
    }