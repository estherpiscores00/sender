
// 1. Configuración del Mapa y Capa CyclOSM
const map = L.map('map').setView([40.4167, -3.70325], 6);

const cyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors, CyclOSM'
}).addTo(map);

// Variables globales
let capaRutaActiva = null;
let todasLasRutasGeoJSON = null;
// Variable para guardar la capa de puntos y poder filtrarlos
let capaPuntos;

// 2. Cargar primero las geometrías de las rutas
fetch('rutas_unificadas_con_id.geojson')
    .then(res => res.json())
    .then(data => {
        todasLasRutasGeoJSON = data;
        // Solo cuando las rutas están listas, cargamos los puntos
        cargarPuntosInteractivos();
    })
    .catch(err => console.error("Error cargando rutas:", err));


    

// 3. Cargar los puntos (donde el usuario hace clic)
function cargarPuntosInteractivos() {
    fetch('puntos_completos_interactivos.geojson')
        .then(res => res.json())
        .then(data => {
            // Guardamos los datos para el buscador
            const puntosData = data.features;
            capaPuntos =L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {

                // calcular color dificultad
                    const colorDificultad = obtenerColor(feature.properties.distancia, feature.properties.desnivel);

                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: colorDificultad,
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: (feature, layer) => {
                   
                   
                    layer.on('click', (e) => {
                        L.DomEvent.stopPropagation(e); // Evita clics fantasma en el mapa

                        // ✨ NUEVA LÍNEA: Imprime todos los datos del punto en la consola
                        console.log("Datos del punto clicado:", feature.properties);

                        mostrarDetalleRuta(feature.properties);
                    });
                    
                    // Cambiar cursor al pasar por encima
                    layer.on('mouseover', function() { this.setStyle({ fillColor: '#2c3e50' }); });
                    layer.on('mouseout', function() { this.setStyle({ fillColor: '#ff0800' }); });
                }

                
            }).addTo(map);
            // ACTIVAR EL BUSCADOR
            configurarBuscador(puntosData);

        })
        .catch(err => console.error("Error cargando puntos:", err));
}

//formatear fecha
function formatearFecha(fechaOriginal) {
    if (!fechaOriginal || fechaOriginal === "-") return "-";

    // Si viene en formato AAAA-MM-DDT00:00:00, tomamos solo los primeros 10 caracteres
    // Esto evita que la "T" y las horas interfieran
    const soloFecha = fechaOriginal.split('T')[0]; 
    const partes = soloFecha.split('-'); // Divide por el guion

    // Si tenemos las 3 partes (año, mes, día), las reordenamos
    if (partes.length === 3) {
        const [year, month, day] = partes;
        return `${day}/${month}/${year}`;
    }

    return fechaOriginal; // Si falla algo, devuelve el original
}

function obtenerColor(dist, desnivel) {
    const esfuerzo = parseFloat(dist) + (parseFloat(desnivel) / 100);
    if (esfuerzo < 6) return '#27ae60'; // Fácil
    if (esfuerzo < 12) return '#f1c40f'; // Moderada
    if (esfuerzo < 18) return '#e67e22'; // Difícil
    return '#ff1900';                   // Muy difícil
}

// NUEVO: Evento para cerrar al hacer clic en el mapa vacío
map.on('click', function() {
    cerrarPanel();
});

function mostrarDetalleRuta(props) {
    if (capaRutaActiva) { map.removeLayer(capaRutaActiva); }

    const idBuscado = String(props.id_ruta);
    const rutaGeom = todasLasRutasGeoJSON.features.find(f => String(f.properties.id_ruta) === idBuscado);

    // 1. IMPORTANTE: Reiniciar el scroll al principio
    sidebar.scrollTop = 0;

    if (rutaGeom) {
        capaRutaActiva = L.geoJSON(rutaGeom, {
            style: { color: '#ff0000', weight: 4, opacity: 0.8 }
        }).addTo(map);

        // 1. Mostrar panel y calcular espacio
        document.getElementById('sidebar').classList.add('sidebar-active');
        const altoPanel = window.innerHeight * 0.4; 

        // 2. Ajuste de cámara (subir el mapa)
        map.fitBounds(capaRutaActiva.getBounds(), {
            paddingTopLeft: [20, 20],
            paddingBottomRight: [20, altoPanel + 20],
            animate: true
        });

        // 3. Relleno de información (Letra pequeña y campos nuevos)
        const sidebarInfo = document.getElementById('sidebar-info');

        // 1. Preparamos el HTML de la foto (solo si existe)
        let fotoHTML = '';
        if (props.foto) {
            fotoHTML = `<img src="${props.foto}" class="sidebar-foto" onerror="this.style.display='none'">`;
        }

        sidebarInfo.innerHTML = `

            <div class="btn-cerrar-circulo" onclick="cerrarPanel()" title="Cerrar">×</div>

            <div class="ruta-titulo">${props.name || 'Sin nombre'}</div>
            
            <table class="meta-table">
                <tr>
                    <td>🆔 ${props.id_ruta}</td>
                    <td>📅 ${formatearFecha(props.fecha)}</td>
                </tr>
                <tr>
                    <td>🍂 ${props.temporada || '-'}</td>
                    <td>⏱️ ${props.tiempo || '-'}</td>
                </tr>
                <tr>
                    <td>📏 ${props.distancia} km</td>
                    <td>⛰️ ${props.desnivel} m</td>
                </tr>
                <tr>
                    <td colspan="2" style="white-space: normal; padding-top: 5px;">
                        👥 <span>${props.participantes}</span>
                    </td>
                </tr>
            </table>

            <div style="font-size: 1rem; line-height: 1.3; color: #666; margin: 10px 0; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                ${props.comentario || ''}
            </div>

            <a href="${props.wikiloc}" target="_blank" rel="noopener" class="btn-wikiloc">WIKILOC ↗</a>

            ${fotoHTML}
            
            <button class="btn-cerrar" style="font-size: 1rem; padding: 6px; margin-top: 10px; border-radius: 5px; color: #666; background: #f0f0f0; border: 1px solid #ddd; width: 100%; cursor: pointer;" onclick="cerrarPanel()">
                Cerrar
            </button>
        `;

        sidebar.classList.add('sidebar-active');
    }
}

function cerrarPanel() {
    document.getElementById('sidebar').classList.remove('sidebar-active');
    if (capaRutaActiva) {
        map.removeLayer(capaRutaActiva);
        capaRutaActiva = null;
    }
// 3. NUEVO: Borramos el texto del buscador y ocultamos resultados
    const buscador = document.getElementById('map-search');
    const resultados = document.getElementById('search-results');
    
    if (buscador) {
        buscador.value = ''; // Borra el texto escrito
    }
    if (resultados) {
        resultados.style.display = 'none'; // Esconde la lista de sugerencias
    }
    
    map.invalidateSize();
}



function configurarBuscador(datos) {
    const input = document.getElementById('map-search');
    const resultsContainer = document.getElementById('search-results');

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsContainer.innerHTML = ''; // Limpiar resultados anteriores

        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        // Filtrar rutas por nombre
        const filtrados = datos.filter(f => 
            f.properties.name.toLowerCase().includes(query)
        ).slice(0, 10); // Mostrar máximo 10 resultados

        if (filtrados.length > 0) {
            resultsContainer.style.display = 'block';
            filtrados.forEach(ruta => {
                const div = document.createElement('div');
                div.style.padding = '10px';
                div.style.borderBottom = '1px solid #eee';
                div.style.cursor = 'pointer';
                div.style.fontSize = '0.85rem';
                div.innerHTML = `
                <div style="font-weight: bold; color: #2c3e50;">${ruta.properties.name}</div>
                <div style="font-size: 0.75rem; color: #7f8c8d;">${formatearFecha(ruta.properties.fecha)}</div>
            `;
                div.onmouseenter = () => div.style.backgroundColor = '#f8f9fa';
                div.onmouseleave = () => div.style.backgroundColor = 'white';
                div.onclick = () => {
                    // Al hacer clic: centrar mapa, mostrar ruta y cerrar buscador
                    const coords = ruta.geometry.coordinates;
                    map.setView([coords[1], coords[0]], 14);
                    mostrarDetalleRuta(ruta.properties);
                    input.value = ruta.properties.name;
                    resultsContainer.style.display = 'none';
                };
                resultsContainer.appendChild(div);
            });
        } else {
            resultsContainer.style.display = 'none';
        }
    });

    // Cerrar resultados si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!document.getElementById('search-container').contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}