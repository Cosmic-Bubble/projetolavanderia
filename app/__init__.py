from flask import Flask
from config import Config

# Importa os Blueprints (todos com o prefixo app.routes)
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.perfil import perfil_bp

def create_app():
    app = Flask(__name__)
    
    # Carrega as configurações
    app.config.from_object(Config)

    # Regista os Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(perfil_bp) # <-- Adicionado aqui dentro

    return app