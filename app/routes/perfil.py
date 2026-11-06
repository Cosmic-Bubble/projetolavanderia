from flask import Blueprint, jsonify, session, request
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

perfil_bp = Blueprint('perfil', __name__)

@perfil_bp.route('/api/meu-perfil', methods=['GET'])
def meu_perfil():
    user_id = session.get('user')
    access_token = session.get('access_token')
    refresh_token = session.get('refresh_token')
    
    if not user_id:
        return jsonify({"error": "Não autenticado"}), 401

    try:
        supabase_user = create_client(url, key)
        if access_token and refresh_token:
            supabase_user.auth.set_session(access_token, refresh_token)

        response = (
            supabase_user.table('administradores')
            .select('*')
            .eq('auth_user_id', user_id)
            .execute()
        )
        
        if not response.data:
            return jsonify({"nome": "Administrador", "sobrenome": "", "foto_url": None, "cargo": "Gestão"}), 200
            
        admin = response.data[0]
        
        cargo_nome = "Gestão"
        if admin.get("cargo_id"):
            try:
                cargo_resp = supabase_user.table('cargos').select('nome_cargo').eq('id', admin['cargo_id']).execute()
                if cargo_resp.data:
                    cargo_nome = cargo_resp.data[0].get('nome_cargo')
            except Exception as e:
                print(">>> ERRO AO BUSCAR CARGO:", e)

        return jsonify({
            "nome": admin.get("nome") or "Administrador",
            "sobrenome": admin.get("sobrenome") or "",
            "foto_url": admin.get("foto_perfil_url"),
            "cargo": cargo_nome
        })
        
    except Exception as err:
        print("ERRO AO BUSCAR PERFIL:", err)
        return jsonify({"error": str(err)}), 400


# --- ROTA PARA ATUALIZAR O PERFIL ---
@perfil_bp.route('/api/atualizar-perfil', methods=['POST'])
def atualizar_perfil():
    user_id = session.get('user')
    access_token = session.get('access_token')
    refresh_token = session.get('refresh_token')
    
    if not user_id:
        return jsonify({"error": "Não autenticado"}), 401

    try:
        supabase_user = create_client(url, key)
        if access_token and refresh_token:
            supabase_user.auth.set_session(access_token, refresh_token)

        # Pega os dados do formulário
        nome = request.form.get('nome')
        sobrenome = request.form.get('sobrenome')
        arquivo_foto = request.files.get('foto')

        # Dicionário com os dados a atualizar
        update_data = {}
        if nome: update_data['nome'] = nome
        if sobrenome: update_data['sobrenome'] = sobrenome

        # Se o usuário enviou uma nova foto
        if arquivo_foto and arquivo_foto.filename:
            
            # 1. Busca a foto antiga no banco para poder apagar do bucket
            resp_atual = (
                supabase_user.table('administradores')
                .select('foto_perfil_url')
                .eq('auth_user_id', user_id)
                .execute()
            )
            
            if resp_atual.data and resp_atual.data[0].get('foto_perfil_url'):
                url_antiga = resp_atual.data[0]['foto_perfil_url']
                try:
                    # Extrai apenas o caminho do arquivo da URL antiga
                    # Ex: "perfis/94b6...jpg"
                    caminho_antigo = url_antiga.split('/fotos_perfil/')[-1]
                    
                    # Manda o Supabase apagar o arquivo do bucket
                    supabase_user.storage.from_('fotos_perfil').remove([caminho_antigo])
                    print(f">>> Foto antiga apagada do bucket: {caminho_antigo}")
                except Exception as e:
                    print(">>> Aviso: Não foi possível apagar a foto antiga:", e)

            # 2. Prepara e faz o upload da nova foto
            extensao = arquivo_foto.filename.split('.')[-1].lower()
            caminho_arquivo = f"perfis/{user_id}_{os.urandom(4).hex()}.{extensao}"
            
            file_bytes = arquivo_foto.read()
            content_type = arquivo_foto.mimetype or f"image/{extensao}"
            
            supabase_user.storage.from_('fotos_perfil').upload(
                caminho_arquivo, 
                file_bytes, 
                file_options={"content-type": content_type}
            )
            
            # Pega a nova URL e adiciona ao dicionário de atualização
            nova_foto_url = supabase_user.storage.from_('fotos_perfil').get_public_url(caminho_arquivo)
            update_data['foto_perfil_url'] = nova_foto_url

        # Atualiza a tabela administradores
        if update_data:
            supabase_user.table('administradores').update(update_data).eq('auth_user_id', user_id).execute()

        return jsonify({"success": True, "message": "Perfil atualizado com sucesso!"})

    except Exception as err:
        print("ERRO AO ATUALIZAR PERFIL:", err)
        return jsonify({"error": str(err)}), 400

# --- ROTA PARA ALTERAR A SENHA ---
@perfil_bp.route('/api/alterar-senha', methods=['POST'])
def alterar_senha():
    user_id = session.get('user')
    
    if not user_id:
        return jsonify({"error": "Não autenticado"}), 401

    try:
        data = request.get_json()
        senha_atual = data.get('senha_atual')
        nova_senha = data.get('nova_senha')

        if not senha_atual or not nova_senha:
            return jsonify({"error": "Preencha todos os campos de senha."}), 400

        # Cria um cliente novo para não sujar a sessão global
        supabase_user = create_client(url, key)
        
        # 1. Busca o e-mail do usuário no banco para poder reautenticar
        resp_admin = supabase_user.table('administradores').select('email').eq('auth_user_id', user_id).execute()
        
        if not resp_admin.data:
            return jsonify({"error": "Usuário não encontrado no banco."}), 404
            
        email = resp_admin.data[0]['email']

        # 2. Valida a senha atual tentando fazer login com ela
        try:
            supabase_user.auth.sign_in_with_password({"email": email, "password": senha_atual})
        except Exception:
            # Se cair aqui, a senha atual está errada
            return jsonify({"error": "A senha atual está incorreta."}), 400

        # 3. Se o login deu certo, o cliente já está autenticado.
        # Agora podemos atualizar a senha com segurança.
        supabase_user.auth.update_user({"password": nova_senha})

        return jsonify({"success": True, "message": "Senha alterada com sucesso!"})

    except Exception as err:
        print("ERRO AO ALTERAR SENHA:", err)
        return jsonify({"error": str(err)}), 400