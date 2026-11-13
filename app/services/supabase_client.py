import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

def criar_cliente() -> Client | None:
    """Cria uma nova conexão com o Supabase quando as credenciais estiverem disponíveis."""
    if not url or not key:
        return None

    return create_client(url, key)

# Cliente principal 
supabase: Client | None = criar_cliente()