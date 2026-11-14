import os

from flask import Flask, redirect, url_for, session, render_template
from config import Config

# Importa os Blueprints (todos com o prefixo app.routes)
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.importacao import importacao_bp
from app.routes.perfil import perfil_bp
from app.routes.solicitacoes import solicitacoes_bp
from app.routes.previsao import previsao_bp
from app.routes.alertas import alertas_bp
from app.routes.dashboard_api import dashboard_api_bp
from app.services.comercial_service import listar_contratos_ativos


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
    app.register_blueprint(dashboard_api_bp)

    # Rota raiz: logada vai para o dashboard, senão para o login
    @app.route("/")
    def index():
        if session.get("user"):
            return redirect(url_for("admin.dashboard"))
        return redirect(url_for("auth.login"))

    # Acessibilidade: coloca VLibras + filtro de daltonismo em toda página HTML
    @app.after_request
    def injetar_acessibilidade(resp):
        if (
            resp.mimetype == "text/html"
            and resp.status_code == 200
            and not resp.direct_passthrough
        ):
            html = resp.get_data(as_text=True)
            if "</body>" in html and "a11y-botao" not in html:
                bloco = render_template("_acessibilidade.html")
                resp.set_data(html.replace("</body>", bloco + "</body>", 1))
        return resp

    return app