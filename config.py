import os
from dotenv import load_dotenv

# Carrega as variáveis do ficheiro .env
load_dotenv()

class Config:
    # Configurações gerais
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "uma-chave-secreta-padrao")
    
    # Credenciais do Supabase
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")