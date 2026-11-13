import os

from flask import Flask
from config import Config

# Importa os Blueprints (todos com o prefixo app.routes)
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.importacao import importacao_bp
from app.routes.perfil import perfil_bp
from app.routes.solicitacoes import solicitacoes_bp
from app.routes.previsao import previsao_bp
from app.services.comercial_service import listar_contratos_ativos
from app.routes.alertas import alertas_bp

def create_app():
    app = Flask(
        __name__,
        static_folder="static",
        static_url_path="/static",
        template_folder="templates",
    )

    print("[flask] STATIC FOLDER:", os.path.abspath(app.static_folder))
    print("[flask] TEMPLATE FOLDER:", os.path.abspath(app.template_folder))

    # Carrega as configurações
    app.config.from_object(Config)

    # Regista os Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(importacao_bp)
    app.register_blueprint(perfil_bp)
    app.register_blueprint(solicitacoes_bp)
    app.register_blueprint(previsao_bp)
    app.register_blueprint(alertas_bp)

    return app