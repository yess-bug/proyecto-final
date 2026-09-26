// ===========================================
// POKEDEX SPA - TORRE DE BATALLA (CON HABILIDADES PASIVAS Y CONTADOR FUNCIONAL)
// ===========================================

const URL = "https://pokeapi.co/api/v2/pokemon";

let offset = 0;
const limite = 20;

let equipoPokemon = JSON.parse(localStorage.getItem("pokedex_team")) || [];

// Elementos del DOM
const pokemonContainer = document.getElementById("pokemonContainer");
const detailContainer = document.getElementById("detailContainer");
const teamContainer = document.getElementById("teamContainer");
const teamCounter = document.getElementById("teamCounter");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const pokemonCounter = document.getElementById("pokemonCounter"); // Contador corregido

function mostrarLoading() {
    loading.classList.remove("hidden");
}

function ocultarLoading() {
    loading.classList.add("hidden");
}

function mostrarError(texto = "Pokémon no encontrado.") {
    errorMessage.textContent = texto;
    errorMessage.classList.remove("hidden");
    setTimeout(() => {
        errorMessage.classList.add("hidden");
    }, 2500);
}

// ==============================
// OBTENER LISTA Y CONTADOR FUNCIONAL
// ==============================
async function cargarPokemon() {
    mostrarLoading();
    pokemonContainer.innerHTML = "";

    try {
        const respuesta = await fetch(`${URL}?offset=${offset}&limit=${limite}`);
        const datos = await respuesta.json();

        // Actualizamos el contador general de forma precisa con el total disponible en la API o el bloque actual
        pokemonCounter.textContent = `Mostrando ${offset + 1} - ${Math.min(offset + limite, datos.count)} de ${datos.count} Pokémon`;

        for (const pokemon of datos.results) {
            const respuestaPokemon = await fetch(pokemon.url);
            const info = await respuestaPokemon.json();
            crearCard(info);
        }
    } catch (error) {
        mostrarError("Error cargando la Pokédex");
    }

    ocultarLoading();
}

// ==============================
// TARJETAS
// ==============================
function crearCard(pokemon) {
    const card = document.createElement("article");
    card.classList.add("card");

    card.innerHTML = `
        <img src="${pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
        <div class="card-body">
            <p class="id">#${pokemon.id}</p>
            <h3>${capitalizar(pokemon.name)}</h3>
            <span class="tipo ${pokemon.types[0].type.name}">
                ${capitalizar(pokemon.types[0].type.name)}
            </span>
            <div class="card-actions">
                <button class="btn-info">Ver</button>
                <button class="btn-add">Añadir</button>
            </div>
        </div>
    `;

    card.querySelector(".btn-info").addEventListener("click", () => {
        mostrarDetalle(pokemon);
    });

    card.querySelector(".btn-add").addEventListener("click", (e) => {
        e.stopPropagation();
        agregarAlEquipo(pokemon);
    });

    pokemonContainer.appendChild(card);
}

// ==============================
// GESTIÓN DEL EQUIPO Y LOCALSTORAGE
// ==============================
function agregarAlEquipo(pokemon) {
    if (equipoPokemon.length >= 6) {
        mostrarError("¡Tu equipo ya tiene 6 Pokémon!");
        return;
    }

    if (equipoPokemon.some(p => p.id === pokemon.id)) {
        mostrarError("Este Pokémon ya está en tu equipo.");
        return;
    }

    equipoPokemon.push(pokemon);
    guardarEquipoEnStorage();
    actualizarVistaEquipo();
}

function eliminarDelEquipo(index) {
    equipoPokemon.splice(index, 1);
    guardarEquipoEnStorage();
    actualizarVistaEquipo();
}

function guardarEquipoEnStorage() {
    localStorage.setItem("pokedex_team", JSON.stringify(equipoPokemon));
}

function actualizarVistaEquipo() {
    teamContainer.innerHTML = "";
    teamCounter.textContent = `${equipoPokemon.length}/6`;

    for (let i = 0; i < 6; i++) {
        const slot = document.createElement("div");
        slot.classList.add("team-slot");

        if (i < equipoPokemon.length) {
            const poke = equipoPokemon[i];
            slot.classList.add("filled");
            slot.innerHTML = `
                <img src="${poke.sprites.front_default}" alt="${poke.name}">
                <div class="team-info">
                    <h4>${capitalizar(poke.name)}</h4>
                    <span class="id">#${poke.id}</span>
                </div>
                <button onclick="window.removerSlot(${i})">X</button>
            `;
            slot.style.cursor = "pointer";
            slot.addEventListener("click", (e) => {
                if(e.target.tagName !== "BUTTON") mostrarDetalle(poke);
            });
        } else {
            slot.innerHTML = `<span style="color: #aaa; font-size: 0.85rem; width:100%; text-align:center;">Vacío #${i + 1}</span>`;
        }

        teamContainer.appendChild(slot);
    }

    verificarBotonCombate();
}

window.removerSlot = (index) => {
    eliminarDelEquipo(index);
};

// ==============================
// DETALLE Y MEGA EVOLUCIÓN
// ==============================
async function mostrarDetalle(pokemon) {
    let estadisticas = "";
    pokemon.stats.forEach(stat => {
        estadisticas += `
        <div class="stat">
            <div class="stat-header">
                <span>${capitalizar(stat.stat.name)}</span>
                <span>${stat.base_stat}</span>
            </div>
            <div class="progress">
                <span style="width:${Math.min(stat.base_stat, 100)}%"></span>
            </div>
        </div>
        `;
    });

    let tipos = "";
    pokemon.types.forEach(tipo => {
        tipos += `<span class="tipo ${tipo.type.name}">${capitalizar(tipo.type.name)}</span>`;
    });

    let habilidades = "";
    pokemon.abilities.forEach(habilidad => {
        habilidades += `<li>${capitalizar(habilidad.ability.name)}</li>`;
    });

    detailContainer.innerHTML = `
        <img src="${pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h2>${capitalizar(pokemon.name)}</h2>
        <h3>#${pokemon.id}</h3>
        <div>${tipos}</div>
        <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
        <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
        <h3>Habilidades</h3>
        <ul>${habilidades}</ul>
        <div class="stats">${estadisticas}</div>
        <div id="megaContainer"></div>
    `;

    verificarMegaEvolucionExterna(pokemon);
}

async function verificarMegaEvolucionExterna(pokemon) {
    const megaContainer = document.getElementById("megaContainer");
    if (!megaContainer) return;

    try {
        const respuestaEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`);
        if (!respuestaEspecie.ok) return;
        const especie = await respuestaEspecie.json();

        const variedadMega = especie.varieties.find(v => v.pokemon.name.includes("-mega"));

        if (variedadMega) {
            const btnMega = document.createElement("button");
            btnMega.classList.add("btn-mega");
            btnMega.textContent = "⚡ Mega Evolucionar";
            
            btnMega.addEventListener("click", async () => {
                mostrarLoading();
                const respMega = await fetch(variedadMega.pokemon.url);
                const infoMega = await respMega.json();
                ocultarLoading();
                mostrarDetalle(infoMega);
            });

            megaContainer.appendChild(btnMega);
        }
    } catch (error) {
        console.error("No se pudo verificar la mega evolución", error);
    }
}

// ==============================
// TORRE DE BATALLA (100 NIVELES + HABILIDADES PASIVAS)
// ==============================
function verificarBotonCombate() {
    let btnTorre = document.getElementById("btnTorreBatalla");
    if (equipoPokemon.length > 0) {
        if (!btnTorre) {
            btnTorre = document.createElement("button");
            btnTorre.id = "btnTorreBatalla";
            btnTorre.style.cssText = "width:100%; margin-top:15px; padding:12px; background:linear-gradient(135deg, #7b3fa0, #ffcc00); color:#333; font-weight:bold; border:none; border-radius:8px; cursor:pointer; box-shadow:0 4px 10px rgba(123,63,160,0.3);";
            btnTorre.textContent = "⚔️ Ir a Torre de Batalla";
            btnTorre.addEventListener("click", iniciarTorreBatalla);
            teamContainer.appendChild(btnTorre);
        }
    } else {
        if (btnTorre) btnTorre.remove();
    }
}

const equipoJefeFinalConfig = ["palkia", "dialga", "giratina-altered", "arceus"]; 

async function iniciarTorreBatalla() {
    mostrarLoading();
    let nivelActual = 1;
    let equipoRival = [];
    
    try {
        if (nivelActual === 100 && equipoJefeFinalConfig.length > 0) {
            for (let idOrName of equipoJefeFinalConfig) {
                const res = await fetch(`${URL}/${idOrName}`);
                const data = res.ok ? await res.json() : null;
                if (data) equipoRival.push(data);
            }
        } else {
            for (let i = 0; i < equipoPokemon.length; i++) {
                const idAleatorio = Math.floor(Math.random() * 905) + 1;
                const res = await fetch(`${URL}/${idAleatorio}`);
                const data = res.ok ? await res.json() : null;
                if (data) equipoRival.push(data);
            }
        }
    } catch (e) {
        mostrarError("Error preparando el combate");
        ocultarLoading();
        return;
    }

    ocultarLoading();
    prepararCombateTurnos(equipoRival, nivelActual);
}

async function obtenerMovimientosPokemon(pokemonData) {
    let movimientosSeleccionados = [];
    const poolMoves = pokemonData.moves || [];
    let movimientosMezclados = [...poolMoves].sort(() => 0.5 - Math.random());
    let cantidadAMostrar = Math.min(4, movimientosMezclados.length);

    for (let i = 0; i < cantidadAMostrar; i++) {
        let moveInfo = movimientosMezclados[i].move;
        try {
            let resMove = await fetch(moveInfo.url);
            let dataMove = resMove.ok ? await resMove.json() : null;
            let power = dataMove && dataMove.power ? dataMove.power : 40;
            movimientosSeleccionados.push({
                name: capitalizar(moveInfo.name.replace('-', ' ')),
                power: power
            });
        } catch (e) {
            movimientosSeleccionados.push({ name: capitalizar(moveInfo.name), power: 40 });
        }
    }

    if (movimientosSeleccionados.length === 0) {
        movimientosSeleccionados.push({ name: "Placaje", power: 40 });
    }

    return movimientosSeleccionados;
}

// Obtener Habilidad Pasiva Principal y procesar su efecto en combate
function obtenerHabilidadPasiva(pokemonData) {
    if (!pokemonData.abilities || pokemonData.abilities.length === 0) {
        return { name: "Ninguna", desc: "Sin efecto pasivo." };
    }
    // Tomamos la primera habilidad principal
    let habObj = pokemonData.abilities.find(a => !a.is_hidden) || pokemonData.abilities[0];
    let nombreHab = habObj.ability.name;

    let pasivaConfig = { name: capitalizar(nombreHab.replace('-', ' ')), efecto: "normal" };

    // Asignación de mecánicas según habilidades famosas de Pokémon
    if (["intimidate"].includes(nombreHab)) {
        pasivaConfig.efecto = "intimidate"; // Baja el ataque rival al entrar
        pasivaConfig.desc = "Baja el ataque del rival al entrar en combate.";
    } else if (["blaze", "torrent", "overgrow", "swarm"].includes(nombreHab)) {
        pasivaConfig.efecto = "potencia_baja_vida"; // Aumenta daño si la vida es menor al 50%
        pasivaConfig.desc = "Aumenta la potencia de los ataques cuando la salud es baja.";
    } else if (["levitate", "immuniy", "water-absorb", "flash-fire"].includes(nombreHab)) {
        pasivaConfig.efecto = "defensa_extra"; // Reduce daño recibido permanentemente
        pasivaConfig.desc = "Otorga resistencia pasiva contra ataques rivales.";
    } else if (["speed-boost", "unburden"].includes(nombreHab)) {
        pasivaConfig.efecto = "velocidad_acumulativa"; // Otorga ventaja de esquivar o doble golpe ocasional
        pasivaConfig.desc = "Aumenta la energía y agilidad del Pokémon en cada turno.";
    } else if (["regenerator", "natural-cure", "shed-skin"].includes(nombreHab)) {
        pasivaConfig.efecto = "curacion_turno"; // Cura un poco de vida por turno
        pasivaConfig.desc = "Recupera salud automáticamente al finalizar cada turno.";
    } else {
        pasivaConfig.desc = "Habilidad natural de apoyo en combate.";
    }

    return pasivaConfig;
}

async function obtenerMegaEvolucionData(pokemonId) {
    try {
        const respuestaEspecie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
        if (!respuestaEspecie.ok) return null;
        const especie = await respuestaEspecie.json();

        const variedadMega = especie.varieties.find(v => v.pokemon.name.includes("-mega"));
        if (variedadMega) {
            const respMega = await fetch(variedadMega.pokemon.url);
            if (respMega.ok) {
                return await respMega.json();
            }
        }
    } catch (e) {
        console.error("Error buscando mega evolución", e);
    }
    return null;
}

async function prepararCombateTurnos(equipoRival, nivelActual) {
    mostrarLoading();
    const sectionList = document.querySelector(".pokemon-list");

    let factorDificultad = 1 + ((nivelActual - 1) * 0.08); 

    let stateUserTeam = [];
    for (let p of equipoPokemon) {
        let moves = await obtenerMovimientosPokemon(p);
        let pasiva = obtenerHabilidadPasiva(p);
        let megaData = await obtenerMegaEvolucionData(p.id);
        stateUserTeam.push({
            ...p,
            hpMax: Math.round(p.stats[0].base_stat * 3),
            hpCurrent: Math.round(p.stats[0].base_stat * 3),
            atk: p.stats[1].base_stat,
            def: p.stats[2].base_stat,
            moves: moves,
            pasiva: pasiva,
            megaData: megaData,
            megaEvolucionado: false
        });
    }

    let stateRivalTeam = [];
    for (let p of equipoRival) {
        let moves = await obtenerMovimientosPokemon(p);
        let pasiva = obtenerHabilidadPasiva(p);
        let megaData = (nivelActual >= 30 || nivelActual === 100) ? await obtenerMegaEvolucionData(p.id) : null;
        stateRivalTeam.push({
            ...p,
            hpMax: Math.round(p.stats[0].base_stat * 3 * factorDificultad),
            hpCurrent: Math.round(p.stats[0].base_stat * 3 * factorDificultad),
            atk: Math.round(p.stats[1].base_stat * factorDificultad),
            def: Math.round(p.stats[2].base_stat * factorDificultad),
            moves: moves,
            pasiva: pasiva,
            megaData: megaData,
            megaEvolucionado: false
        });
    }

    ocultarLoading();

    let userIndex = 0;
    let rivalIndex = 0;

    sectionList.innerHTML = `
        <div style="background:white; padding:25px; border-radius:15px; box-shadow:0 8px 18px rgba(92,45,145,.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h2 style="color:#5c2d91; margin:0;">⚡ TORRE DE BATALLA ⚡</h2>
                <span id="nivelTorreBadge" style="background:#ffcc00; color:#333; padding:5px 12px; border-radius:20px; font-weight:bold; font-size:0.9rem;">Nivel ${nivelActual} / 100</span>
            </div>
            <p style="color:#666; margin-bottom:15px; font-size:0.9rem;">¡Las habilidades pasivas están activas en combate!</p>

            <div style="display:flex; justify-content:space-around; align-items:center; background:#faf8ff; padding:20px; border-radius:12px; border:1px solid #e0d4f5; margin-bottom:20px;">
                <!-- USUARIO -->
                <div id="userArenaBox" style="text-align:center; width: 40%;">
                    <span style="background:#7b3fa0; color:white; padding:2px 8px; border-radius:4px; font-size:0.75rem;">TÚ (${userIndex + 1}/${stateUserTeam.length})</span>
                    <h3 id="userName" style="text-transform:capitalize; color:#5c2d91; margin:5px 0;">${stateUserTeam[userIndex].name}</h3>
                    <span id="userAbility" style="font-size:0.75rem; color:#888; display:block; margin-bottom:5px;">Pasiva: ${stateUserTeam[userIndex].pasiva.name}</span>
                    <img id="userSprite" src="${stateUserTeam[userIndex].sprites.back_default || stateUserTeam[userIndex].sprites.front_default}" style="width:110px; height:110px; object-fit:contain;">
                    <div style="background:#ddd; border-radius:10px; height:12px; width:100%; overflow:hidden; margin-top:8px;">
                        <div id="userHpBar" style="background:#4caf50; height:100%; width:100%; transition: width 0.3s;"></div>
                    </div>
                    <span id="userHpText" style="font-size:0.8rem; font-weight:bold;">HP: ${stateUserTeam[userIndex].hpCurrent}/${stateUserTeam[userIndex].hpMax}</span>
                </div>

                <h1 style="color:#7b3fa0;">VS</h1>

                <!-- RIVAL -->
                <div id="rivalArenaBox" style="text-align:center; width: 40%;">
                    <span style="background:${nivelActual === 100 ? '#b22222' : '#d9534f'}; color:white; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${nivelActual === 100 ? 'JEFE FINAL 👑' : 'RIVAL'} (${rivalIndex + 1}/${stateRivalTeam.length})</span>
                    <h3 id="rivalName" style="text-transform:capitalize; color:${nivelActual === 100 ? '#b22222' : '#d9534f'}; margin:5px 0;">${stateRivalTeam[rivalIndex].name}</h3>
                    <span id="rivalAbility" style="font-size:0.75rem; color:#888; display:block; margin-bottom:5px;">Pasiva: ${stateRivalTeam[rivalIndex].pasiva.name}</span>
                    <img id="rivalSprite" src="${stateRivalTeam[rivalIndex].sprites.front_default}" style="width:110px; height:110px; object-fit:contain;">
                    <div style="background:#ddd; border-radius:10px; height:12px; width:100%; overflow:hidden; margin-top:8px;">
                        <div id="rivalHpBar" style="background:${nivelActual === 100 ? '#b22222' : '#d9534f'}; height:100%; width:100%; transition: width 0.3s;"></div>
                    </div>
                    <span id="rivalHpText" style="font-size:0.8rem; font-weight:bold;">HP: ${stateRivalTeam[rivalIndex].hpCurrent}/${stateRivalTeam[rivalIndex].hpMax}</span>
                </div>
            </div>

            <div id="battleLog" style="background:#f4f1fa; padding:15px; border-radius:8px; height:90px; overflow-y:auto; font-size:0.9rem; margin-bottom:15px; border:1px solid #d1bce3;">
                ¡Comienza el combate del Nivel ${nivelActual}! Las habilidades pasivas están activas.
            </div>

            <div id="battleControls" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:15px;">
                <!-- Controles dinámicos -->
            </div>

            <div style="text-align:center;">
                <button id="btnSalirTorre" style="background:#333; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.85rem;">Abandonar Torre</button>
            </div>
        </div>
    `;

    const log = document.getElementById("battleLog");
    const controlsContainer = document.getElementById("battleControls");
    const btnSalir = document.getElementById("btnSalirTorre");

    // Aplicar efectos pasivos iniciales al entrar al combate
    function aplicarPasivaEntrada(pokemonAtacante, pokemonDefensor) {
        if (pokemonAtacante.pasiva.efecto === "intimidate") {
            pokemonDefensor.atk = Math.max(10, Math.round(pokemonDefensor.atk * 0.85));
            log.innerHTML += `🛡️ ¡La habilidad <b>${pokemonAtacante.pasiva.name}</b> de ${pokemonAtacante.name} intimidó al rival bajando su ataque!<br>`;
        }
    }

    aplicarPasivaEntrada(stateUserTeam[userIndex], stateRivalTeam[rivalIndex]);
    aplicarPasivaEntrada(stateRivalTeam[rivalIndex], stateUserTeam[userIndex]);

    function actualizarInterfazBatalla() {
        const activeUser = stateUserTeam[userIndex];
        const activeRival = stateRivalTeam[rivalIndex];

        document.getElementById("userName").textContent = activeUser.name;
        document.getElementById("userAbility").textContent = `Pasiva: ${activeUser.pasiva.name}`;
        document.getElementById("userSprite").src = activeUser.sprites.back_default || activeUser.sprites.front_default;
        let userHpPercent = Math.max(0, (activeUser.hpCurrent / activeUser.hpMax) * 100);
        document.getElementById("userHpBar").style.width = `${userHpPercent}%`;
        document.getElementById("userHpText").textContent = `HP: ${Math.round(activeUser.hpCurrent)}/${activeUser.hpMax}`;
        document.querySelector("#userArenaBox span").textContent = `TÚ (${userIndex + 1}/${stateUserTeam.length})`;

        document.getElementById("rivalName").textContent = activeRival.name;
        document.getElementById("rivalAbility").textContent = `Pasiva: ${activeRival.pasiva.name}`;
        document.getElementById("rivalSprite").src = activeRival.sprites.front_default;
        let rivalHpPercent = Math.max(0, (activeRival.hpCurrent / activeRival.hpMax) * 100);
        document.getElementById("rivalHpBar").style.width = `${rivalHpPercent}%`;
        document.getElementById("rivalHpText").textContent = `HP: ${Math.round(activeRival.hpCurrent)}/${activeRival.hpMax}`;
    }

    function renderizarControlesJugador() {
        controlsContainer.innerHTML = "";
        let activeUser = stateUserTeam[userIndex];

        activeUser.moves.forEach((move, idx) => {
            const btnMove = document.createElement("button");
            btnMove.style.cssText = "background:#7b3fa0; color:white; border:none; padding:10px; font-weight:bold; border-radius:8px; cursor:pointer; text-align:left; font-size:0.9rem;";
            btnMove.innerHTML = `⚔️ ${move.name} <br><span style="font-size:0.75rem; color:#ffcc00;">Potencia: ${move.power}</span>`;
            btnMove.addEventListener("click", () => ejecutarTurnoCombate(idx));
            controlsContainer.appendChild(btnMove);
        });

        if (activeUser.megaData && !activeUser.megaEvolucionado) {
            const btnMega = document.createElement("button");
            btnMega.style.cssText = "background:linear-gradient(135deg, #ff8c00, #ff4500); color:white; border:none; padding:10px; font-weight:bold; border-radius:8px; cursor:pointer; text-align:center; font-size:0.9rem; grid-column:span 2;";
            btnMega.innerHTML = `⚡ ¡MEGA EVOLUCIONAR! ⚡`;
            btnMega.addEventListener("click", () => ejecutarMegaEvolucionJugador());
            controlsContainer.appendChild(btnMega);
        }
    }

    function ejecutarMegaEvolucionJugador() {
        let activeUser = stateUserTeam[userIndex];
        activeUser.megaEvolucionado = true;
        
        activeUser.name = activeUser.megaData.name;
        activeUser.sprites.front_default = activeUser.megaData.sprites.front_default;
        activeUser.sprites.back_default = activeUser.megaData.sprites.back_default;
        activeUser.atk = Math.round(activeUser.atk * 1.4);
        activeUser.def = Math.round(activeUser.def * 1.2);

        log.innerHTML = `✨ ¡Tu <b>${activeUser.name}</b> ha Mega Evolucionado!<br>`;
        actualizarInterfazBatalla();
        renderizarControlesJugador();
    }

    async function ejecutarTurnoCombate(moveIndex) {
        let activeUser = stateUserTeam[userIndex];
        let activeRival = stateRivalTeam[rivalIndex];

        if (activeRival.megaData && !activeRival.megaEvolucionado) {
            activeRival.megaEvolucionado = true;
            activeRival.name = activeRival.megaData.name;
            activeRival.sprites.front_default = activeRival.megaData.sprites.front_default;
            activeRival.atk = Math.round(activeRival.atk * 1.4);
            activeRival.def = Math.round(activeRival.def * 1.2);
            log.innerHTML = `⚡ ¡El rival hizo Mega Evolucionar a <b>${activeRival.name}</b>!<br>`;
        }

        let moveUser = activeUser.moves[moveIndex];

        // Cálculo de daño usuario con bonificadores pasivos
        let multiplicadorUser = 1.0;
        if (activeUser.pasiva.efecto === "potencia_baja_vida" && (activeUser.hpCurrent / activeUser.hpMax) <= 0.5) {
            multiplicadorUser = 1.35;
        }

        let reduccionRival = activeRival.def / 2;
        if (activeRival.pasiva.efecto === "defensa_extra") reduccionRival *= 1.2;

        let dañoUser = Math.max(8, Math.floor((((activeUser.atk * moveUser.power / 30) - reduccionRival) * multiplicadorUser) * (Math.random() * 0.2 + 0.9)));
        activeRival.hpCurrent -= dañoUser;
        log.innerHTML += `Tu <b>${activeUser.name}</b> usó <b>${moveUser.name}</b> e hizo <b>${dañoUser}</b> de daño.<br>`;

        // Pasiva de curación de turno
        if (activeUser.pasiva.efecto === "curacion_turno" && activeUser.hpCurrent < activeUser.hpMax) {
            let curacion = Math.round(activeUser.hpMax * 0.05);
            activeUser.hpCurrent = Math.min(activeUser.hpMax, activeUser.hpCurrent + curacion);
            log.innerHTML += `✨ <b>${activeUser.name}</b> recuperó ${curacion} HP gracias a su habilidad pasiva.<br>`;
        }

        if (activeRival.hpCurrent <= 0) {
            activeRival.hpCurrent = 0;
            actualizarInterfazBatalla();
            rivalIndex++;
            if (rivalIndex < stateRivalTeam.length) {
                log.innerHTML += `¡Pokémon rival debilitado! Entra: <b>${stateRivalTeam[rivalIndex].name}</b>.`;
                actualizarInterfazBatalla();
                renderizarControlesJugador();
                return;
            } else {
                if (nivelActual < 100) {
                    nivelActual++;
                    log.innerHTML += `🏆 <b>¡Nivel ${nivelActual - 1} superado! Subiendo al Nivel ${nivelActual}...</b>`;
                    controlsContainer.innerHTML = "";
                    
                    setTimeout(async () => {
                        let nuevoRivalTeam = [];
                        if (nivelActual === 100 && equipoJefeFinalConfig.length > 0) {
                            for (let idOrName of equipoJefeFinalConfig) {
                                const res = await fetch(`${URL}/${idOrName}`);
                                const data = res.ok ? await res.json() : null;
                                if (data) nuevoRivalTeam.push(data);
                            }
                        } else {
                            for (let i = 0; i < equipoPokemon.length; i++) {
                                const idA = Math.floor(Math.random() * 905) + 1;
                                const r = await fetch(`${URL}/${idA}`);
                                const d = r.ok ? await r.json() : null;
                                if (d) nuevoRivalTeam.push(d);
                            }
                        }
                        prepararCombateTurnos(nuevoRivalTeam, nivelActual);
                    }, 1500);
                    return;
                } else {
                    log.innerHTML += `👑 <b>¡INCREÍBLE! ¡Has superado los 100 Niveles! ¡Eres el Campeón Supremo!</b>`;
                    controlsContainer.innerHTML = `<button onclick="location.reload()" style="background:#4caf50; color:white; border:none; padding:12px; font-weight:bold; border-radius:8px; cursor:pointer; grid-column:span 2;">Finalizar</button>`;
                    return;
                }
            }
        }

        // TURNO DEL RIVAL
        let moveRival = activeRival.moves[Math.floor(Math.random() * activeRival.moves.length)];
        let reduccionUser = activeUser.def / 2;
        if (activeUser.pasiva.efecto === "defensa_extra") reduccionUser *= 1.2;

        let dañoRival = Math.max(8, Math.floor(((activeRival.atk * moveRival.power / 30) - reduccionUser) * (Math.random() * 0.2 + 0.9)));
        activeUser.hpCurrent -= dañoRival;
        log.innerHTML += `El rival <b>${activeRival.name}</b> usó <b>${moveRival.name}</b> e hizo <b>${dañoRival}</b> de daño.<br>`;

        if (activeRival.pasiva.efecto === "curacion_turno" && activeRival.hpCurrent < activeRival.hpMax) {
            let curacionRival = Math.round(activeRival.hpMax * 0.05);
            activeRival.hpCurrent = Math.min(activeRival.hpMax, activeRival.hpCurrent + curacionRival);
        }

        log.scrollTop = log.scrollHeight;

        if (activeUser.hpCurrent <= 0) {
            activeUser.hpCurrent = 0;
            actualizarInterfazBatalla();
            userIndex++;
            if (userIndex < stateUserTeam.length) {
                log.innerHTML += `¡Tu Pokémon cayó! Entra: <b>${stateUserTeam[userIndex].name}</b>.`;
                actualizarInterfazBatalla();
                renderizarControlesJugador();
                return;
            } else {
                log.innerHTML += `💀 <b>¡Tu equipo entero fue derrotado en el Nivel ${nivelActual}! Fin del desafío.</b>`;
                controlsContainer.innerHTML = `<button onclick="location.reload()" style="background:#d9534f; color:white; border:none; padding:12px; font-weight:bold; border-radius:8px; cursor:pointer; grid-column:span 2;">Volver a Intentarlo</button>`;
                return;
            }
        }

        actualizarInterfazBatalla();
    }

    renderizarControlesJugador();

    btnSalir.addEventListener("click", () => {
        location.reload();
    });
}

// ==============================
// BUSCAR (CON CONTADOR ACTUALIZADO)
// ==============================
async function buscarPokemon() {
    const nombre = searchInput.value.trim().toLowerCase();
    if (nombre === "") {
        cargarPokemon();
        return;
    }

    mostrarLoading();
    try {
        const respuesta = await fetch(`${URL}/${nombre}`);
        if (!respuesta.ok) throw new Error();

        const pokemon = await respuesta.json();
        pokemonContainer.innerHTML = "";
        crearCard(pokemon);
        mostrarDetalle(pokemon);
        pokemonCounter.textContent = "Resultado de búsqueda: 1 Pokémon encontrado";
    } catch {
        mostrarError();
    }
    ocultarLoading();
}

// ==============================
// EVENTOS Y PAGINACIÓN
// ==============================
searchButton.addEventListener("click", buscarPokemon);
searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") buscarPokemon();
});

nextBtn.addEventListener("click", () => {
    offset += limite;
    cargarPokemon();
});

previousBtn.addEventListener("click", () => {
    if (offset === 0) return;
    offset -= limite;
    cargarPokemon();
});

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Inicio
cargarPokemon();
actualizarVistaEquipo();