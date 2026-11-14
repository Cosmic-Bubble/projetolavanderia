from flask import Blueprint, jsonify, session

from app.services.dashboard_service import obter_dashboard

dashboard_api_bp = Blueprint("dashboard_api", __name__)


@dashboard_api_bp.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    # Mesmo critério de login do restante do sistema (auth.py grava session['user'])
    if not session.get("user"):
        return jsonify({"erro": "não autenticado"}), 401

    # Só quem tem acesso ao módulo "Visão Geral"
    permissoes = session.get("permissoes") or {}
    if (permissoes.get("visao_geral") or "nenhum") == "nenhum":
        return jsonify({"erro": "sem permissão"}), 403

    try:
        return jsonify(obter_dashboard())
    except Exception as exc:
        print("Erro no dashboard:", repr(exc))
        return jsonify({"erro": str(exc)}), 500