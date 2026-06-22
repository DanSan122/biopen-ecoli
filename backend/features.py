import re
import csv
import io
from Bio.SeqUtils import gc_fraction
from itertools import product

def parsear_fasta(contenido_fasta):
    """
    Parsea una cadena en formato FASTA o texto plano.
    Devuelve un ID de muestra y la secuencia limpia.
    """
    lineas = contenido_fasta.strip().split('\n')
    if not lineas:
        return "muestra_desconocida", ""
    
    if lineas[0].startswith('>'):
        id_muestra = lineas[0][1:].strip().split()[0]
        secuencia = "".join(lineas[1:])
    else:
        id_muestra = "muestra_manual"
        secuencia = "".join(lineas)
        
    return id_muestra, secuencia

def parsear_csv(contenido_csv):
    """
    Parsea una cadena en formato CSV.
    Retorna una lista de tuplas (id_muestra, secuencia).
    """
    lineas = contenido_csv.strip().split('\n')
    if not lineas:
        return []
    
    header = lineas[0].lower()
    delimitador = ';' if ';' in header else ','
    
    f = io.StringIO(contenido_csv)
    reader = csv.DictReader(f, delimiter=delimitador)
    
    col_secuencia = None
    col_id = None
    
    nombres_secuencia = ["cadena_adn", "cadena", "adn", "sequence", "seq", "dna"]
    nombres_id = ["id", "nombre", "name", "identifier", "muestra", "sample"]
    
    for col in reader.fieldnames or []:
        col_lower = col.lower().strip()
        if col_lower in nombres_secuencia:
            col_secuencia = col
        if col_lower in nombres_id:
            col_id = col
            
    if not col_secuencia:
        # Búsqueda heurística de la columna de secuencia analizando las filas
        for col in reader.fieldnames or []:
            es_seq_probable = True
            for i, row in enumerate(reader):
                val = str(row.get(col, '')).strip().upper()
                if not val or not set(val).issubset(set("ATCGN")):
                    es_seq_probable = False
                    break
                if i > 2:
                    break
            f.seek(0)
            reader = csv.DictReader(f, delimiter=delimitador)
            if es_seq_probable:
                col_secuencia = col
                break
                
    if not col_secuencia:
        return []
        
    resultados = []
    for i, row in enumerate(reader):
        secuencia = str(row.get(col_secuencia, '')).strip()
        if not secuencia:
            continue
            
        id_val = ""
        if col_id:
            id_val = str(row.get(col_id, '')).strip()
        if not id_val:
            id_val = f"muestra_csv_{i+1}"
            
        resultados.append((id_val, secuencia))
        
    return resultados

def limpiar_y_validar_secuencia(secuencia):
    """
    Valida que la secuencia de ADN solo contenga caracteres válidos (A, T, C, G, N).
    Retorna (es_valido, mensaje_error, secuencia_limpia)
    """
    secuencia_limpia = re.sub(r'\s+', '', secuencia).upper()
    if not secuencia_limpia:
        return False, "La secuencia de ADN está vacía.", ""
    
    caracteres_validos = set("ATCGN")
    caracteres_secuencia = set(secuencia_limpia)
    caracteres_invalidos = caracteres_secuencia - caracteres_validos
    
    if caracteres_invalidos:
        caracteres_invalidos_ordenados = sorted(list(caracteres_invalidos))
        caracteres_invalidos_str = ", ".join(caracteres_invalidos_ordenados)
        return False, f"La secuencia contiene caracteres inválidos para ADN: {caracteres_invalidos_str}", ""
    
    return True, "", secuencia_limpia

def calcular_frecuencias(secuencia):
    """
    Calcula la frecuencia relativa de cada nucleótido (A, T, C, G) en la secuencia.
    """
    largo = len(secuencia)
    if largo == 0:
        return {"freq_A": 0.0, "freq_T": 0.0, "freq_C": 0.0, "freq_G": 0.0}
    return {
        "freq_A": secuencia.count("A") / largo,
        "freq_T": secuencia.count("T") / largo,
        "freq_C": secuencia.count("C") / largo,
        "freq_G": secuencia.count("G") / largo,
    }

def calcular_gc(secuencia):
    """
    Calcula el porcentaje de contenido GC de la secuencia.
    """
    if len(secuencia) == 0:
        return 0.0
    return gc_fraction(secuencia) * 100.0

def generar_kmers_referencia(k):
    """
    Genera todas las combinaciones posibles de longitud k usando A, T, C, G.
    """
    bases = ["A", "T", "C", "G"]
    return ["".join(p) for p in product(bases, repeat=k)]

def calcular_perfil_kmer(secuencia, k, kmers_ref):
    """
    Calcula el perfil relativo de frecuencias para los k-mers de referencia.
    """
    total_kmers = len(secuencia) - k + 1
    if total_kmers <= 0:
        return {f"k{k}_{kmer}": 0.0 for kmer in kmers_ref}
    
    conteo = {kmer: 0 for kmer in kmers_ref}
    for i in range(total_kmers):
        kmer = secuencia[i:i+k]
        if kmer in conteo:
            conteo[kmer] += 1
            
    return {f"k{k}_{kmer}": v / total_kmers for kmer, v in conteo.items()}

def extraer_todas_las_caracteristicas(secuencia):
    """
    Extrae el vector de 69 características numéricas para los modelos:
    - 4 frecuencias relativas
    - Contenido GC (%)
    - 64 k-mers (k=3)
    """
    features = {}
    features.update(calcular_frecuencias(secuencia))
    features["Contenido_GC"] = calcular_gc(secuencia)
    
    kmers_k3 = generar_kmers_referencia(3)
    features.update(calcular_perfil_kmer(secuencia, 3, kmers_k3))
    
    return features
