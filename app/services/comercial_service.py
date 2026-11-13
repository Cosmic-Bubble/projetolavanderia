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
        # Trocamos id_contrato por id
        supabase.table("contratos_comerciais").delete().eq("id", id_contrato).execute()
        return True
    except Exception as exc:
        raise RuntimeError(f"Erro ao deletar contrato: {exc}") from exc

def salvar_contrato(dados: dict) -> dict:
    if supabase is None: raise RuntimeError("Supabase não configurado.")
    id_contrato = dados.pop("id_contrato", None) # O JS ainda manda como id_contrato, mas removemos
    try:
        if id_contrato:
            # Trocamos id_contrato por id no WHERE do update
            resp = supabase.table("contratos_comerciais").update(dados).eq("id", id_contrato).execute()
        else:
            resp = supabase.table("contratos_comerciais").upsert(dados, on_conflict="cliente_cnpj").execute()
        return resp.data[0] if resp.data else {}
    except Exception as exc:
        raise RuntimeError(f"Erro ao salvar contrato: {exc}") from exc