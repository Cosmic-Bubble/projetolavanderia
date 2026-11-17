import unittest

from app.services.previsao_service import (
    prever_regressao,
    prever_sma,
)

from app.services.avaliacao_service import avaliar_modelos


class TestPrevisao(unittest.TestCase):
    def test_sma_multiplos_periodos(self):
        """Exibe o comportamento da SMA em três horizontes."""

        resultado = prever_sma(
            [100, 200, 300],
            periodos=3
        )

        print(
            "\nPrevisões SMA para 3 meses:",
            resultado
        )

        self.assertEqual(len(resultado), 3)

        self.assertAlmostEqual(resultado[0], 200.0)

    def test_tendencia_linear(self):
        """Verifica crescimento de 50 kg por mês."""

        resultado = prever_regressao(
            [800, 850, 900],
            periodos=3,
            meses=[
                "2026-08",
                "2026-09",
                "2026-10"
            ]
        )

        self.assertEqual(
            resultado,
            [950.0, 1000.0, 1050.0]
        )

    def test_meses_faltantes(self):
        """Verifica se a regressão respeita lacunas."""

        resultado = prever_regressao(
            [100, 200, 500],
            periodos=2,
            meses=[
                "2026-01",
                "2026-02",
                "2026-05"
            ]
        )

        self.assertEqual(
            resultado,
            [600.0, 700.0]
        )

    def test_valores_negativos(self):
        """Verifica se a demanda prevista não fica negativa."""

        resultado = prever_regressao(
            [100, 50, 0],
            periodos=2,
            meses=[
                "2026-01",
                "2026-02",
                "2026-03"
            ]
        )

        self.assertEqual(
            resultado,
            [0.0, 0.0]
        )

    def test_dados_insuficientes(self):
        """Verifica comportamento com apenas dois registros."""

        resultado = prever_regressao(
            [100, 120],
            periodos=2
        )

        self.assertEqual(
            resultado,
            [120.0, 120.0]
        )


    def test_sma_demanda_constante(self):
        """Verifica a média móvel com demanda constante."""

        resultado = prever_sma(
            [100, 100, 100],
            periodos=3
        )

        self.assertEqual(
            resultado,
            [100.0, 100.0, 100.0]
        )

    def test_sma_demanda_crescente(self):
        """Verifica a média das três últimas observações."""

        resultado = prever_sma(
            [100, 200, 300],
            periodos=1
        )

        self.assertEqual(
            resultado,
            [200.0]
        )

    def test_sma_poucos_dados(self):
        """Verifica o comportamento com duas observações."""

        resultado = prever_sma(
            [100, 200],
            periodos=1
        )

        self.assertEqual(
            resultado,
            [150.0]
        )

    
    def test_comparacao_modelos(self):
        """Compara modelos em uma série com crescimento linear."""

        historico = [100, 120, 140, 160, 180, 200]

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-04",
            "2026-05",
            "2026-06"
        ]

        realizado = 220.0

        previsao_sma = prever_sma(
            historico,
            periodos=1
        )[0]

        previsao_regressao = prever_regressao(
            historico,
            periodos=1,
            meses=meses
        )[0]

        erro_sma = abs(realizado - previsao_sma)
        erro_regressao = abs(realizado - previsao_regressao)

        print("\nComparação entre modelos:")
        print(f"Realizado: {realizado}")
        print(f"Previsão SMA: {previsao_sma}")
        print(f"Previsão regressão: {previsao_regressao}")
        print(f"Erro SMA: {erro_sma}")
        print(f"Erro regressão: {erro_regressao}")

        self.assertAlmostEqual(previsao_sma, 180.0)
        self.assertAlmostEqual(previsao_regressao, 220.0)
        self.assertLess(erro_regressao, erro_sma)


    def test_backtesting_regressao_linear(self):
        """Verifica MAE e WAPE em crescimento linear."""

        serie = [100, 120, 140, 160, 180, 200]

        meses = [
            "2026-01", "2026-02", "2026-03",
            "2026-04", "2026-05", "2026-06"
        ]

        resultado = avaliar_modelos(serie, meses)
        metricas = resultado["metricas"]

        self.assertEqual(
            metricas["regressao"]["avaliacoes"], 3
        )
        self.assertAlmostEqual(
            metricas["regressao"]["mae"], 0.0
        )
        self.assertAlmostEqual(
            metricas["regressao"]["wape"], 0.0
        )

        self.assertAlmostEqual(
            metricas["sma"]["mae"], 40.0
        )

    def test_backtesting_demanda_constante(self):
        """Verifica modelos com demanda estável."""

        serie = [100, 100, 100, 100, 100]

        meses = [
            "2026-01", "2026-02", "2026-03",
            "2026-04", "2026-05"
        ]

        resultado = avaliar_modelos(serie, meses)

        for metodo in ["sma", "regressao"]:
            self.assertAlmostEqual(
                resultado["metricas"][metodo]["mae"],
                0.0
            )

    
    def test_backtesting_mes_faltante(self):
        """Não compara modelos quando falta histórico consecutivo."""

        serie = [100, 120, 140, 180, 200]

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-05",
            "2026-06"
        ]

        resultado = avaliar_modelos(serie, meses)

        for metodo in ["sma", "regressao", "naive"]:
            self.assertEqual(
                resultado["metricas"][metodo]["avaliacoes"],
                0
            )

            self.assertEqual(
                resultado["detalhes"][metodo],
                []
            )


    def test_backtesting_historico_insuficiente(self):
        """Verifica rejeição de histórico muito curto."""

        with self.assertRaises(ValueError):
            avaliar_modelos(
                [100, 120, 140],
                ["2026-01", "2026-02", "2026-03"]
            )


    def test_previsao_naive(self):
        """Verifica a previsão baseada no último valor."""

        from app.services.previsao_service import prever_naive

        resultado = prever_naive(
            [100, 150, 200],
            periodos=3
        )

        self.assertEqual(
            resultado,
            [200.0, 200.0, 200.0]
        )


    def test_backtesting_lacuna_no_treinamento(self):
        """Não deve avaliar SMA usando meses de treino incompletos."""

        serie = [100, 120, 140, 180, 200, 220]

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-05",
            "2026-06",
            "2026-07",
        ]

        resultado = avaliar_modelos(serie, meses)

        # Junho e julho têm observações no mês anterior,
        # mas a janela histórica ainda contém uma lacuna.
        # Exigimos três meses consecutivos antes de avaliar SMA.
        self.assertEqual(
            resultado["metricas"]["sma"]["avaliacoes"],
            0
        )


    def test_backtesting_periodos_comparaveis(self):
        """Verifica se os modelos são avaliados nos mesmos meses."""

        serie = [100, 120, 140, 180, 200, 220]

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-05",
            "2026-06",
            "2026-07",
        ]

        resultado = avaliar_modelos(serie, meses)

        meses_por_modelo = {
            metodo: [
                registro["mes"]
                for registro in registros
            ]
            for metodo, registros
            in resultado["detalhes"].items()
        }

        print(
            "\nMeses avaliados por modelo:",
            meses_por_modelo
        )

        self.assertEqual(
            meses_por_modelo["sma"],
            meses_por_modelo["regressao"]
        )

        self.assertEqual(
            meses_por_modelo["sma"],
            meses_por_modelo["naive"]
        )

    
    def test_backtesting_rejeita_demanda_negativa(self):
        """Rejeita valores negativos no histórico de demanda."""

        serie = [100, 120, -50, 160, 180]

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-04",
            "2026-05"
        ]

        with self.assertRaises(ValueError):
            avaliar_modelos(serie, meses)


    def test_backtesting_rejeita_valores_invalidos(self):
        """Rejeita valores ausentes, infinitos e não numéricos."""

        meses = [
            "2026-01",
            "2026-02",
            "2026-03",
            "2026-04",
            "2026-05"
        ]

        valores_invalidos = [
            None,
            float("nan"),
            float("inf"),
            float("-inf"),
            "abc"
        ]

        for valor_invalido in valores_invalidos:

            with self.subTest(valor=repr(valor_invalido)):

                serie = [
                    100,
                    120,
                    valor_invalido,
                    160,
                    180
                ]

                with self.assertRaises(ValueError):
                    avaliar_modelos(serie, meses)

    
    def test_backtesting_rejeita_meses_duplicados(self):
        """Rejeita registros com o mesmo mês."""

        serie = [100, 120, 140, 160, 180]

        meses = [
            "2026-01",
            "2026-02",
            "2026-02",
            "2026-04",
            "2026-05"
        ]

        with self.assertRaises(ValueError):
            avaliar_modelos(serie, meses)

    def test_backtesting_rejeita_meses_fora_de_ordem(self):
        """Rejeita histórico em ordem cronológica incorreta."""

        serie = [100, 120, 140, 160, 180]

        meses = [
            "2026-01",
            "2026-03",
            "2026-02",
            "2026-04",
            "2026-05"
        ]

        with self.assertRaises(ValueError):
            avaliar_modelos(serie, meses)


    def test_backtesting_rejeita_datas_invalidas(self):
        """Rejeita meses inexistentes ou formatos inválidos."""

        datas_invalidas = [
            "2026-13",
            "2026-00",
            "data_invalida",
            None,
        ]

        for data_invalida in datas_invalidas:

            with self.subTest(data=repr(data_invalida)):

                meses = [
                    "2026-01",
                    "2026-02",
                    data_invalida,
                    "2026-04",
                    "2026-05",
                ]

                serie = [100, 120, 140, 160, 180]

                with self.assertRaises(ValueError):
                    avaliar_modelos(serie, meses)

if __name__ == "__main__":
    unittest.main()