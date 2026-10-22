from flask import Blueprint, render_template, session, redirect, url_for

# Criação do Blueprint para a área administrativa
admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard')
def dashboard():
    # Proteção: Se não houver token na sessão, manda de volta para o login
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('dashboard.html')

@admin_bp.route('/alertas')
def alertas():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('alertas.html')

@admin_bp.route('/capacidade')
def capacidade():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('capacidade.html')

@admin_bp.route('/comercial')
def comercial():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('comercial.html')

@admin_bp.route('/configuracoes')
def configuracoes():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('configuracoes.html')

@admin_bp.route('/importacao')
def importacao():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('importacao.html')

@admin_bp.route('/menu')
def menu():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('menu.html')

@admin_bp.route('/social')
def social():
    
    if not session.get('access_token'):
        return redirect(url_for('auth.login'))
        
    return render_template('social.html')