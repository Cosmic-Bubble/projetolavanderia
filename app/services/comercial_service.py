from datetime import date
from calendar import monthrange

from app.services.supabase_client import supabase

def listar_contratos_ativos() -> list:
    if supabase is None: return []
    try:
        resp = (
            supabase.table("contratos_comerciais")
            .select("id, cliente_razao_social, cliente_cnpj, valor_mensal_contratado, data_inicio, data_fim, status_contrato, franquia_kg_mes, franquia_pecas_mes")
            .eq("status_contrato", "ATIVO")
            .order("cliente_razao_social", desc=False)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        print(f"[comercial] erro ao buscar: {exc}")
        return []

def deletar_contrato(id_contrato: int) -> bool:
    if supabase is None: raise RuntimeError("Supabase não configurado.")
    try:
        supabase.table("contratos_comerciais").delete().eq("id", id_contrato).execute()
        return True
    except Exception as exc:
        raise RuntimeError(f"Erro ao deletar contrato: {exc}") from exc

def salvar_contrato(dados: dict) -> dict:
    if supabase is None: raise RuntimeError("Supabase não configurado.")
    id_contrato = dados.pop("id_contrato", None) 
    try:
        if id_contrato:
            resp = supabase.table("contratos_comerciais").update(dados).eq("id", id_contrato).execute()
        else:
            resp = supabase.table("contratos_comerciais").upsert(dados, on_conflict="cliente_cnpj").execute()
        return resp.data[0] if resp.data else {}
    except Exception as exc:
        raise RuntimeError(f"Erro ao salvar contrato: {exc}") from exc

def franquia_kg_no_mes(contratos: list, mes: str) -> float:
    """Soma franquias de contratos ativos com vigência que intersecta o mês.

    Um contrato ativo durante parte do mês conta integralmente; não existe
    regra de proporcionalidade cadastrada no projeto.
    """
    ano, numero_mes = map(int, mes[:7].split("-"))
    inicio_mes = date(ano, numero_mes, 1)
    fim_mes = date(ano, numero_mes, monthrange(ano, numero_mes)[1])
    total = 0.0
    for contrato in contratos:
        if contrato.get("status_contrato", "ATIVO") != "ATIVO":
            continue
        inicio = date.fromisoformat(str(contrato["data_inicio"])[:10]) if contrato.get("data_inicio") else None
        fim = date.fromisoformat(str(contrato["data_fim"])[:10]) if contrato.get("data_fim") else None
        if (inicio and inicio > fim_mes) or (fim and fim < inicio_mes):
            continue
        valor = float(contrato.get("franquia_kg_mes") or 0)
        if not 0 <= valor < float("inf"):
            raise ValueError("Franquia contratual inválida")
        total += valor
    return round(total, 2)