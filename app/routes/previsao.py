from flask import Blueprint, jsonify, request
from datetime import datetime, date

from app.services.supabase_client import supabase 

from app.services.previsao_service import (
    comparar_previsto_realizado,
    gerar_previsoes,
)
from app.services.capacidade_service import calcular_capacidade_mensal_kg
from app.services.comercial_service import (
    franquia_kg_no_mes,
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

# capacidade
@previsao_bp.route("/api/capacidade", methods=["GET"])
def get_capacidade():
    try:
        # Uma só regra para todas as telas.
        limite_total_kg = calcular_capacidade_mensal_kg()

        # 3. Busca as previsões (usando a função que já criamos)
        previsoes_data = gerar_previsoes(periodos=6)
        
        # 4. Prepara os dados dos últimos 3 meses históricos + 3 futuros
        social_hist = previsoes_data.get("social_peso_kg", {}).get("historico", [])
        social_prev = previsoes_data.get("social_peso_kg", {}).get("previsoes", [])
        # Histórico social conhecido, sem converter meses faltantes em zero.
        meses_hist = previsoes_data.get("social_peso_kg", {}).get("meses_historico", [])
        meses_prev = previsoes_data.get("social_peso_kg", {}).get("meses_futuros", [])
        if meses_prev:
            from datetime import date as _date
            from calendar import monthrange
            ano, mes = map(int, meses_prev[0].split("-"))
            referencia = _date(ano, mes, 1)
            historicos = []
            for deslocamento in (3, 2, 1):
                ano_m = referencia.year + (referencia.month - 1 - deslocamento) // 12
                mes_m = (referencia.month - 1 - deslocamento) % 12 + 1
                historicos.append(f"{ano_m:04d}-{mes_m:02d}")
        else:
            historicos = meses_hist[-3:]
        valores_sociais = dict(zip(meses_hist, social_hist))
        social = [valores_sociais.get(m) for m in historicos] + social_prev[:3]

        contratos = listar_contratos_ativos()
        comercial = [None] * len(historicos) + [
            franquia_kg_no_mes(contratos, mes) for mes in meses_prev[:3]
        ]
        meses_array = historicos + meses_prev[:3]
        nomes_meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        meses_formatados = [
            f"{nomes_meses[int(m[5:7]) - 1]}/{m[2:4]}"
            + (" (Prev)" if i >= len(historicos) else "")
            for i, m in enumerate(meses_array)
        ]

        # Consumo estimado para o primeiro mês futuro.
        # Coeficientes operacionais assumidos, não medições reais.

        indice_primeiro_futuro = len(historicos)

        peso_social_previsto = (
            social[indice_primeiro_futuro]
            if indice_primeiro_futuro < len(social)
            else None
        )

        franquia_comercial_prevista = (
            comercial[indice_primeiro_futuro]
            if indice_primeiro_futuro < len(comercial)
            else None
        )

        if (
            peso_social_previsto is not None
            and franquia_comercial_prevista is not None
        ):
            peso_total_estimado = (
                peso_social_previsto + franquia_comercial_prevista
            )

            agua_litros = round(peso_total_estimado * 15)
            energia_kwh = round(peso_total_estimado * 2.5)
            insumo_kg = round(peso_total_estimado * 0.1)
        else:
            agua_litros = None
            energia_kwh = None
            insumo_kg = None
            
        return jsonify({
            "limite_kg": limite_total_kg,
            "meses": meses_formatados,
            "social": social,
            "comercial": comercial,
            "consumo": {
                "agua_litros": agua_litros,
                "energia_kwh": energia_kwh,
                "insumo_kg": insumo_kg
            }
        })
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500