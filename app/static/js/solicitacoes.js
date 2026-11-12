document.addEventListener("DOMContentLoaded", () => {

    carregarSolicitacoes();
    carregarHistorico();

});


/* ==========================================================
   CARREGAR SOLICITAÇÕES PENDENTES
========================================================== */

async function carregarSolicitacoes() {

    const lista = document.getElementById("lista-pendentes");
    const contador = document.getElementById("contador-pendentes");

    try {

        const resposta = await fetch("/solicitacoes/pendentes");

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.erro || "Erro ao carregar solicitações."
            );

        }

        const solicitacoes = dados.solicitacoes || [];

        contador.textContent = solicitacoes.length;


        /* ==================================================
           NENHUMA SOLICITAÇÃO
        ================================================== */

        if (solicitacoes.length === 0) {

            lista.innerHTML = `
                <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                    <h3 class="text-lg font-semibold text-slate-700">
                        Nenhuma solicitação pendente
                    </h3>

                    <p class="mt-2 text-sm text-slate-500">
                        Não existem novos usuários aguardando aprovação.
                    </p>

                </div>
            `;

            return;
        }


        /* ==================================================
           MONTAR SOLICITAÇÕES
        ================================================== */

        lista.innerHTML = solicitacoes.map(usuario => {

            const nomeCompleto =
                `${usuario.nome || ""} ${usuario.sobrenome || ""}`.trim();

            const cargo =
                usuario.cargo_nome ||
                "Cargo não informado";

            const email =
                usuario.email ||
                "E-mail não informado";

            const data =
                formatarData(usuario.criado_em);


            return `

                <div class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">

                    <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        <!-- INFORMAÇÕES -->

                        <div class="flex-1">

                            <h3 class="text-lg font-bold text-slate-800">
                                ${escaparHTML(nomeCompleto)}
                            </h3>

                            <div class="mt-3 space-y-2 text-sm text-slate-600">

                                <p>
                                    <span class="font-semibold text-slate-700">
                                        E-mail:
                                    </span>

                                    ${escaparHTML(email)}
                                </p>

                                <p>
                                    <span class="font-semibold text-slate-700">
                                        Cargo solicitado:
                                    </span>

                                    ${escaparHTML(cargo)}
                                </p>

                                <p>
                                    <span class="font-semibold text-slate-700">
                                        Solicitado em:
                                    </span>

                                    ${data}
                                </p>

                            </div>

                        </div>


                        <!-- AÇÕES -->

                        <div class="flex gap-3">

                            <button
                                type="button"
                                onclick="aprovarSolicitacao(${usuario.id})"
                                class="rounded-lg bg-green-100 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-200">

                                Aprovar

                            </button>


                            <button
                                type="button"
                                onclick="recusarSolicitacao(${usuario.id})"
                                class="rounded-lg bg-red-100 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-200">

                                Recusar

                            </button>

                        </div>

                    </div>

                </div>

            `;

        }).join("");


    } catch (erro) {

        console.error(
            "Erro ao carregar solicitações:",
            erro
        );

        lista.innerHTML = `

            <div class="rounded-xl border border-red-200 bg-red-50 p-5">

                <p class="text-sm font-medium text-red-700">
                    Não foi possível carregar as solicitações.
                </p>

            </div>

        `;

    }

}


/* ==========================================================
   APROVAR SOLICITAÇÃO
========================================================== */

async function aprovarSolicitacao(id) {

    const confirmar = confirm(
        "Tem certeza que deseja aprovar este usuário?"
    );

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(
            `/solicitacoes/${id}/aprovar`,
            {
                method: "POST"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Não foi possível aprovar o usuário."
            );

        }

        alert(
            dados.mensagem ||
            "Usuário aprovado com sucesso."
        );

        await carregarSolicitacoes();
        await carregarHistorico();

    } catch (erro) {

        console.error(
            "Erro ao aprovar:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao aprovar solicitação."
        );

    }

}


/* ==========================================================
   RECUSAR SOLICITAÇÃO
========================================================== */

async function recusarSolicitacao(id) {

    const confirmar = confirm(
        "Tem certeza que deseja recusar este usuário?"
    );

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(
            `/solicitacoes/${id}/recusar`,
            {
                method: "POST"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Não foi possível recusar o usuário."
            );

        }

        alert(
            dados.mensagem ||
            "Solicitação recusada."
        );

        await carregarSolicitacoes();
        await carregarHistorico();

    } catch (erro) {

        console.error(
            "Erro ao recusar:",
            erro
        );

        alert(
            erro.message ||
            "Erro ao recusar solicitação."
        );

    }

}


/* ==========================================================
   CARREGAR HISTÓRICO
========================================================== */

async function carregarHistorico() {

    const lista = document.getElementById(
        "historico-solicitacoes"
    );

    try {

        const resposta = await fetch(
            "/solicitacoes/historico"
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro ao carregar histórico."
            );

        }

        const historico = dados.historico || [];


        /* ==================================================
           NENHUM HISTÓRICO
        ================================================== */

        if (historico.length === 0) {

            lista.innerHTML = `

                <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                    <p class="text-sm text-slate-500">
                        Ainda não existem solicitações analisadas.
                    </p>

                </div>

            `;

            return;
        }


        /* ==================================================
           MONTAR HISTÓRICO
        ================================================== */

        lista.innerHTML = historico.map(usuario => {

            const nomeCompleto =
                `${usuario.nome || ""} ${usuario.sobrenome || ""}`.trim();

            const cargo =
                usuario.cargo_nome ||
                "Cargo não informado";

            const email =
                usuario.email ||
                "E-mail não informado";

            const aprovado =
                usuario.status_usuario === "ativo";

            const statusTexto =
                aprovado
                    ? "Aprovado"
                    : "Recusado";

            const classeStatus =
                aprovado
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700";

            const data =
                formatarData(usuario.atualizado_em);


            return `

                <div class="rounded-xl border border-slate-200 bg-white p-5">

                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <!-- INFORMAÇÕES DO USUÁRIO -->

                        <div>

                            <h3 class="text-lg font-bold text-slate-800">
                                ${escaparHTML(nomeCompleto)}
                            </h3>

                            <p class="mt-2 text-sm text-slate-600">

                                <span class="font-semibold">
                                    E-mail:
                                </span>

                                ${escaparHTML(email)}

                            </p>

                            <p class="mt-1 text-sm text-slate-500">

                                <span class="font-semibold">
                                    Cargo:
                                </span>

                                ${escaparHTML(cargo)}

                            </p>

                        </div>


                        <!-- STATUS -->

                        <div class="flex flex-col items-start gap-2 md:items-end">

                            <span
                                class="rounded-full px-3 py-1.5 text-xs font-semibold ${classeStatus}">

                                ${statusTexto}

                            </span>

                            <span class="text-sm text-slate-500">

                                ${data}

                            </span>

                        </div>

                    </div>

                </div>

            `;

        }).join("");


    } catch (erro) {

        console.error(
            "Erro ao carregar histórico:",
            erro
        );

        lista.innerHTML = `

            <div class="rounded-xl border border-red-200 bg-red-50 p-5">

                <p class="text-sm font-medium text-red-700">
                    Não foi possível carregar o histórico.
                </p>

            </div>

        `;

    }

}


/* ==========================================================
   FORMATAR DATA
========================================================== */

function formatarData(data) {

    if (!data) {
        return "Data não informada";
    }

    const dataObj = new Date(data);

    if (isNaN(dataObj.getTime())) {
        return "Data inválida";
    }

    return dataObj.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* ==========================================================
   ESCAPAR HTML
========================================================== */

function escaparHTML(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}