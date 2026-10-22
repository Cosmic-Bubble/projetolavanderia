"""Testes básicos da aplicação."""
from app import create_app

def test_app_init():
    app = create_app()
    assert app is not None
