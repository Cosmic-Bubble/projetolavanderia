# Cálculo único da capacidade teórica mensal das lavadoras operacionais.
import math

from app.services.supabase_client import supabase

SEMANAS_POR_MES = 52 / 12


def _numero(valor, padrao=None):
    if valor is None or valor == "":
        return padrao
    try:
        numero = float(valor)
        return numero if math.isfinite(numero) else None
    except (ValueError, TypeError):
        return None


def calcular_capacidade_maquinas(maquinas):
    """Retorna kg/mês ou None se nenhuma lavadora válida estiver disponível.

    Máquinas com cadastro inválido são ignoradas, não recebem valores inventados.
    Eficiência zero é válida e não pode se transformar em 100%.
    """
    total = 0.0
    validas = 0
    for maquina in maquinas:
        if maquina.get("tipo_maquina") != "LAVADORA" or maquina.get("status_operacional") not in (None, "OPERACIONAL"):
            continue
        kg = _numero(maquina.get("capacidade_nominal_kg"))
        ciclo = _numero(maquina.get("tempo_medio_ciclo_min"))
        horas = _numero(maquina.get("horas_disponiveis_dia"))
        dias = _numero(maquina.get("dias_operacao_semana"))
        eficiencia = _numero(maquina.get("eficiencia_esperada_pct"))
        if (kg is None or kg <= 0 or ciclo is None or ciclo <= 0 or
                horas is None or not 0 <= horas <= 24 or
                dias is None or not 0 <= dias <= 7 or
                eficiencia is None or not 0 <= eficiencia <= 100):
            continue
        validas += 1
        total += kg * (horas * 60 / ciclo) * dias * SEMANAS_POR_MES * eficiencia / 100
    return round(total, 2) if validas and total > 0 else None


def calcular_capacidade_mensal_kg():
    if supabase is None:
        return None
    resposta = (supabase.table("maquinas_capacidade").select("*")
                .eq("status_operacional", "OPERACIONAL").execute())
    return calcular_capacidade_maquinas(resposta.data or [])
