from functools import wraps

from flask import (
    session,
    redirect,
    url_for,
    abort
)


NIVEIS_PERMISSAO = {
    "nenhum": 0,
    "leitura": 1,
    "gerenciar": 2
}


def tem_permissao(modulo, nivel="leitura"):
    """
    Verifica se o usuário logado possui o nível
    de permissão necessário para determinado módulo.
    """

    permissoes = session.get(
        "permissoes",
        {}
    )

    permissao_usuario = permissoes.get(
        modulo,
        "nenhum"
    )

    nivel_usuario = NIVEIS_PERMISSAO.get(
        permissao_usuario,
        0
    )

    nivel_necessario = NIVEIS_PERMISSAO.get(
        nivel,
        0
    )

    return nivel_usuario >= nivel_necessario


def exigir_permissao(modulo, nivel="leitura"):
    """
    Protege uma rota do Flask.

    Exemplo:

    @exigir_permissao("comercial", "leitura")
    def comercial():
        ...
    """

    def decorator(funcao):

        @wraps(funcao)
        def wrapper(*args, **kwargs):

            # Usuário não está logado
            if not session.get("access_token"):

                return redirect(
                    url_for("auth.login")
                )

            # Usuário não possui a permissão necessária
            if not tem_permissao(
                modulo,
                nivel
            ):

                return abort(403)

            return funcao(
                *args,
                **kwargs
            )

        return wrapper

    return decorator