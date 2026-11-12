from io import BytesIO

import pandas as pd
from flask import Blueprint, jsonify, request

from app.services.importacao_service import registrar_importacao, upsert_dados
from app.services.supabase_client import supabase
from app.services.validacao_service import validar_planilha

importacao_bp = Blueprint("importacao", __name__)

ABAS_VALIDAS = {
    "Relatorio_Operacional": "Relatório Operacional Mensal",
    "Insumos_Mensais": "Insumos Operacionais Mensais",
    "Custos_Operacionais": "Custos Operacionais e Concessionárias",
    "Contratos_Comerciais": "Contratos e Clientes Comerciais",
}


@importacao_bp.route("/api/importar-planilha", methods=["POST"])
def importar_planilha():
    arquivo = request.files.get("arquivo_excel")

    if not arquivo or not arquivo.filename:
        return jsonify({"sucesso": False, "mensagem": "Arquivo Excel não foi enviado."}), 400

    nome_arquivo = arquivo.filename
    if not nome_arquivo.lower().endswith(".xlsx"):
        return jsonify({"sucesso": False, "mensagem": "Formato inválido. Selecione um arquivo .xlsx."}), 400

    try:
        excel = pd.read_excel(BytesIO(arquivo.read()), sheet_name=None, engine="openpyxl")
    except Exception as e:
        registrar_importacao(nome_arquivo, status="erro")
        return jsonify({
            "sucesso": False,
            "mensagem": f"Não foi possível ler o arquivo Excel: {e}",
        }), 400

    # Detecção de aba
    abas_encontradas = []
    for nome_aba, df in excel.items():
        if nome_aba in ABAS_VALIDAS:
            abas_encontradas.append((nome_aba, df))

    if not abas_encontradas:
        abas_no_arquivo = [str(n) for n in excel.keys()]
        registrar_importacao(nome_arquivo, status="erro")
        return jsonify({
            "sucesso": False,
            "mensagem": (
                f"Nenhuma aba de dados reconhecida. "
                f"Abas encontradas: {abas_no_arquivo}. "
                f"Esperado: {list(ABAS_VALIDAS.keys())}."
            ),
            "abas_detectadas": abas_no_arquivo,
        }), 400

    if len(abas_encontradas) > 1:
        registrar_importacao(nome_arquivo, status="erro")
        return jsonify({
            "sucesso": False,
            "mensagem": "Foi detectada mais de uma aba de dados no arquivo. Envie um modelo por vez.",
        }), 400

    tipo, df = abas_encontradas[0]
    df_normalizado, erros = validar_planilha(df, tipo)

    if erros:
        registrar_importacao(nome_arquivo, status="erro")
        return jsonify({"sucesso": False, "erros": erros}), 400

    try:
        registros_processados = upsert_dados(tipo, df_normalizado)
    except RuntimeError as exc:
        registrar_importacao(nome_arquivo, status="erro")
        return jsonify({"sucesso": False, "mensagem": str(exc)}), 500

    # Log de sucesso — após o upsert ter ido bem
    registrar_importacao(nome_arquivo, status="sucesso")

    return jsonify({
        "sucesso": True,
        "tipo_detectado": ABAS_VALIDAS[tipo],
        "registros_processados": registros_processados,
    }), 200

@importacao_bp.route("/api/historico-importacoes", methods=["GET"])
def historico_importacoes():
    if supabase is None:
        print("[importacao] aviso: Supabase indisponível para histórico.")
        return jsonify([])

    try:
        resposta = (
            supabase.table("historico_importacoes")
            .select("id, nome_arquivo, status_importacao, criado_em")
            .order("criado_em", desc=True)
            .limit(50)
            .execute()
        )
        registros = resposta.data or []
        print(f"[importacao] histórico: {len(registros)} registro(s) encontrado(s)")
        if registros:
            print(f"[importacao]    primeiro: {registros[0]}")
    except Exception as exc:
        print(f"[importacao] erro ao buscar histórico: {exc}")
        return jsonify([])

    retorno = []
    for item in registros:
        retorno.append({
            "id": item.get("id"),
            "nome_arquivo": item.get("nome_arquivo", "Arquivo sem nome"),
            "tipo": "Importação",
            "data_importacao": item.get("criado_em"),
            # Status vem do banco: 'sucesso', 'erro', 'processando'
            "status": item.get("status_importacao", "sucesso"),
        })

    return jsonify(retorno)