# BioPen E. coli: Sistema de Predicción de Resistencia a la Penicilina

Plataforma bioinformática y de aprendizaje automático diseñada para hospitales, laboratorios, clínicas e investigadores. Permite el análisis de secuencias genómicas de *Escherichia coli* para diagnosticar en tiempo real la susceptibilidad o resistencia a antibióticos beta-lactámicos (Penicilina) mediante un enfoque de costo computacional reducido.

---

## 📂 Estructura Completa del Proyecto

El proyecto está organizado en módulos desacoplados para garantizar la escalabilidad y claridad de código:

```text
bioinfo-app/
├── run.py                    # Script de arranque rápido (autoinstala dependencias)
├── Dataset_Features_Ecoli.csv # Datos procesados originales (utilizados para el entrenamiento)
├── Dataset_Crudo_Ecoli.csv    # Secuencias completas descargadas de NCBI
├── backend/
│   ├── app.py                # Servidor Flask principal y API REST de reportes
│   ├── features.py           # Extractor de características (A, T, C, G, GC y k-mers)
│   ├── model_manager.py      # Entrenamiento automático, métricas y predicción ML
│   └── data/
│       └── history.json      # Base de datos local ligera del historial
│   └── models/
│       ├── logistic_regression.pkl # Modelo serializado de Regresión Logística
│       ├── random_forest.pkl       # Modelo serializado de Random Forest
│       └── metrics.json            # Métricas guardadas de evaluación (Test set)
├── frontend/
│   ├── index.html            # Interfaz estructurada (Dashboard SPA)
│   ├── css/
│   │   └── styles.css        # Estilos premium (Dark Mode y Glassmorphism)
│   └── js/
│       └── main.js           # Controlador de interacción y gráficos (Chart.js)
```

---

## 🛠️ Instrucciones de Instalación

El sistema está diseñado para funcionar de manera autónoma con mínimas dependencias.

### Requisitos Previos
* **Python 3.8 o superior** instalado en el sistema.
* Acceso a internet para la primera ejecución (se descargarán las librerías necesarias).

### Instalación Automática
El script `run.py` se encarga de verificar, instalar las dependencias faltantes automáticamente a través de `pip` y levantar el servidor. 

Si deseas instalar las dependencias manualmente, ejecuta:
```bash
pip install Flask biopython scikit-learn pandas numpy reportlab
```

---

## 🚀 Instrucciones de Ejecución

1. Abre tu terminal o PowerShell.
2. Dirígete a la carpeta del proyecto:
   ```bash
   cd "d:\INGENIERIA DE SOFTWARE\BIOINFORMATICA\TF - GRUPO 3"
   ```
3. Ejecuta el script principal:
   ```bash
   python run.py
   ```
4. El script:
   * Instalará las dependencias si faltan.
   * Entrenará los modelos de aprendizaje automático a partir del CSV si es la primera vez que se ejecuta.
   * Abrirá automáticamente tu navegador web predeterminado en `http://127.0.0.1:5000/`.
   * Para detener el servidor, pulsa `Ctrl + C` en la terminal.

---

## 🖼️ Vistas Previas y Diseños de Pantallas (Mockups)

El diseño adopta un estilo clínico tecnológico en **Modo Oscuro** con efectos de desenfoque y transparencias (*Glassmorphism*).

### 1. Vista del Dashboard Principal (Inicio)
```text
+---------------------------------------------------------------------------------+
|  DNA  BioPen E. coli                      Lab Central Bioinfo  |  Lunes 21 Jun  |
+---------------------------------------------------------------------------------+
|  [#] Dashboard         /=====================================================\  |
|  [x] Analizar Muestra  | ¡BIENVENIDO A BIOPEN E. COLI!                       |  |
|  [ ] Comparar Modelos  | Herramienta clínica avanzada basada en ML...        |  |
|  [ ] Historial         \=====================================================/  |
|                        +------------------+  +------------------+  +----------+ |
|                        | Cepas DB: 54     |  | Mejor Model: RF  |  | GC: 49.6%| |
|                        +------------------+  +------------------+  +----------+ |
|                        +------------------------+  +--------------------------+ |
|                        | [Gráfico de Donas]     |  | [Gráfico Barras Horiz]   | |
|                        | Distribución de clases |  | Importancia de 3-mers    | |
|                        +------------------------+  +--------------------------+ |
+---------------------------------------------------------------------------------+
```

### 2. Panel de Análisis de Muestras e Ingreso de Secuencias
Permite pegar directamente la secuencia o arrastrar un archivo `.fasta` o `.txt`.
```text
+---------------------------------------------------------------------------------+
|  [x] Analizar Muestra   > Pegar Secuencia   [ Cargar Archivo FASTA ]            |
|                        +------------------------------------------------------+ |
|                        | >Muestra_01                                          | |
|                        | ATGAGTATTCAACATTTCCGTGTCGCCCTTATTCCCTTTTTTGCGG...    | |
|                        |                                                      | |
|                        +------------------------------------------------------+ |
|                        |                                 [Limpiar] [ANAlIZAR] | |
|                        +------------------------------------------------------+ |
+---------------------------------------------------------------------------------+
```

### 3. Visualización Instantánea de Resultados Diagnósticos
Una vez analizada, se muestra una estimación gráfica de la probabilidad de resistencia.
```text
+---------------------------------------------------------------------------------+
|  [x] Analizar Muestra   [✓] REPORTES DE DIAGNÓSTICO             [ RESISTENTE ]  |
|                        +----------------------------+  +----------------------+ |
|                        | Muestra: ID_Paciente_12    |  |       /=======\      | |
|                        | bp: 5,089,543 pb           |  |      /  94.2%  \     | |
|                        | GC: 49.13%                 |  |      \ Prob.  /     | |
|                        | Fecha: 2026-06-21 12:45    |  |       \=======/      | |
|                        +----------------------------+  +----------------------+ |
|                        | Random Forest (Principal):    RESISTENTE  (94.2%)      | |
|                        | Regresión Logística (Sec.):   RESISTENTE  (88.6%)      | |
|                        +------------------------------------------------------+ |
|                        | Exportar reporte como:    [ PDF ]  [ EXCEL ]  [ CSV ]  | |
+---------------------------------------------------------------------------------+
```

### 4. Sección de Comparación de Modelos
Presenta las métricas de prueba y las matrices de confusión para justificar las decisiones clínicas.
```text
+---------------------------------------------------------------------------------+
|  [ ] Comparar Modelos  +------------------------------------------------------+ |
|                        | Modelo Sugerido: Random Forest (Accuracy: 100%)      | |
|                        | Razón: Estructura robusta para segregar el gen       | |
|                        | blaTEM sin sobreajuste del clasificador.             | |
|                        +------------------------------------------------------+ |
|                        +------------------------+  +--------------------------+ |
|                        | [Gráfico Barras]       |  |  Matrices de Confusión   | |
|                        | Comparación de métricas|  |  [RF 2x2] vs [LR 2x2]    | |
|                        +------------------------+  +--------------------------+ |
+---------------------------------------------------------------------------------+
```

---

## 🔬 Explicación de Componentes e Integración de Código

### A. Extracción de Características (`features.py`)
Encapsula la lógica matemática del cuaderno. Al subir una secuencia o archivo:
1. Valida que las secuencias de ADN contengan caracteres de nucleótidos válidos (`A, T, C, G, N`).
2. **Soporte FASTA y CSV:** El procesador admite tanto formato FASTA (con extracción automática de cabeceras) como archivos CSV (detectando automáticamente la columna de ADN por nombres comunes o por análisis heurístico de caracteres).
3. Calcula frecuencias relativas de nucleótidos, contenido GC (%) y el perfil de 3-mers (tamaño `k=3`).

### B. Persistencia y Carga de Modelos (`model_manager.py`)
Utiliza la librería integrada de Python `pickle` para el guardado de los modelos y serialización.
* Si se ejecuta por primera vez, lee los 54 registros de `Dataset_Features_Ecoli.csv` (que contienen las características ya pre-calculadas), entrena una `Regresión Logística` y un `Random Forest` exactamente con los mismos parámetros del cuaderno (semilla 42, división 80/20).
* Evalúa las métricas de prueba y calcula la importancia de variables.
* Exporta los modelos a `.pkl` y las métricas a un archivo estructurado `metrics.json`. Esto permite que el servidor web responda en menos de 10 milisegundos a nuevas consultas.

### C. Servidor Web REST (`app.py`)
Levanta un servidor API Flask. Provee rutas para hacer inferencias en tiempo real, listar las métricas comparativas del modelo, consultar el historial del laboratorio (guardado de forma estructurada en `data/history.json`) y construir reportes en PDF, Excel y CSV.
* **Predicción en Lote (CSV):** Si se carga un archivo CSV en la sección de análisis, el servidor detecta su estructura, procesa fila por fila las muestras, guarda las inferencias en el historial y devuelve un conjunto consolidado de resultados para su visualización interactiva.

### D. Reportes Clínicos Dinámicos
* **PDF:** Utiliza la librería profesional `reportlab` para armar un PDF clínico formateado con tablas de datos de la secuencia analizada, resultados, probabilidades y la firma/metadatos del análisis.
* **Excel / CSV:** Genera archivos listos para abrir en hojas de cálculo con delimitadores `;` y codificación UTF-8 con BOM (para compatibilidad en español).

---

## 🧬 Actualizaciones en el Código de Prueba Original (`TF - GRUPO3.ipynb`)
El cuaderno original también fue actualizado para coherencia y rendimiento:
* **Formato FASTA:** Cambió la consulta de Entrez para descargar los datos genómicos del NCBI en formato **FASTA** (`rettype="fasta"`) en lugar de GenBank (`rettype="gb"`). Esto acelera la descarga (pues los archivos FASTA no contienen miles de líneas de anotaciones de genes adicionales que no se usan) y hace que el parsing con `SeqIO.parse` sea mucho más veloz e idéntico al procesador del panel web.
* **CSV:** Reemplazó todas las exportaciones del conjunto de datos a formatos `.csv` en lugar de `.xlsx` (Excel), eliminando la advertencia de truncamiento de caracteres y la dependencia de la librería `openpyxl`.
