from flask import Blueprint, jsonify, request
from datetime import datetime, date

from app.services.previsao_service import (
    comparar_previsto_realizado,
    gerar_previsoes,
)
from app.services.comercial_service import (
    listar_contratos_ativos,
    salvar_contrato,
    deletar_contrato,
)

previsao_bp = Blueprint("previsao", __name__)

# --- Previsões ---
@previsao_bp.route("/api/previsoes", methods=["GET"])
def previsoes():
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
    try:
        return jsonify(comparar_previsto_realizado(coluna))
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500

# --- Contratos (CRUD) ---
@previsao_bp.route("/api/contratos", methods=["GET"])
def get_contratos():
    try:
        contratos = listar_contratos_ativos()
        hoje = date.today()
        
        for c in contratos:
            c["volume_previsto"] = c.get("franquia_kg_mes") or 0
            
            data_fim_str = c.get("data_fim")
            if data_fim_str:
                data_fim = datetime.strptime(data_fim_str, "%Y-%m-%d").date()
                dias_restantes = (data_fim - hoje).days
                
                if dias_restantes < 0:
                    # Contrato venceu
                    c["status_visual"] = "Vencido"
                    c["status_cor"] = "bg-red-500"
                elif dias_restantes <= 60:
                    # Perto de vencer
                    c["status_visual"] = f"Vencendo em {dias_restantes}d"
                    c["status_cor"] = "bg-orange-500"
                else:
                    # Vigente
                    c["status_visual"] = "Vigente"
                    c["status_cor"] = "bg-[#7d3c98]"
            else:
                c["status_visual"] = "Vigente"
                c["status_cor"] = "bg-[#7d3c98]"
                
        return jsonify(contratos)
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500

@previsao_bp.route("/api/contratos", methods=["POST"])
def post_contrato():
    dados = request.json
    if not dados.get("cliente_cnpj") or not dados.get("cliente_razao_social"):
        return jsonify({"erro": "Nome e CNPJ são obrigatórios."}), 400

    try:
        contrato = {
            "cliente_razao_social": dados["cliente_razao_social"],
            "cliente_cnpj": dados["cliente_cnpj"].replace(r"\D", ""),
            "valor_mensal_contratado": float(dados.get("valor_mensal_contratado", 0)),
            "data_inicio": dados.get("data_inicio"),
            "data_fim": dados.get("data_fim") or None,
            "status_contrato": dados.get("status_contrato", "ATIVO"),
            "franquia_kg_mes": float(dados.get("franquia_kg_mes") or 0),
            "franquia_pecas_mes": int(dados.get("franquia_pecas_mes") or 0)
        }
        
        if dados.get("id_contrato"):
            contrato["id_contrato"] = int(dados["id_contrato"])

        salvar_contrato(contrato)
        return jsonify({"sucesso": True, "mensagem": "Contrato salvo!"})
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500

@previsao_bp.route("/api/contratos/<int:id>", methods=["DELETE"])
def delete_contrato(id):
    try:
        deletar_contrato(id)
        return jsonify({"sucesso": True})
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500