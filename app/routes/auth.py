import os

from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    redirect,
    url_for,
    session
)

from app.services.supabase_client import supabase


auth_bp = Blueprint('auth', __name__)


# ============================================================
# CADASTRO
# ============================================================

@auth_bp.route('/cadastro', methods=['GET', 'POST'])
def cadastro():

    # --------------------------------------------------------
    # GET - Carrega a página de cadastro com os cargos do banco
    # --------------------------------------------------------

    if request.method == 'GET':

        cargos = []

        try:

            resposta = (
                supabase
                .table('cargos')
                .select('id, nome_cargo')
                .eq('status_cargo', True)
                .order('nome_cargo')
                .execute()
            )

            cargos = resposta.data or []

        except Exception as err:

            print("Erro ao carregar cargos:", err)

        return render_template(
            'cadastro.html',
            cargos=cargos
        )

    # --------------------------------------------------------
    # POST - Processa o cadastro
    # --------------------------------------------------------

    nome = request.form.get('nome')
    sobrenome = request.form.get('sobrenome')
    email = request.form.get('email')
    senha = request.form.get('senha')

    # O HTML usa name="cargo"
    cargo_id = request.form.get('cargo')

    arquivo_foto = request.files.get('foto')

    # --------------------------------------------------------
    # Validação
    # --------------------------------------------------------

    if (
        not nome
        or not sobrenome
        or not email
        or not senha
        or not cargo_id
    ):

        return jsonify({
            "error": "Preencha todos os campos obrigatórios."
        }), 400

    try:

        # ----------------------------------------------------
        # 1. Cria usuário no Supabase Auth
        # ----------------------------------------------------

        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": senha
        })

        user_id = (
            auth_response.user.id
            if auth_response.user
            else None
        )

        if not user_id:

            return jsonify({
                "error": (
                    "Erro ao criar usuário "
                    "no sistema de autenticação."
                )
            }), 400

        # ----------------------------------------------------
        # 2. Upload da foto
        # ----------------------------------------------------

        foto_url = None

        if arquivo_foto and arquivo_foto.filename:

            extensao = (
                arquivo_foto.filename
                .split('.')[-1]
                .lower()
            )

            caminho_arquivo = (
                f"perfis/"
                f"{user_id}_"
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

            foto_url = (
                supabase
                .storage
                .from_('fotos_perfil')
                .get_public_url(
                    caminho_arquivo
                )
            )

        # ----------------------------------------------------
        # 3. Cria registro na tabela administradores
        # ----------------------------------------------------

        (
            supabase
            .table('administradores')
            .insert([{
                "auth_user_id": user_id,
                "nome": nome,
                "sobrenome": sobrenome,
                "email": email,
                "cargo_id": cargo_id,
                "foto_perfil_url": foto_url,
                "status_usuario": "pendente"
            }])
            .execute()
        )

        # ----------------------------------------------------
        # 4. Retorna sucesso
        # ----------------------------------------------------

        return jsonify({
            "success": True,
            "message": (
                "Cadastro realizado com sucesso! "
                "Verifique o seu e-mail para confirmação."
            )
        })

    except Exception as err:

        print("Erro no cadastro:", err)

        return jsonify({
            "error": str(err)
        }), 400


# ============================================================
# LOGIN
# ============================================================

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':

        email = request.form.get('email')
        senha = request.form.get('senha')

        if not email or not senha:

            return render_template(
                'login.html',
                erro='Informe o e-mail e a senha.'
            )

        try:

            # ------------------------------------------------
            # 1. Autenticação no Supabase
            # ------------------------------------------------

            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": senha
            })

            if not response.user or not response.session:

                return render_template(
                    'login.html',
                    erro='E-mail ou senha incorretos.'
                )

            user_id = response.user.id

            # ------------------------------------------------
            # 2. Busca o administrador
            # ------------------------------------------------

            admin_response = (
                supabase
                .table('administradores')
                .select(
                    'id, auth_user_id, nome, sobrenome, '
                    'email, cargo_id, foto_perfil_url, '
                    'status_usuario'
                )
                .eq('auth_user_id', user_id)
                .limit(1)
                .execute()
            )

            if not admin_response.data:

                supabase.auth.sign_out()

                return render_template(
                    'login.html',
                    erro=(
                        'Usuário não cadastrado '
                        'no sistema administrativo.'
                    )
                )

            administrador = admin_response.data[0]

            # ------------------------------------------------
            # 3. Verifica status do usuário
            # ------------------------------------------------

            status = administrador.get(
                'status_usuario'
            )

            if status != 'ativo':

                supabase.auth.sign_out()

                if status == 'pendente':

                    mensagem = (
                        'Seu cadastro ainda está '
                        'pendente de aprovação.'
                    )

                elif status == 'inativo':

                    mensagem = (
                        'Seu usuário está inativo. '
                        'Entre em contato com um administrador.'
                    )

                else:

                    mensagem = (
                        'Seu usuário não possui '
                        'permissão para acessar o sistema.'
                    )

                return render_template(
                    'login.html',
                    erro=mensagem
                )

            # ------------------------------------------------
            # 4. Busca o cargo e as permissões
            # ------------------------------------------------

            cargo = {}

            try:

                cargo_id = administrador.get('cargo_id')

                print(
                    "Cargo ID do administrador:",
                    cargo_id
                )

                if not cargo_id:

                    print(
                        "ERRO: O administrador não possui cargo_id."
                    )

                else:

                    cargo_response = (
                        supabase
                        .table('cargos')
                        .select(
                            'id, nome_cargo, descricao_cargo, '
                            'status_cargo, visao_geral, '
                            'comercial, social, '
                            'capacidade_maquinas, alertas, '
                            'importacao'
                        )
                        .eq('id', cargo_id)
                        .limit(1)
                        .execute()
                    )

                    print(
                        "Resultado da busca do cargo:",
                        cargo_response.data
                    )

                    if cargo_response.data:

                        cargo = cargo_response.data[0]

            except Exception as err:

                print(
                    "ERRO REAL AO CARREGAR CARGO:",
                    repr(err)
                )

                cargo = {}

            # ------------------------------------------------
            # 5. Verifica se o cargo foi encontrado
            # ------------------------------------------------

            if not cargo:

                supabase.auth.sign_out()

                return render_template(
                    'login.html',
                    erro=(
                        'Não foi possível carregar o cargo '
                        'do usuário. Verifique o terminal '
                        'do Flask.'
                    )
                )

            # ------------------------------------------------
            # 6. Verifica se o cargo está ativo
            # ------------------------------------------------

            if not cargo.get('status_cargo', False):

                supabase.auth.sign_out()

                return render_template(
                    'login.html',
                    erro=(
                        'O cargo do usuário está '
                        'inativo no sistema.'
                    )
                )

            # ------------------------------------------------
            # 7. Nome do cargo
            # ------------------------------------------------

            nome_cargo = (
                cargo.get('nome_cargo')
                or 'Sem cargo'
            )

            # ------------------------------------------------
            # 8. Limpa sessão anterior
            # ------------------------------------------------

            session.clear()

            # ------------------------------------------------
            # 9. Guarda dados do usuário na sessão
            # ------------------------------------------------

            session['user'] = user_id

            session['access_token'] = (
                response.session.access_token
            )

            session['refresh_token'] = (
                response.session.refresh_token
            )

            session['administrador_id'] = (
                administrador['id']
            )

            session['cargo_id'] = (
                administrador['cargo_id']
            )

            session['nome_cargo'] = nome_cargo

            session['nome_usuario'] = (
                f"{administrador['nome']} "
                f"{administrador['sobrenome']}"
            )

            # ------------------------------------------------
            # 10. Guarda permissões dos módulos
            # ------------------------------------------------

            session['permissoes'] = {

                'visao_geral': (
                    cargo.get('visao_geral')
                    or 'nenhum'
                ),

                'comercial': (
                    cargo.get('comercial')
                    or 'nenhum'
                ),

                'social': (
                    cargo.get('social')
                    or 'nenhum'
                ),

                'capacidade_maquinas': (
                    cargo.get('capacidade_maquinas')
                    or 'nenhum'
                ),

                'alertas': (
                    cargo.get('alertas')
                    or 'nenhum'
                ),

                'importacao': (
                    cargo.get('importacao')
                    or 'nenhum'
                )
            }

            # ------------------------------------------------
            # 11. Exibe no terminal as permissões carregadas
            # ------------------------------------------------

            print(
                "Usuário logado:",
                administrador['nome'],
                administrador['sobrenome']
            )

            print(
                "Cargo:",
                nome_cargo
            )

            print(
                "Permissões:",
                session['permissoes']
            )

            # ------------------------------------------------
            # 12. Vai para o dashboard
            # ------------------------------------------------

            return redirect(
                url_for('admin.dashboard')
            )

        except Exception as err:

            print(
                "Erro no login:",
                repr(err)
            )

            return render_template(
                'login.html',
                erro='E-mail ou senha incorretos.'
            )

    return render_template('login.html')


# ============================================================
# ESQUECI A SENHA
# ============================================================

@auth_bp.route('/api/esqueci-senha', methods=['POST'])
def esqueci_senha():

    data = request.get_json() or {}

    email = data.get('email')

    if not email:

        return jsonify({
            "error": "E-mail não fornecido."
        }), 400

    try:

        supabase.auth.reset_password_for_email(
            email,
            {
                "redirect_to": (
                    request.host_url +
                    "redefinir_senha"
                )
            }
        )

        return jsonify({
            "success": True,
            "message": (
                "Instruções enviadas para o seu e-mail!"
            )
        })

    except Exception as err:

        print(
            "Erro na redefinição:",
            err
        )

        return jsonify({
            "error": str(err)
        }), 400


# ============================================================
# GUARDAR SESSÃO
# ============================================================

@auth_bp.route('/api/guardar-sessao', methods=['POST'])
def guardar_sessao():

    data = request.get_json() or {}

    access_token = data.get('access_token')
    refresh_token = data.get('refresh_token')

    if access_token:

        session['access_token'] = access_token
        session['refresh_token'] = refresh_token

        return jsonify({
            "success": True
        })

    return jsonify({
        "error": "Tokens não fornecidos."
    }), 400


# ============================================================
# REDEFINIR SENHA
# ============================================================

@auth_bp.route('/redefinir_senha', methods=['GET', 'POST'])
def redefinir_senha():

    if request.method == 'POST':

        data = request.get_json() or {}

        nova_senha = data.get('senha')

        if not nova_senha:

            return jsonify({
                "error": "Nova senha não fornecida."
            }), 400

        access_token = session.get(
            'access_token'
        )

        refresh_token = session.get(
            'refresh_token'
        )

        if not access_token:

            return jsonify({
                "error": (
                    "Sessão de recuperação expirada "
                    "ou inválida. Solicite um novo e-mail."
                )
            }), 400

        try:

            supabase.auth.set_session(
                access_token,
                refresh_token
            )

            supabase.auth.update_user({
                "password": nova_senha
            })

            session.pop(
                'access_token',
                None
            )

            session.pop(
                'refresh_token',
                None
            )

            return jsonify({
                "success": True,
                "message": (
                    "Senha redefinida com sucesso! "
                    "Redirecionando..."
                )
            })

        except Exception as err:

            print(
                "Erro ao redefinir senha:",
                err
            )

            return jsonify({
                "error": str(err)
            }), 400

    # --------------------------------------------------------
    # Recuperação via código
    # --------------------------------------------------------

    code = request.args.get('code')

    print(
        "CODE RECEBIDO NA URL:",
        code
    )

    if code:

        try:

            auth_response = (
                supabase.auth.exchange_code_for_session({
                    "auth_code": code
                })
            )

            if auth_response.session:

                session['access_token'] = (
                    auth_response.session.access_token
                )

                session['refresh_token'] = (
                    auth_response.session.refresh_token
                )

                print(
                    "Sessão guardada com sucesso "
                    "na session do Flask!"
                )

        except Exception as err:

            print(
                "Erro ao trocar código por sessão:",
                err
            )

    return render_template(
        'redefinir_senha.html'
    )


# ============================================================
# LOGOUT
# ============================================================

@auth_bp.route('/logout')
def logout():

    try:

        supabase.auth.sign_out()

    except Exception as err:

        print(
            "Erro ao fazer logout:",
            err
        )

    session.clear()

    return redirect(
        url_for('auth.login')
    )