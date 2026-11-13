from flask import Blueprint, jsonify, render_template, session
from app.services.supabase_client import supabase
import unicodedata

alertas_bp = Blueprint("alertas", __name__)

# 1. ROTA DA PÁGINA (HTML)
@alertas_bp.route("/alertas")
def pagina_alertas():
    return render_template("alertas.html")

# 2. ROTA DA API (JSON) - Listar Alertas
@alertas_bp.route("/api/alertas", methods=["GET"])
def get_alertas():
    try:
        user_id = session.get('user')
        print(f"DEBUG ALERTAS: user_id na sessão = {user_id}")
        
        if not user_id:
            return jsonify({"erro": "Não autenticado"}), 401

        resp = supabase.table("alertas").select("*").order("criado_em", desc=True).execute()
        alertas = resp.data or []

        # Busca quais alertas este usuário já leu
        resp_lidos = supabase.table("alertas_lidos").select("alerta_id").eq("user_id", user_id).execute()
        ids_lidos = [item["alerta_id"] for item in (resp_lidos.data or [])]

        for a in alertas:
            a["lido"] = a["id"] in ids_lidos
            
            # Normaliza o nível para definir a cor
            nivel_original = str(a.get("nivel", ""))
            nivel = "".join(c for c in unicodedata.normalize('NFD', nivel_original) if unicodedata.category(c) != 'Mn').lower()
            
            if "crit" in nivel:
                a["cor"] = "red"
            elif "aten" in nivel or "alert" in nivel:
                a["cor"] = "orange"
            else:
                a["cor"] = "blue"

        return jsonify(alertas)
    except Exception as exc:
        print(f">>> ERRO AO BUSCAR ALERTAS: {exc}")
        return jsonify({"erro": str(exc)}), 500

# 3. ROTA DA API (JSON) - Marcar como Lido
@alertas_bp.route("/api/alertas/<int:alerta_id>/ler", methods=["POST"])
def marcar_alerta_lido(alerta_id):
    try:
        # Pega o ID do usuário logado
        user_id = session.get('user')
        if not user_id:
            return jsonify({"erro": "Não autenticado"}), 401

        # Upsert (Atualiza se já existe, insere se não existe)
        supabase.table("alertas_lidos").upsert({
            "alerta_id": alerta_id,
            "user_id": user_id
        }).execute()
            
        return jsonify({"sucesso": True})
    except Exception as exc:
        print(f"ERRO AO MARCAR LIDO: {exc}")
        return jsonify({"erro": str(exc)}), 500