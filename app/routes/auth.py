from dotenv import load_dotenv
import os
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session
from supabase import create_client, Client

# Carrega as variáveis do ficheiro .env para o ambiente do Python
load_dotenv()

# Agora o os.environ consegue ler as chaves corretamente
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Validação opcional para detetar o erro imediatamente se faltar alguma chave
if not url or not key:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY não foram encontradas. Verifique o seu ficheiro .env")

supabase: Client = create_client(url, key)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/', methods=['GET', 'POST'])

@auth_bp.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        nome = request.form.get('nome')
        sobrenome = request.form.get('sobrenome')
        email = request.form.get('email')
        senha = request.form.get('senha')
        cargo_id = request.form.get('cargo')
        arquivo_foto = request.files.get('foto')

        if not email or not senha or not cargo_id:
            return jsonify({"error": "Preencha todos os campos obrigatórios."}), 400

        try:
            # 1. Cria o utilizador no Supabase Auth
            auth_response = supabase.auth.sign_up({"email": email, "password": senha})
            user_id = auth_response.user.id if auth_response.user else None

            if not user_id:
                return jsonify({"error": "Erro ao criar utilizador no sistema de autenticação."}), 400

            foto_url = None
            # 2. Faz o upload da foto para o Storage do Supabase (se enviada)
            if arquivo_foto and arquivo_foto.filename:
                extensao = arquivo_foto.filename.split('.')[-1].lower()
                caminho_arquivo = f"perfis/{user_id}_{os.urandom(4).hex()}.{extensao}"
                
                # Lê os bytes e obtém o tipo MIME correto enviado pelo navegador
                file_bytes = arquivo_foto.read()
                content_type = arquivo_foto.mimetype or f"image/{extensao}"
                
                # Correção: passar file_options com o content-type adequado para o Supabase
                supabase.storage.from_('fotos_perfil').upload(
                    caminho_arquivo, 
                    file_bytes, 
                    file_options={"content-type": content_type}
                )
                
                # Obtém a URL pública
                foto_url = supabase.storage.from_('fotos_perfil').get_public_url(caminho_arquivo)

            # 3. Insere o registo na tabela administradores
            supabase.table('administradores').insert([{
                "auth_user_id": user_id,
                "nome": nome,
                "sobrenome": sobrenome,
                "email": email,
                "cargo_id": cargo_id,
                "foto_perfil_url": foto_url,
                "status_usuario": "pendente"
            }]).execute()

            return jsonify({
                "success": True, 
                "message": "Cadastro realizado com sucesso! Verifique o seu e-mail para confirmação."
            })

        except Exception as err:
            print("Erro no cadastro:", err)
            return jsonify({"error": str(err)}), 400

    # Método GET: Vamos depurar o que vem do Supabase
    cargos = []
    try:
        response = supabase.table('cargos').select('id, nome_cargo').eq('status_cargo', True).order('nome_cargo').execute()
        print("--- RESPOSTA BRUTA DO SUPABASE (CARGOS) ---", response)
        
        # Garante que apanha a lista de dados independentemente da versão da lib
        if hasattr(response, 'data'):
            cargos = response.data
        else:
            cargos = response
            
        print("--- CARGOS PROCESSADOS ---", cargos)
    except Exception as err:
        print("--- ERRO AO CARREGAR CARGOS ---", err)

    return render_template('cadastro.html', cargos=cargos)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('senha')

        try:
            # Autenticação no Supabase Auth pelo backend
            response = supabase.auth.sign_in_with_password({"email": email, "password": senha})
            
            # Guarda o ID e os tokens essenciais na sessão do Flask
            session['user'] = response.user.id
            if response.session:
                session['access_token'] = response.session.access_token
                session['refresh_token'] = response.session.refresh_token
            
            return redirect(url_for('admin.dashboard'))
            
        except Exception as err:
            print("Erro no login:", err)
            return render_template('login.html', erro="E-mail ou senha incorretos.")

    return render_template('login.html')

@auth_bp.route('/api/esqueci-senha', methods=['POST'])
def esqueci_senha():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "E-mail não fornecido."}), 400

    try:
        # Envio de e-mail de redefinição pelo Supabase Python
        supabase.auth.reset_password_for_email(
            email,
            {"redirect_to": request.host_url + "redefinir_senha"}
        )
        return jsonify({"success": True, "message": "Instruções enviadas para o seu e-mail!"})
    except Exception as err:
        print("Erro na redefinição:", err)
        return jsonify({"error": str(err)}), 400

@auth_bp.route('/api/guardar-sessao', methods=['POST'])
def guardar_sessao():
    data = request.get_json()
    access_token = data.get('access_token')
    refresh_token = data.get('refresh_token')

    if access_token:
        session['access_token'] = access_token
        session['refresh_token'] = refresh_token
        return jsonify({"success": True})
    
    return jsonify({"error": "Tokens não fornecidos."}), 400

@auth_bp.route('/redefinir_senha', methods=['GET', 'POST'])
def redefinir_senha():
    if request.method == 'POST':
        data = request.get_json()
        nova_senha = data.get('senha')

        if not nova_senha:
            return jsonify({"error": "Nova senha não fornecida."}), 400

        # Recupera ambos os tokens guardados na sessão do Flask
        access_token = session.get('access_token')
        refresh_token = session.get('refresh_token') # <--- Linha que faltava

        if not access_token:
            return jsonify({"error": "Sessão de recuperação expirada ou inválida. Solicite um novo e-mail."}), 400

        try:
            # Passa ambos os tokens para o cliente do Supabase
            supabase.auth.set_session(access_token, refresh_token)
            
            # Atualiza a senha do utilizador no Supabase
            supabase.auth.update_user({"password": nova_senha})
            
            # Limpa os tokens da sessão do Flask após o sucesso
            session.pop('access_token', None)
            session.pop('refresh_token', None)

            return jsonify({"success": True, "message": "Senha redefinida com sucesso! Redirecionando..."})
        except Exception as err:
            print("Erro ao redefinir senha:", err)
            return jsonify({"error": str(err)}), 400

    # Método GET
    code = request.args.get('code')
    print("CODE RECEBIDO NA URL:", code) # DEBUG
    
    if code:
        try:
            auth_response = supabase.auth.exchange_code_for_session(code)
            session['access_token'] = auth_response.session.access_token
            session['refresh_token'] = auth_response.session.refresh_token
            print("Sessão guardada com sucesso na session do Flask!")
        except Exception as err:
            print("Erro ao trocar código por sessão:", err)

    return render_template('redefinir_senha.html')

@auth_bp.route('/logout')
def logout():
    # Remove todos os dados da sessão do Flask (access_token, user id, etc.)
    session.clear()
    return redirect(url_for('auth.login'))