
// 1. Configuración del Mapa y Capa CyclOSM
const map = L.map('map').setView([40.4167, -3.70325], 6);

const cyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors, CyclOSM'
}).addTo(map);

// Variables globales
let capaRutaActiva = null;
let todasLasRutasGeoJSON = null;

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
            L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff0800",
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: (feature, layer) => {
                    layer.on('click', (e) => {
                        L.DomEvent.stopPropagation(e); // Evita clics fantasma en el mapa
                        mostrarDetalleRuta(feature.properties);
                    });
                    
                    // Cambiar cursor al pasar por encima
                    layer.on('mouseover', function() { this.setStyle({ fillColor: '#2c3e50' }); });
                    layer.on('mouseout', function() { this.setStyle({ fillColor: '#ff0800' }); });
                }
            }).addTo(map);
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

// NUEVO: Evento para cerrar al hacer clic en el mapa vacío
map.on('click', function() {
    cerrarPanel();
});

function mostrarDetalleRuta(props) {
    if (capaRutaActiva) { map.removeLayer(capaRutaActiva); }

    const idBuscado = String(props.id_ruta);
    const rutaGeom = todasLasRutasGeoJSON.features.find(f => String(f.properties.id_ruta) === idBuscado);

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
        sidebarInfo.innerHTML = `
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
                        👥 <span style="font-size: 0.75rem;">${props.participantes}</span>
                    </td>
                </tr>
            </table>

            <div style="font-size: 0.8rem; line-height: 1.3; color: #666; margin: 10px 0; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                ${props.comentario || ''}
            </div>

            <a href="${props.wikiloc}" target="_blank" rel="noopener" class="btn-wikiloc">WIKILOC ↗</a>
            
            <button class="btn-cerrar" style="font-size: 0.7rem; color: #999; background: none; border: 1px solid #ddd;" onclick="cerrarPanel()">
                Cerrar
            </button>
        `;
    }
}

function cerrarPanel() {
    document.getElementById('sidebar').classList.remove('sidebar-active');
    if (capaRutaActiva) {
        map.removeLayer(capaRutaActiva);
        capaRutaActiva = null;
    }
}
