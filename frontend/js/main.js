/* ==========================================================================
   BIOPEN E. COLI PREDICTOR - JS APPLICATION CONTROLLER (MAIN.JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------------------------
    // 1. ESTADO DE LA APLICACIÓN
    // ----------------------------------------------------------------------
    let currentResultData = null;
    let metricsData = null;
    let historyRecords = [];
    
    // Instancias de Gráficos (para poder destruirlos/actualizarlos)
    let classDistChart = null;
    let topFeaturesChart = null;
    let metricsComparisonChart = null;

    // ----------------------------------------------------------------------
    // 2. REFERENCIAS DEL DOM
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");
    const pageTitle = document.getElementById("current-page-title");
    const liveTimeEl = document.getElementById("live-time");
    
    // Controles de entrada
    const btnPaste = document.getElementById("btn-paste");
    const btnFile = document.getElementById("btn-file");
    const pasteArea = document.getElementById("paste-area");
    const fileArea = document.getElementById("file-area");
    const dnaInput = document.getElementById("dna-input");
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    const fileNameDisplay = document.getElementById("file-name");
    
    // Botones de acción y Loader
    const btnClear = document.getElementById("btn-clear");
    const btnAnalyze = document.getElementById("btn-analyze");
    const predictionLoader = document.getElementById("prediction-loader");
    const validationError = document.getElementById("validation-error");
    const errorMessageEl = document.getElementById("error-message");
    
    // Contenedores de resultados
    const resultadoContainer = document.getElementById("resultado-container");
    const resBadge = document.getElementById("res-badge");
    const resId = document.getElementById("res-id");
    const resLength = document.getElementById("res-length");
    const resGc = document.getElementById("res-gc");
    const resDate = document.getElementById("res-date");
    const gaugeFill = document.getElementById("gauge-fill-id");
    const gaugeText = document.getElementById("gauge-text-id");
    
    const resValRf = document.getElementById("res-val-rf");
    const resProbRf = document.getElementById("res-prob-rf");
    const resValLr = document.getElementById("res-val-lr");
    const resProbLr = document.getElementById("res-prob-lr");
    
    // Botones de Exportar
    const exportPdfBtn = document.getElementById("export-pdf");
    const exportExcelBtn = document.getElementById("export-excel");
    const exportCsvBtn = document.getElementById("export-csv");
    
    // Historial y comparación
    const historySearch = document.getElementById("history-search");
    const historyTableBody = document.querySelector("#history-table-el tbody");
    const justificationText = document.getElementById("justification-text");

    // ----------------------------------------------------------------------
    // 3. NAVEGACIÓN Y RELOJ
    // ----------------------------------------------------------------------
    // Navegación SPA
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = item.getAttribute("data-target");
            
            navItems.forEach(i => i.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(targetId).classList.add("active");
            
            // Actualizar título superior
            const pageName = item.textContent.trim();
            pageTitle.textContent = pageName;
            
            // Si entra a historial o comparación de modelos, recargar datos
            if (targetId === "historial-section") {
                cargarHistorial();
            }
        });
    });

    // Reloj Clínico en tiempo real
    const actualizarReloj = () => {
        const now = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        liveTimeEl.innerHTML = `<i class="fa-solid fa-clock"></i> ${now.toLocaleDateString('es-ES', opciones)}`;
    };
    setInterval(actualizarReloj, 1000);
    actualizarReloj();

    // ----------------------------------------------------------------------
    // 4. LOGICA DE CARGA DE SECUENCIAS
    // ----------------------------------------------------------------------
    // Alternancia de Inputs (Paste vs File)
    btnPaste.addEventListener("click", () => {
        btnPaste.classList.add("active");
        btnFile.classList.remove("active");
        pasteArea.classList.add("active");
        fileArea.classList.remove("active");
    });

    btnFile.addEventListener("click", () => {
        btnFile.classList.add("active");
        btnPaste.classList.remove("active");
        fileArea.classList.add("active");
        pasteArea.classList.remove("active");
    });

    // Drag and Drop
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelected();
        }
    });

    fileInput.addEventListener("change", handleFileSelected);

    function handleFileSelected() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        } else {
            fileNameDisplay.textContent = "";
        }
    }

    // Botón Limpiar
    btnClear.addEventListener("click", () => {
        dnaInput.value = "";
        fileInput.value = "";
        fileNameDisplay.textContent = "";
        validationError.style.display = "none";
        resultadoContainer.style.display = "none";
        document.getElementById("single-result-view").style.display = "grid";
        document.getElementById("batch-result-view").style.display = "none";
        document.getElementById("models-comparison-view").style.display = "block";
        document.getElementById("export-bar-view").style.display = "flex";
        currentResultData = null;
    });

    // ----------------------------------------------------------------------
    // 5. LLAMADOS API BACKEND
    // ----------------------------------------------------------------------
    // Carga de Métricas y Modelos Iniciales
    async function inicializarMetricasYModelos() {
        try {
            const res = await fetch("/api/metrics");
            const data = await res.json();
            if (data.success) {
                metricsData = data.data;
                justificationText.textContent = metricsData.justification;
                
                // Actualizar tarjetas de estadísticas del Dashboard
                const totalCepa = (metricsData.train_size || 0) + (metricsData.test_size || 0);
                document.getElementById("stat-train-size").textContent = totalCepa;
                
                const bestModelKey = metricsData.best_model || "random_forest";
                const bestModelName = bestModelKey === "random_forest" ? "RF" : "RL";
                const bestModelAcc = metricsData[bestModelKey] ? metricsData[bestModelKey].accuracy : 0;
                document.getElementById("stat-best-model").textContent = `${bestModelName} (${(bestModelAcc * 100).toFixed(0)}%)`;
                
                const avgGc = metricsData.average_gc || 0;
                document.getElementById("stat-avg-gc").textContent = `${avgGc.toFixed(1)} %`;
                
                // Renderizar gráficos de comparación de modelos
                renderizarGraficosComparativos();
                
                // Renderizar gráficos del Dashboard (Estáticos con datos del pangenoma)
                renderizarDashboardCharts();
                
                // Cargar matrices de confusión en la UI
                llenarMatricesConfusion();
            }
        } catch (err) {
            console.error("Error al cargar métricas:", err);
        }
    }

    // Predicción
    btnAnalyze.addEventListener("click", async () => {
        validationError.style.display = "none";
        let secuenciaADN = "";
        
        if (btnPaste.classList.contains("active")) {
            secuenciaADN = dnaInput.value.trim();
        } else {
            if (fileInput.files.length === 0) {
                mostrarError("Por favor, selecciona un archivo FASTA (.fasta) o CSV (.csv).");
                return;
            }
            const file = fileInput.files[0];
            secuenciaADN = await leerArchivoTexto(file);
        }
        
        if (!secuenciaADN) {
            mostrarError("Por favor, ingresa una secuencia de ADN o carga un archivo.");
            return;
        }

        // Mostrar Loader
        predictionLoader.style.display = "flex";
        resultadoContainer.style.display = "none";
        
        try {
            const res = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secuencia: secuenciaADN })
            });
            
            const data = await res.json();
            
            if (data.success) {
                if (data.batch) {
                    mostrarResultadosBatch(data.data, data.errors);
                } else {
                    currentResultData = data.data;
                    mostrarResultados(currentResultData);
                }
                // Actualizar historial y contador de análisis en el Dashboard
                cargarHistorial();
            } else {
                mostrarError(data.error || "Ocurrió un error al procesar la secuencia.");
            }
        } catch (err) {
            mostrarError("No se pudo conectar con el servidor bioinformático.");
            console.error(err);
        } finally {
            predictionLoader.style.display = "none";
        }
    });

    function leerArchivoTexto(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
    }

    function mostrarError(msg) {
        errorMessageEl.textContent = msg;
        validationError.style.display = "flex";
        predictionLoader.style.display = "none";
        resultadoContainer.style.display = "none";
        
        // Scroll hasta el error
        validationError.scrollIntoView({ behavior: "smooth" });
    }

    // Mostrar resultados diagnósticos en la UI
    function mostrarResultados(record) {
        resultadoContainer.style.display = "block";
        document.getElementById("single-result-view").style.display = "grid";
        document.getElementById("batch-result-view").style.display = "none";
        document.getElementById("models-comparison-view").style.display = "block";
        document.getElementById("export-bar-view").style.display = "flex";
        
        // Cargar datos
        resId.textContent = record.id;
        resLength.textContent = record.longitud ? `${record.longitud.toLocaleString('es-ES')} pb` : "Precalculada / No disponible";
        resGc.textContent = `${record.gc_content}%`;
        resDate.textContent = record.fecha;
        
        // Establecer Badge de resistencia
        if (record.resultado === "Resistente") {
            resBadge.textContent = "Resistente";
            resBadge.className = "badge resistant";
        } else {
            resBadge.textContent = "No Resistente";
            resBadge.className = "badge sensitive";
        }
        
        // Configurar medidor circular (Gauge)
        const prob = record.probabilidad;
        gaugeText.textContent = `${prob.toFixed(1)}%`;
        
        // Animación de conic-gradient según la probabilidad
        let colorGauge = "hsl(175, 80%, 40%)"; // turquesa
        if (record.resultado === "Resistente") {
            colorGauge = "hsl(350, 80%, 55%)"; // rojo
        } else {
            colorGauge = "hsl(142, 70%, 45%)"; // verde
        }
        gaugeFill.style.background = `conic-gradient(${colorGauge} ${prob}%, rgba(255, 255, 255, 0.05) ${prob}%)`;

        // Detalle comparativo
        const rfDet = record.detalles.random_forest;
        const lrDet = record.detalles.logistic_regression;
        
        resValRf.textContent = rfDet.resultado;
        resValRf.style.color = rfDet.resultado === "Resistente" ? "var(--danger)" : "var(--success)";
        resProbRf.textContent = `${rfDet.probabilidad}%`;
        
        resValLr.textContent = lrDet.resultado;
        resValLr.style.color = lrDet.resultado === "Resistente" ? "var(--danger)" : "var(--success)";
        resProbLr.textContent = `${lrDet.probabilidad}%`;
        
        // Desplazarse suavemente hasta los resultados
        resultadoContainer.scrollIntoView({ behavior: "smooth" });
    }

    // Mostrar resultados por lotes en la UI
    function mostrarResultadosBatch(records, errors) {
        resultadoContainer.style.display = "block";
        
        // Ocultar vista individual, comparación y exportación
        document.getElementById("single-result-view").style.display = "none";
        document.getElementById("models-comparison-view").style.display = "none";
        document.getElementById("export-bar-view").style.display = "none";
        
        // Mostrar vista de lote
        const batchView = document.getElementById("batch-result-view");
        batchView.style.display = "block";
        
        // Contar resistentes y sensibles
        const total = records.length;
        const resistentes = records.filter(r => r.resultado === "Resistente").length;
        const sensibles = total - resistentes;
        
        const summaryText = document.getElementById("batch-summary-text");
        summaryText.innerHTML = `Se procesaron con éxito <strong>${total}</strong> muestras del archivo CSV.<br>` +
                                `<span style="color: var(--danger); font-weight: 500;">${resistentes} resistentes</span> | ` +
                                `<span style="color: var(--success); font-weight: 500;">${sensibles} no resistentes</span>.`;
                                
        // Actualizar Badge principal
        if (resistentes > 0) {
            resBadge.textContent = `LOTE: ${resistentes} R / ${total}`;
            resBadge.className = "badge resistant";
        } else {
            resBadge.textContent = "LOTE: TODO SENSIBLE";
            resBadge.className = "badge sensitive";
        }
        
        // Llenar tabla de lote
        const tbody = document.querySelector("#batch-results-table tbody");
        tbody.innerHTML = "";
        
        records.forEach((rec, idx) => {
            const tr = document.createElement("tr");
            const badgeClass = rec.resultado === "Resistente" ? "badge-table resistant" : "badge-table sensitive";
            
            tr.innerHTML = `
                <td style="padding: 10px; font-weight: 500; color: var(--text-primary);">${rec.id}</td>
                <td style="padding: 10px;">${rec.longitud ? rec.longitud.toLocaleString('es-ES') : 'Precalculada'}</td>
                <td style="padding: 10px;">${rec.gc_content}%</td>
                <td style="padding: 10px;"><span class="${badgeClass}">${rec.resultado}</span></td>
                <td style="padding: 10px;">${rec.probabilidad}%</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-table-action view-detail-btn" title="Ver detalles" style="border: 1px solid var(--card-border); background: rgba(255,255,255,0.02); font-size: 11.5px;"><i class="fa-solid fa-eye"></i> Detalles</button>
                    <button class="btn-table-action pdf-detail-btn" title="Exportar PDF"><i class="fa-solid fa-file-pdf"></i></button>
                </td>
            `;
            
            tr.querySelector(".view-detail-btn").addEventListener("click", () => {
                currentResultData = rec;
                mostrarResultados(rec);
            });
            
            tr.querySelector(".pdf-detail-btn").addEventListener("click", () => {
                descargarReporte(rec, "pdf");
            });
            
            tbody.appendChild(tr);
        });
        
        // Desplazarse suavemente hasta los resultados
        resultadoContainer.scrollIntoView({ behavior: "smooth" });
    }

    // Cargar Historial
    async function cargarHistorial() {
        try {
            const res = await fetch("/api/history");
            const data = await res.json();
            if (data.success) {
                historyRecords = data.data;
                renderizarTablaHistorial(historyRecords);
                
                // Actualizar el contador de análisis realizados en el Dashboard
                const totalAnalyzedEl = document.getElementById("stat-total-analyzed");
                if (totalAnalyzedEl) {
                    totalAnalyzedEl.textContent = historyRecords.length;
                }
            }
        } catch (err) {
            console.error("Error al cargar historial:", err);
        }
    }

    function renderizarTablaHistorial(records) {
        historyTableBody.innerHTML = "";
        
        if (records.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No se han realizado análisis aún.</td>
                </tr>
            `;
            return;
        }
        
        records.forEach(rec => {
            const tr = document.createElement("tr");
            const badgeClass = rec.resultado === "Resistente" ? "badge-table resistant" : "badge-table sensitive";
            
            tr.innerHTML = `
                <td>${rec.fecha}</td>
                <td><strong>${rec.id}</strong></td>
                <td>${rec.longitud ? rec.longitud.toLocaleString('es-ES') : 'Precalculada'}</td>
                <td>${rec.gc_content}%</td>
                <td><span class="${badgeClass}">${rec.resultado}</span></td>
                <td>${rec.probabilidad}%</td>
                <td>${rec.modelo}</td>
                <td>
                    <button class="btn-table-action view-btn" title="Cargar reporte"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-table-action pdf-down-btn" title="Exportar PDF"><i class="fa-solid fa-file-pdf"></i></button>
                </td>
            `;
            
            // Eventos de acciones individuales de la tabla
            tr.querySelector(".view-btn").addEventListener("click", () => {
                currentResultData = rec;
                // Mover a la pestaña analizar y mostrar
                document.querySelector('[data-target="analizar-section"]').click();
                mostrarResultados(rec);
            });
            
            tr.querySelector(".pdf-down-btn").addEventListener("click", () => {
                descargarReporte(rec, "pdf");
            });
            
            historyTableBody.appendChild(tr);
        });
    }

    // Buscador en Historial
    historySearch.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderizarTablaHistorial(historyRecords);
            return;
        }
        
        const filtrados = historyRecords.filter(rec => 
            rec.id.toLowerCase().includes(query) || 
            rec.resultado.toLowerCase().includes(query) ||
            rec.fecha.includes(query)
        );
        renderizarTablaHistorial(filtrados);
    });

    // ----------------------------------------------------------------------
    // 6. EXPORTACIÓN DE REPORTES
    // ----------------------------------------------------------------------
    async function descargarReporte(registro, formato) {
        if (!registro) return;
        
        try {
            const response = await fetch("/api/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ format: formato, record: registro })
            });
            
            if (!response.ok) {
                const errJson = await response.json();
                alert(`Error al exportar: ${errJson.error}`);
                return;
            }
            
            // Recibir como archivo binario (blob)
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            
            // Nombre del archivo
            const extension = formato === "excel" ? "xlsx" : formato;
            a.download = `Reporte_Diagnostico_${registro.id}.${extension}`;
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error("Error al realizar exportación:", err);
            alert("No se pudo completar la exportación del reporte.");
        }
    }

    exportPdfBtn.addEventListener("click", () => descargarReporte(currentResultData, "pdf"));
    exportExcelBtn.addEventListener("click", () => descargarReporte(currentResultData, "excel"));
    exportCsvBtn.addEventListener("click", () => descargarReporte(currentResultData, "csv"));

    // ----------------------------------------------------------------------
    // 7. GRÁFICOS INTERACTIVOS (CHART.JS)
    // ----------------------------------------------------------------------
    function renderizarDashboardCharts() {
        if (!metricsData) return;
        
        // Destruir gráficos previos si existen para evitar encimados
        if (classDistChart) classDistChart.destroy();
        if (topFeaturesChart) topFeaturesChart.destroy();
        
        // 1. Distribución de Clases (Pie Chart)
        // Muestra la proporción de resistentes vs sensibles reales obtenidos del backend
        const distCtx = document.getElementById("classDistChart").getContext("2d");
        const resCount = metricsData.class_distribution ? (metricsData.class_distribution.resistant || 0) : 31;
        const senCount = metricsData.class_distribution ? (metricsData.class_distribution.sensitive || 0) : 23;
        
        classDistChart = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Resistentes (Con Gen blaTEM)', 'Sensibles (Secuencias Generales)'],
                datasets: [{
                    data: [resCount, senCount],
                    backgroundColor: ['rgba(220, 38, 38, 0.75)', 'rgba(21, 128, 61, 0.75)'],
                    borderColor: ['hsl(350, 80%, 55%)', 'hsl(142, 70%, 45%)'],
                    borderWidth: 1.5,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e2e8f0', font: { family: 'Outfit', size: 12 } }
                    }
                }
            }
        });
        
        // 2. Importancia de Variables del Random Forest (Horizontal Bar Chart)
        const rfFeatures = metricsData.random_forest.feature_importances;
        const labels = rfFeatures.map(item => item.feature);
        const importances = rfFeatures.map(item => item.importance);
        
        const featCtx = document.getElementById("topFeaturesChart").getContext("2d");
        topFeaturesChart = new Chart(featCtx, {
            type: 'bar',
            data: {
                labels: labels.slice(0, 7), // Mostrar las 7 principales
                datasets: [{
                    label: 'Puntaje Gini de Importancia',
                    data: importances.slice(0, 7),
                    backgroundColor: 'rgba(15, 118, 110, 0.75)',
                    borderColor: 'hsl(175, 80%, 40%)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#e2e8f0', font: { family: 'Outfit', weight: 'bold' } }
                    }
                }
            }
        });
    }

    function renderizarGraficosComparativos() {
        if (!metricsData) return;
        
        if (metricsComparisonChart) metricsComparisonChart.destroy();
        
        const lrMetrics = metricsData.logistic_regression;
        const rfMetrics = metricsData.random_forest;
        
        const compCtx = document.getElementById("metricsComparisonChart").getContext("2d");
        metricsComparisonChart = new Chart(compCtx, {
            type: 'bar',
            data: {
                labels: ['Accuracy', 'Precision', 'Recall (Sens.)', 'Specificity', 'F1-Score'],
                datasets: [
                    {
                        label: 'Random Forest',
                        data: [rfMetrics.accuracy, rfMetrics.precision, rfMetrics.recall, rfMetrics.specificity, rfMetrics.f1_score],
                        backgroundColor: 'rgba(15, 118, 110, 0.8)',
                        borderColor: 'hsl(175, 80%, 40%)',
                        borderWidth: 1
                    },
                    {
                        label: 'Regresión Logística',
                        data: [lrMetrics.accuracy, lrMetrics.precision, lrMetrics.recall, lrMetrics.specificity, lrMetrics.f1_score],
                        backgroundColor: 'rgba(71, 85, 105, 0.8)',
                        borderColor: 'hsl(215, 25%, 50%)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#e2e8f0', font: { family: 'Outfit' } }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#e2e8f0', font: { family: 'Outfit' } }
                    },
                    y: {
                        min: 0,
                        max: 1.1,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    function llenarMatricesConfusion() {
        if (!metricsData) return;
        
        const rfMat = metricsData.random_forest.confusion_matrix;
        const lrMat = metricsData.logistic_regression.confusion_matrix;
        
        // Random Forest (tn, fp, fn, tp)
        document.getElementById("rf-tn").textContent = rfMat[0][0];
        document.getElementById("rf-fp").textContent = rfMat[0][1];
        document.getElementById("rf-fn").textContent = rfMat[1][0];
        document.getElementById("rf-tp").textContent = rfMat[1][1];
        
        // Logistic Regression (tn, fp, fn, tp)
        document.getElementById("lr-tn").textContent = lrMat[0][0];
        document.getElementById("lr-fp").textContent = lrMat[0][1];
        document.getElementById("lr-fn").textContent = lrMat[1][0];
        document.getElementById("lr-tp").textContent = lrMat[1][1];
    }

    // Inicializar todo
    inicializarMetricasYModelos();
    cargarHistorial();
});
