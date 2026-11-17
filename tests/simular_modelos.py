
from datetime import date

from app.services.avaliacao_service import avaliar_modelos


def gerar_meses(quantidade):
    meses = []

    for i in range(quantidade):
        ano = 2025 + i // 12
        mes = i % 12 + 1
        meses.append(f"{ano}-{mes:02d}")

    return meses


cenarios = {
    "Demanda constante": [
        500, 500, 500, 500, 500, 500,
        500, 500, 500, 500, 500, 500
    ],

    "Crescimento linear": [
        400, 420, 440, 460, 480, 500,
        520, 540, 560, 580, 600, 620
    ],

    "Queda linear": [
        620, 600, 580, 560, 540, 520,
        500, 480, 460, 440, 420, 400
    ],

    "Demanda oscilante": [
        500, 550, 480, 570, 510, 590,
        490, 560, 520, 580, 500, 570
    ],

    "Demanda com sazonalidade": [
        400, 420, 450, 500, 550, 650,
        700, 680, 600, 500, 450, 420,
        410, 430, 460, 510, 560, 660,
        710, 690, 610, 510, 460, 430
    ],
}


for nome, serie in cenarios.items():
    meses = gerar_meses(len(serie))

    resultado = avaliar_modelos(
        serie,
        meses,
        minimo_treino=3
    )

    print(f"\nCENÁRIO: {nome}")

    for metodo, metricas in resultado["metricas"].items():
        print(
            f"{metodo}: "
            f"MAE={metricas['mae']} | "
            f"WAPE={metricas['wape']}% | "
            f"Avaliações={metricas['avaliacoes']}"
        )
