from flask import Blueprint, jsonify, request

from app.services.previsao_service import (
    comparar_previsto_realizado,
    gerar_previsoes,
)

previsao_bp = Blueprint("previsao", __name__)


@previsao_bp.route("/api/previsoes", methods=["GET"])
def previsoes():
    """Retorna previsões para todos os KPIs."""
    try:
        periodos = min(int(request.args.get("periodos", 3)), 12)
    except ValueError:
        periodos = 3

    try:
        return jsonify(gerar_previsoes(periodos=periodos))
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500


@previsao_bp.route("/api/comparativo/<coluna>", methods=["GET"])
def comparativo(coluna: str):
    """Comparativo previsto × realizado do último mês para uma coluna."""
    try:
        return jsonify(comparar_previsto_realizado(coluna))
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500