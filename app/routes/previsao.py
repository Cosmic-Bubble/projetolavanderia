from flask import Blueprint, jsonify, request
from datetime import datetime, date

from app.services.supabase_client import supabase 

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

# capacidade
@previsao_bp.route("/api/capacidade", methods=["GET"])
def get_capacidade():
    try:
        # 1. Busca todas as máquinas operacionais
        maquinas = []
        if supabase:
            resp = supabase.table("maquinas_capacidade").select("*").eq("status_operacional", "OPERACIONAL").execute()
            maquinas = resp.data or []

        # 2. Calcula a capacidade MENSAL máxima de lavagem
        capacidade_mensal_kg = 0.0
        
        for m in maquinas:
            # Só conta máquinas que lavam (LAVADORA)
            if m.get("tipo_maquina") != "LAVADORA":
                continue
                
            cap_nominal = float(m.get("capacidade_nominal_kg", 0))
            tempo_ciclo = float(m.get("tempo_medio_ciclo_min", 1)) 
            horas_dia = float(m.get("horas_disponiveis_dia", 8))
            dias_semana = float(m.get("dias_operacao_semana", 5))
            eficiencia = float(m.get("eficiencia_esperada_pct", 100)) / 100.0
            
            # Matemática da capacidade mensal
            ciclos_dia = (horas_dia * 60) / tempo_ciclo
            kg_dia = ciclos_dia * cap_nominal * eficiencia
            kg_mes = kg_dia * dias_semana * 4.33  # 4.33 semanas/mês
            
            capacidade_mensal_kg += kg_mes

        limite_total_kg = round(capacidade_mensal_kg, 0)
        if limite_total_kg <= 0:
            limite_total_kg = 4000.0 

        # 3. Busca as previsões (usando a função que já criamos)
        previsoes_data = gerar_previsoes(periodos=6)
        
        # 4. Prepara os dados dos últimos 3 meses históricos + 3 futuros
        social_hist = previsoes_data.get("social_peso_kg", {}).get("historico", [])
        social_prev = previsoes_data.get("social_peso_kg", {}).get("previsoes", [])
        social = social_hist[-3:] + social_prev[:3]

        # Comercial: puxa a franquia dos contratos ativos
        contratos = listar_contratos_ativos()
        franquia_comercial = sum(float(c.get("franquia_kg_mes", 0)) for c in contratos)
        if franquia_comercial == 0:
            franquia_comercial = 2000.0 

        # Simula o crescimento/estabilidade comercial
        comercial_hist_peso = [franquia_comercial * 0.8, franquia_comercial * 0.85, franquia_comercial * 0.9]
        comercial_prev_peso = [franquia_comercial, franquia_comercial * 1.1, franquia_comercial] 
        comercial = comercial_hist_peso + comercial_prev_peso

        # 5. Nomes dos meses
        meses_hist = previsoes_data.get("social_peso_kg", {}).get("meses_historico", [])
        meses_prev = previsoes_data.get("social_peso_kg", {}).get("meses_futuros", [])
        meses_array = meses_hist[-3:] + meses_prev[:3]

        meses_formatados = []
        nomes_meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        for m in meses_array:
            if m:
                [ano, mes] = m.split('-')
                is_prev = meses_array.index(m) >= len(meses_hist[-3:])
                nome = f"{nomes_meses[int(mes)-1]}"
                if is_prev: nome += " (Prev)"
                meses_formatados.append(nome)

        # Consumo estimado
        peso_total_mes_atual = (social[-1] if social else 0) + (comercial[-1] if comercial else 0)
        agua_litros = peso_total_mes_atual * 15 
        energia_kwh = peso_total_mes_atual * 2.5
        insumo_kg = peso_total_mes_atual * 0.1

        return jsonify({
            "limite_kg": limite_total_kg,
            "meses": meses_formatados,
            "social": social,
            "comercial": comercial,
            "consumo": {
                "agua_litros": round(agua_litros),
                "energia_kwh": round(energia_kwh),
                "insumo_kg": round(insumo_kg)
            }
        })
    except Exception as exc:
        return jsonify({"erro": str(exc)}), 500