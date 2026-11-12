from flask import (
    Blueprint,
    render_template,
    session,
    redirect,
    url_for
)

from app.utils.permissoes import exigir_permissao


admin_bp = Blueprint(
    'admin',
    __name__
)


# ============================================================
# DASHBOARD GERAL
# ============================================================

@admin_bp.route('/dashboard')
@exigir_permissao(
    'visao_geral',
    'leitura'
)
def dashboard():

    return render_template(
        'dashboard.html'
    )


# ============================================================
# ALERTAS
# ============================================================

@admin_bp.route('/alertas')
@exigir_permissao(
    'alertas',
    'leitura'
)
def alertas():

    return render_template(
        'alertas.html'
    )


# ============================================================
# CAPACIDADE DAS MÁQUINAS
# ============================================================

@admin_bp.route('/capacidade')
@exigir_permissao(
    'capacidade_maquinas',
    'leitura'
)
def capacidade():

    return render_template(
        'capacidade.html'
    )


# ============================================================
# COMERCIAL
# ============================================================

@admin_bp.route('/comercial')
@exigir_permissao(
    'comercial',
    'leitura'
)
def comercial():

    return render_template(
        'comercial.html'
    )


# ============================================================
# SOCIAL
# ============================================================

@admin_bp.route('/social')
@exigir_permissao(
    'social',
    'leitura'
)
def social():

    return render_template(
        'social.html'
    )


# ============================================================
# IMPORTAÇÃO
# ============================================================

@admin_bp.route('/importacao')
@exigir_permissao(
    'importacao',
    'gerenciar'
)
def importacao():

    return render_template(
        'importacao.html'
    )


# ============================================================
# CONFIGURAÇÕES / MEU PERFIL
# ============================================================

@admin_bp.route('/configuracoes')
def configuracoes():

    if not session.get('access_token'):

        return redirect(
            url_for('auth.login')
        )

    return render_template(
        'configuracoes.html'
    )


# ============================================================
# MENU
# ============================================================

@admin_bp.route('/menu')
def menu():

    if not session.get('access_token'):

        return redirect(
            url_for('auth.login')
        )

    return render_template(
        '_menu.html'
    )