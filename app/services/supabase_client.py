import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError(
        "As variáveis SUPABASE_URL e SUPABASE_KEY "
        "não foram encontradas. Verifique o arquivo .env."
    )


def criar_cliente() -> Client:
    """
    Cria uma nova conexão com o Supabase.
    """
    return create_client(url, key)


# Cliente principal utilizado pelo backend
supabase: Client = criar_cliente()