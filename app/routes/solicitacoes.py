from flask import (
    Blueprint,
    render_template,
    session,
    jsonify
)

from app.services.supabase_client import supabase


solicitacoes_bp = Blueprint(
    'solicitacoes',
    __name__
)


# ============================================================
# VERIFICAR SE É ADMINISTRADOR
# ============================================================

def administrador_autorizado():

    return (
        session.get('access_token')
        and session.get('nome_cargo') == 'Administrador'
    )


# ============================================================
# PÁGINA DE SOLICITAÇÕES
# ============================================================

@solicitacoes_bp.route('/solicitacoes')
def solicitacoes():

    if not administrador_autorizado():

        return jsonify({
            'erro': 'Acesso negado.'
        }), 403

    return render_template('solicitacoes.html')


# ============================================================
# LISTAR SOLICITAÇÕES PENDENTES
# ============================================================

@solicitacoes_bp.route(
    '/solicitacoes/pendentes',
    methods=['GET']
)
def listar_pendentes():

    if not administrador_autorizado():

        return jsonify({
            'erro': 'Acesso negado.'
        }), 403

    try:

        # Buscar usuários pendentes
        resposta = (
            supabase
            .table('administradores')
            .select(
                'id, nome, sobrenome, email, '
                'cargo_id, status_usuario, criado_em'
            )
            .eq(
                'status_usuario',
                'pendente'
            )
            .order(
                'criado_em',
                desc=False
            )
            .execute()
        )

        usuarios = resposta.data or []

        # Adicionar nome do cargo
        for usuario in usuarios:

            cargo_id = usuario.get('cargo_id')

            usuario['cargo_nome'] = 'Cargo não informado'

            if cargo_id:

                cargo = (
                    supabase
                    .table('cargos')
                    .select('nome_cargo')
                    .eq('id', cargo_id)
                    .limit(1)
                    .execute()
                )

                if cargo.data:

                    usuario['cargo_nome'] = (
                        cargo.data[0].get('nome_cargo')
                        or 'Cargo não informado'
                    )

        return jsonify({
            'sucesso': True,
            'solicitacoes': usuarios
        })

    except Exception as e:

        print(
            'Erro ao buscar solicitações pendentes:',
            e
        )

        return jsonify({
            'sucesso': False,
            'erro': (
                'Não foi possível carregar '
                'as solicitações.'
            )
        }), 500


# ============================================================
# ÚLTIMAS 5 SOLICITAÇÕES ANALISADAS
# ============================================================

@solicitacoes_bp.route(
    '/solicitacoes/historico',
    methods=['GET']
)
def listar_historico():

    if not administrador_autorizado():

        return jsonify({
            'erro': 'Acesso negado.'
        }), 403

    try:

        resposta = (
            supabase
            .table('administradores')
            .select(
                'id, nome, sobrenome, email, '
                'cargo_id, status_usuario, '
                'criado_em, atualizado_em'
            )
            .in_(
                'status_usuario',
                ['ativo', 'inativo']
            )
            .order(
                'atualizado_em',
                desc=True
            )
            .limit(5)
            .execute()
        )

        usuarios = resposta.data or []

        # Adicionar nome do cargo
        for usuario in usuarios:

            cargo_id = usuario.get('cargo_id')

            usuario['cargo_nome'] = 'Cargo não informado'

            if cargo_id:

                cargo = (
                    supabase
                    .table('cargos')
                    .select('nome_cargo')
                    .eq('id', cargo_id)
                    .limit(1)
                    .execute()
                )

                if cargo.data:

                    usuario['cargo_nome'] = (
                        cargo.data[0].get('nome_cargo')
                        or 'Cargo não informado'
                    )

        return jsonify({
            'sucesso': True,
            'historico': usuarios
        })

    except Exception as e:

        print(
            'Erro ao buscar histórico:',
            e
        )

        return jsonify({
            'sucesso': False,
            'erro': (
                'Não foi possível carregar '
                'o histórico.'
            )
        }), 500


# ============================================================
# APROVAR SOLICITAÇÃO
# ============================================================

@solicitacoes_bp.route(
    '/solicitacoes/<int:administrador_id>/aprovar',
    methods=['POST']
)
def aprovar_solicitacao(administrador_id):

    if not administrador_autorizado():

        return jsonify({
            'erro': 'Acesso negado.'
        }), 403

    try:

        busca = (
            supabase
            .table('administradores')
            .select(
                'id, nome, sobrenome, status_usuario'
            )
            .eq(
                'id',
                administrador_id
            )
            .limit(1)
            .execute()
        )

        if not busca.data:

            return jsonify({
                'sucesso': False,
                'erro': 'Usuário não encontrado.'
            }), 404

        usuario = busca.data[0]

        if usuario['status_usuario'] != 'pendente':

            return jsonify({
                'sucesso': False,
                'erro': (
                    'Esta solicitação '
                    'já foi analisada.'
                )
            }), 400

        (
            supabase
            .table('administradores')
            .update({
                'status_usuario': 'ativo'
            })
            .eq(
                'id',
                administrador_id
            )
            .execute()
        )

        nome = (
            f"{usuario.get('nome', '')} "
            f"{usuario.get('sobrenome', '')}"
        ).strip()

        return jsonify({
            'sucesso': True,
            'mensagem': (
                f'{nome} foi aprovado.'
            )
        })

    except Exception as e:

        print(
            'Erro ao aprovar solicitação:',
            e
        )

        return jsonify({
            'sucesso': False,
            'erro': (
                'Não foi possível '
                'aprovar a solicitação.'
            )
        }), 500


# ============================================================
# RECUSAR SOLICITAÇÃO
# ============================================================

@solicitacoes_bp.route(
    '/solicitacoes/<int:administrador_id>/recusar',
    methods=['POST']
)
def recusar_solicitacao(administrador_id):

    if not administrador_autorizado():

        return jsonify({
            'erro': 'Acesso negado.'
        }), 403

    try:

        busca = (
            supabase
            .table('administradores')
            .select(
                'id, nome, sobrenome, status_usuario'
            )
            .eq(
                'id',
                administrador_id
            )
            .limit(1)
            .execute()
        )

        if not busca.data:

            return jsonify({
                'sucesso': False,
                'erro': 'Usuário não encontrado.'
            }), 404

        usuario = busca.data[0]

        if usuario['status_usuario'] != 'pendente':

            return jsonify({
                'sucesso': False,
                'erro': (
                    'Esta solicitação '
                    'já foi analisada.'
                )
            }), 400

        (
            supabase
            .table('administradores')
            .update({
                'status_usuario': 'inativo'
            })
            .eq(
                'id',
                administrador_id
            )
            .execute()
        )

        nome = (
            f"{usuario.get('nome', '')} "
            f"{usuario.get('sobrenome', '')}"
        ).strip()

        return jsonify({
            'sucesso': True,
            'mensagem': (
                f'{nome} foi recusado.'
            )
        })

    except Exception as e:

        print(
            'Erro ao recusar solicitação:',
            e
        )

        return jsonify({
            'sucesso': False,
            'erro': (
                'Não foi possível '
                'recusar a solicitação.'
            )
        }), 500