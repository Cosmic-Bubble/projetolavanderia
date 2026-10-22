from flask import Flask
from config import Config  # Importa a classe de configuração

from app.routes.auth import auth_bp
from app.routes.admin import admin_bp

def create_app():
    app = Flask(__name__)
    
    # Carrega as configurações do config.py (incluindo secret_key)
    app.config.from_object(Config)

    # Regista os Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)  # Regista as rotas administrativas/privadas

    return app