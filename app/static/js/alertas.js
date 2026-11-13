document.addEventListener("DOMContentLoaded", async () => {
    const lista = document.getElementById("lista-alertas");
    if (!lista) return; 

    const mapaIcones = {
        red: { icon: "alert-triangle", bg: "bg-red-100", text: "text-red-500", etiqueta: "bg-red-50 text-red-600" },
        orange: { icon: "alert-circle", bg: "bg-orange-100", text: "text-orange-500", etiqueta: "bg-orange-50 text-orange-600" },
        blue: { icon: "info", bg: "bg-blue-100", text: "text-blue-500", etiqueta: "bg-blue-50 text-blue-600" }
    };

    async function carregarAlertas() {
        try {
            const resp = await fetch("/api/alertas");
            const alertas = await resp.json();

            if (alertas.length === 0) {
                lista.innerHTML = `<li class="text-center py-6 text-gray-400">Nenhum aviso recente.</li>`;
                return;
            }

            lista.innerHTML = alertas.map(a => {
                const cor = a.cor || "blue";
                const config = mapaIcones[cor];
                
                const isLido = a.lido;
                const classeLido = isLido ? "opacity-60" : "hover:bg-slate-50 cursor-pointer";
                const tituloLido = isLido ? "Lido" : "Clique para marcar como lido";

                return `
                    <li class="alerta-linha p-4 rounded-xl border border-gray-100 flex items-start gap-4 transition ${classeLido}"
                        onclick="window.marcarComoLido(${a.id})" title="${tituloLido}">
                        
                        <span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg} ${config.text}">
                            <i data-lucide="${config.icon}" class="w-5 h-5"></i>
                        </span>
                        
                        <div class="min-w-0 flex-1">
                            <h3 class="text-sm font-semibold text-slate-800">${a.titulo}</h3>
                            <p class="text-xs text-slate-500 mt-1">${a.descricao || ""}</p>
                        </div>
                        
                        <span class="text-[11px] font-bold px-2 py-1 rounded-md shrink-0 ${config.etiqueta}">
                            ${a.nivel}
                        </span>
                    </li>
                `;
            }).join("");

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error("Erro ao carregar alertas:", err);
            lista.innerHTML = `<li class="text-center py-6 text-red-500">Falha ao carregar alertas.</li>`;
        }
    }

    // Função global para o clique no alerta
    window.marcarComoLido = async (id) => {
        try {
            const resp = await fetch(`/api/alertas/${id}/ler`, { method: "POST" });
            if (!resp.ok) {
                const err = await resp.json();
                alert("Erro ao salvar: " + (err.erro || "Erro desconhecido"));
                return;
            }
            // Se deu certo, recarrega a lista para atualizar a opacidade
            await carregarAlertas();
        } catch (e) {
            console.error("Erro ao marcar como lido", e);
            alert("Erro de rede ao marcar como lido.");
        }
    };

    carregarAlertas();
});