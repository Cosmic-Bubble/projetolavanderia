
import numpy as np

from app.services.previsao_service import (
    prever_regressao,
    prever_sma,
    prever_naive,
)


def avaliar_modelos(
    serie: list[float],
    meses: list[str],
    minimo_treino: int = 3
) -> dict:
    """Avalia modelos com janela expansiva e horizonte de 1 mês."""

    if len(serie) != len(meses):
        raise ValueError(
            "A série e os meses devem ter o mesmo tamanho."
        )

    if len(serie) <= minimo_treino:
        raise ValueError(
            "Histórico insuficiente para avaliação."
        )
    
   
    # Valida os valores do histórico antes da avaliação.
    try:
        serie = [float(valor) for valor in serie]
    except (TypeError, ValueError):
        raise ValueError(
            "O histórico contém valores ausentes ou não numéricos."
        ) from None

    # Rejeita NaN e valores infinitos.
    if not np.all(np.isfinite(serie)):
        raise ValueError(
            "O histórico contém valores não finitos."
        )

    # Rejeita demandas negativas.
    if any(valor < 0 for valor in serie):
        raise ValueError(
            "O histórico contém valores negativos de demanda."
        )


    datas = np.array(meses, dtype="datetime64[M]")

    if not np.all(datas[1:] > datas[:-1]):
        raise ValueError(
            "Os meses devem estar ordenados e sem duplicações."
        )

    resultados = {
        "sma": [],
        "regressao": [],
        "naive": [],
    }

    for i in range(minimo_treino, len(serie)):

        # Avalia apenas meses consecutivos
        if (datas[i] - datas[i - 1]) != np.timedelta64(1, "M"):
            continue

        historico = serie[:i]
        meses_treino = meses[:i]
        realizado = float(serie[i])
        
        previsoes = {
            "sma": prever_sma(
                historico,
                periodos=1
            )[0],

            "regressao": prever_regressao(
                historico,
                periodos=1,
                meses=meses_treino
            )[0],

            "naive": prever_naive(
                historico,
                periodos=1
            )[0],
        }

        janela_sma_valida = i >= 3
        
        # Compara os modelos somente nos mesmos períodos.
        if not janela_sma_valida:
            continue

        for metodo, previsto in previsoes.items():

            if metodo == "sma" and not janela_sma_valida:
                continue
            resultados[metodo].append({
                "mes": meses[i],
                "realizado": realizado,
                "previsto": previsto,
                "erro_absoluto": abs(realizado - previsto),
            })

    metricas = {}

    for metodo, registros in resultados.items():

        if not registros:
            metricas[metodo] = {
                "mae": None,
                "wape": None,
                "avaliacoes": 0,
            }
            continue

        erros = np.array([
            r["erro_absoluto"] for r in registros
        ])

        realizados = np.array([
            r["realizado"] for r in registros
        ])

        mae = float(np.mean(erros))

        soma_realizados = float(np.sum(np.abs(realizados)))

        wape = (
            float(np.sum(erros) / soma_realizados * 100)
            if soma_realizados > 0
            else None
        )

        metricas[metodo] = {
            "mae": round(mae, 2),
            "wape": round(wape, 2) if wape is not None else None,
            "avaliacoes": len(registros),
        }

    return {
        "metricas": metricas,
        "detalhes": resultados,
    }
