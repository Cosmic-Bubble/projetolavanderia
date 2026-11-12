import os

from flask import Blueprint, jsonify, session, request

from app.services.supabase_client import (
    supabase,
    criar_cliente
)


perfil_bp = Blueprint('perfil', __name__)


# ============================================================
# MEU PERFIL
# ============================================================

@perfil_bp.route('/api/meu-perfil', methods=['GET'])
def meu_perfil():

    user_id = session.get('user')

    if not user_id:
        return jsonify({
            "error": "Não autenticado"
        }), 401

    try:

        response = (
            supabase
            .table('administradores')
            .select(
                'id, nome, sobrenome, email, '
                'cargo_id, foto_perfil_url, status_usuario'
            )
            .eq('auth_user_id', user_id)
            .limit(1)
            .execute()
        )

        if not response.data:

            return jsonify({
                "nome": "Administrador",
                "sobrenome": "",
                "foto_url": None,
                "cargo": "Gestão"
            }), 200

        admin = response.data[0]

        # ----------------------------------------------------
        # Busca nome do cargo
        # ----------------------------------------------------

        cargo_nome = "Gestão"

        if admin.get("cargo_id"):

            try:

                cargo_resp = (
                    supabase
                    .table('cargos')
                    .select('nome_cargo')
                    .eq('id', admin['cargo_id'])
                    .limit(1)
                    .execute()
                )

                if cargo_resp.data:

                    cargo_nome = (
                        cargo_resp.data[0]
                        .get('nome_cargo')
                        or "Gestão"
                    )

            except Exception as err:

                print(
                    ">>> ERRO AO BUSCAR CARGO:",
                    err
                )

        return jsonify({

            "nome": (
                admin.get("nome")
                or "Administrador"
            ),

            "sobrenome": (
                admin.get("sobrenome")
                or ""
            ),

            "foto_url": (
                admin.get("foto_perfil_url")
            ),

            "cargo": cargo_nome

        })

    except Exception as err:

        print(
            "ERRO AO BUSCAR PERFIL:",
            err
        )

        return jsonify({
            "error": str(err)
        }), 400


# ============================================================
# ATUALIZAR PERFIL
# ============================================================

@perfil_bp.route('/api/atualizar-perfil', methods=['POST'])
def atualizar_perfil():

    user_id = session.get('user')

    if not user_id:
        return jsonify({
            "error": "Não autenticado"
        }), 401

    try:

        nome = request.form.get('nome')
        sobrenome = request.form.get('sobrenome')
        arquivo_foto = request.files.get('foto')

        update_data = {}

        if nome:
            update_data['nome'] = nome

        if sobrenome:
            update_data['sobrenome'] = sobrenome

        # ----------------------------------------------------
        # Atualização da foto
        # ----------------------------------------------------

        if arquivo_foto and arquivo_foto.filename:

            resp_atual = (
                supabase
                .table('administradores')
                .select('foto_perfil_url')
                .eq('auth_user_id', user_id)
                .limit(1)
                .execute()
            )

            # -----------------------------------------------
            # Remove foto antiga
            # -----------------------------------------------

            if (
                resp_atual.data
                and resp_atual.data[0].get(
                    'foto_perfil_url'
                )
            ):

                url_antiga = (
                    resp_atual.data[0]
                    ['foto_perfil_url']
                )

                try:

                    caminho_antigo = (
                        url_antiga
                        .split('/fotos_perfil/')[-1]
                    )

                    (
                        supabase
                        .storage
                        .from_('fotos_perfil')
                        .remove([caminho_antigo])
                    )

                    print(
                        ">>> Foto antiga apagada:",
                        caminho_antigo
                    )

                except Exception as err:

                    print(
                        ">>> Aviso: Não foi possível "
                        "apagar a foto antiga:",
                        err
                    )

            # -----------------------------------------------
            # Faz upload da nova foto
            # -----------------------------------------------

            extensao = (
                arquivo_foto.filename
                .split('.')[-1]
                .lower()
            )

            caminho_arquivo = (
                f"perfis/{user_id}_"
                f"{os.urandom(4).hex()}."
                f"{extensao}"
            )

            file_bytes = arquivo_foto.read()

            content_type = (
                arquivo_foto.mimetype
                or f"image/{extensao}"
            )

            (
                supabase
                .storage
                .from_('fotos_perfil')
                .upload(
                    caminho_arquivo,
                    file_bytes,
                    file_options={
                        "content-type": content_type
                    }
                )
            )

            nova_foto_url = (
                supabase
                .storage
                .from_('fotos_perfil')
                .get_public_url(
                    caminho_arquivo
                )
            )

            update_data[
                'foto_perfil_url'
            ] = nova_foto_url

        # ----------------------------------------------------
        # Atualiza banco
        # ----------------------------------------------------

        if update_data:

            (
                supabase
                .table('administradores')
                .update(update_data)
                .eq('auth_user_id', user_id)
                .execute()
            )

        return jsonify({
            "success": True,
            "message": (
                "Perfil atualizado com sucesso!"
            )
        })

    except Exception as err:

        print(
            "ERRO AO ATUALIZAR PERFIL:",
            err
        )

        return jsonify({
            "error": str(err)
        }), 400


# ============================================================
# ALTERAR SENHA
# ============================================================

@perfil_bp.route('/api/alterar-senha', methods=['POST'])
def alterar_senha():

    user_id = session.get('user')

    if not user_id:
        return jsonify({
            "error": "Não autenticado"
        }), 401

    try:

        data = request.get_json() or {}

        senha_atual = data.get(
            'senha_atual'
        )

        nova_senha = data.get(
            'nova_senha'
        )

        if not senha_atual or not nova_senha:

            return jsonify({
                "error": (
                    "Preencha todos os campos "
                    "de senha."
                )
            }), 400

        # ----------------------------------------------------
        # Busca e-mail do administrador
        # ----------------------------------------------------

        resp_admin = (
            supabase
            .table('administradores')
            .select('email')
            .eq('auth_user_id', user_id)
            .limit(1)
            .execute()
        )

        if not resp_admin.data:

            return jsonify({
                "error": (
                    "Usuário não encontrado no banco."
                )
            }), 404

        email = resp_admin.data[0]['email']

        # ----------------------------------------------------
        # Cria cliente separado para autenticação
        # ----------------------------------------------------

        cliente_auth = criar_cliente()

        try:

            cliente_auth.auth.sign_in_with_password({
                "email": email,
                "password": senha_atual
            })

        except Exception:

            return jsonify({
                "error": (
                    "A senha atual está incorreta."
                )
            }), 400

        # ----------------------------------------------------
        # Atualiza senha
        # ----------------------------------------------------

        cliente_auth.auth.update_user({
            "password": nova_senha
        })

        return jsonify({
            "success": True,
            "message": (
                "Senha alterada com sucesso!"
            )
        })

    except Exception as err:

        print(
            "ERRO AO ALTERAR SENHA:",
            err
        )

        return jsonify({
            "error": str(err)
        }), 400