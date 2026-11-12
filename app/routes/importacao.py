from io import BytesIO

import pandas as pd
from flask import Blueprint, jsonify, request

from app.services.importacao_service import upsert_dados
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

    nome_arquivo = arquivo.filename.lower()
    if not nome_arquivo.endswith(".xlsx"):
        return jsonify({"sucesso": False, "mensagem": "Formato inválido. Selecione um arquivo .xlsx."}), 400

    try:
        excel = pd.read_excel(BytesIO(arquivo.read()), sheet_name=None, engine="openpyxl")
    except Exception as e:
        # Expor o erro real ajuda no diagnóstico (remova em produção se preferir)
        return jsonify({
            "sucesso": False,
            "mensagem": f"Não foi possível ler o arquivo Excel: {e}",
        }), 400

    # Busca o nome da aba no dicionário ABAS_VALIDAS (chave = nome da aba)
    abas_encontradas = []
    for nome_aba, df in excel.items():
        if nome_aba in ABAS_VALIDAS:
            abas_encontradas.append((nome_aba, df))

    if not abas_encontradas:
        abas_no_arquivo = [str(n) for n in excel.keys()]
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
        return jsonify({
            "sucesso": False,
            "mensagem": "Foi detectada mais de uma aba de dados no arquivo. Envie um modelo por vez.",
        }), 400

    tipo, df = abas_encontradas[0]
    df_normalizado, erros = validar_planilha(df, tipo)

    if erros:
        return jsonify({"sucesso": False, "erros": erros}), 400

    try:
        registros_processados = upsert_dados(tipo, df_normalizado)
    except RuntimeError as exc:
        return jsonify({"sucesso": False, "mensagem": str(exc)}), 500

    return jsonify({
        "sucesso": True,
        "tipo_detectado": ABAS_VALIDAS[tipo],
        "registros_processados": registros_processados,
    }), 200


@importacao_bp.route("/api/historico-importacoes", methods=["GET"])
def historico_importacoes():
    if supabase is None:
        return jsonify([])

    try:
        resposta = (
            supabase.table("historico_importacoes")  # não importacoes_log
            .select("nome_arquivo, status_importacao, criado_em")
            .order("criado_em", desc=True)
            .execute()
        )
        registros = resposta.data or []
    except Exception:
        return jsonify([])

    retorno = []
    for item in registros:
        retorno.append({
            "nome_arquivo": item.get("nome_arquivo", "Arquivo sem nome"),
            "tipo": "Importação", 
            "data_importacao": item.get("criado_em"),
            "status": item.get("status_importacao", "sucesso"),
        })

    return jsonify(retorno)