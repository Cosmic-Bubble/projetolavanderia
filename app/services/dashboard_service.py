"""Indicadores do dashboard; não confunde franquia com produção realizada."""
import pandas as pd
from app.services.previsao_service import gerar_previsoes
from app.services.capacidade_service import calcular_capacidade_mensal_kg
from app.services.comercial_service import listar_contratos_ativos, franquia_kg_no_mes

MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]


def _variacao(atual, anterior):
    if atual is None or anterior is None or anterior == 0:
        return None
    return round((atual - anterior) / anterior * 100, 1)


def _ultimo_e_anterior(dados):
    serie = dados.get("historico", [])
    return (serie[-1] if serie else None, serie[-2] if len(serie) > 1 else None)


def obter_dashboard():
    previsoes = gerar_previsoes(periodos=3)
    social = previsoes.get("social_peso_kg", {})
    atendimento = previsoes.get("social_atendimentos_qtd", {})
    receita = previsoes.get("comercial_receita", {})
    if not any(d.get("historico") for d in (social, atendimento, receita)):
        return {"sem_dados": True}

    capacidade = calcular_capacidade_mensal_kg()
    contratos = listar_contratos_ativos()
    meses_futuros = social.get("meses_futuros", [])[:3]
    social_prev = social.get("previsoes", [])[:3]
    comercial_prev = [franquia_kg_no_mes(contratos, mes) for mes in meses_futuros]
    total_prev = [round(s + c, 2) for s, c in zip(social_prev, comercial_prev)]

    # Histórico exibe APENAS peso social realizado.
    historico_social = dict(zip(social.get("meses_historico", []), social.get("historico", [])))
    if meses_futuros:
        primeiro = pd.Period(meses_futuros[0], freq="M")
        meses_hist = [str(primeiro - i) for i in (3, 2, 1)]
    else:
        meses_hist = social.get("meses_historico", [])[-3:]
    hist_valores = [historico_social.get(m) for m in meses_hist]

    atend_atual, atend_ant = _ultimo_e_anterior(atendimento)
    fat_atual, _ = _ultimo_e_anterior(receita)
    fat_prev = (receita.get("previsoes") or [None])[0]
    uso_prev = round(total_prev[0] / capacidade * 100) if total_prev and capacidade else None

    alerta = None
    if capacidade:
        for mes, total in zip(meses_futuros, total_prev):
            if total > capacidade:
                excesso = total - capacidade
                data = pd.Period(mes, freq="M")
                alerta = {"mes": f"{MESES_LONGOS[data.month - 1]}/{data.year}",
                          "excesso_kg": round(excesso), "pct_acima": round(excesso / capacidade * 100)}
                break

    meses = meses_hist + meses_futuros
    return {
        "sem_dados": False, "alerta": alerta,
        "cards": {
            "atendimentos": {"valor": atend_atual, "variacao_pct": _variacao(atend_atual, atend_ant)},
            "faturamento": {"valor": fat_prev, "variacao_pct": _variacao(fat_prev, fat_atual)},
            "capacidade": {"uso_pct": uso_prev},
        },
        "grafico": {
            "limite_kg": capacidade,
            "meses": [f"{MESES[int(m[5:7])-1]}/{m[2:4]}" for m in meses],
            "historico_social": hist_valores + [None] * len(meses_futuros),
            "previsao_total": [None] * len(meses_hist) + total_prev,
            "qtd_historico": len(meses_hist),
        },
    }