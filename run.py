import os
import sys
import subprocess
import webbrowser
import time

def check_and_install_dependencies():
    required_packages = {
        "flask": "Flask",
        "Bio": "biopython",
        "sklearn": "scikit-learn",
        "pandas": "pandas",
        "numpy": "numpy",
        "reportlab": "reportlab"
    }
    
    missing_packages = []
    for module_name, pip_name in required_packages.items():
        try:
            __import__(module_name)
        except ImportError:
            missing_packages.append(pip_name)
            
    if missing_packages:
        print("Detectando dependencias faltantes...")
        print(f"Instalando: {', '.join(missing_packages)}")
        try:
            # Intentar usar el ejecutable de Python activo
            python_exe = sys.executable
            subprocess.check_call([python_exe, "-m", "pip", "install"] + missing_packages)
            print("Instalación de dependencias completada con éxito.\n")
        except Exception as e:
            print(f"Error al instalar automáticamente las dependencias: {e}")
            print("Por favor, ejecuta manualmente: pip install " + " ".join(missing_packages))
            sys.exit(1)

def main():
    print("=" * 70)
    print("           BIOPEN E. COLI - DETECCIÓN DE RESISTENCIA A PENICILINA")
    print("                 Iniciando Servidor Web Bioinformático")
    print("=" * 70)
    
    check_and_install_dependencies()
    
    # Ruta del archivo app.py
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    app_path = os.path.join(backend_dir, "app.py")
    
    # Lanzar navegador tras una breve espera para dar tiempo al servidor a arrancar
    url = "http://127.0.0.1:5000/"
    print(f"\nAbriendo panel en tu navegador predeterminado: {url}")
    
    # Levantamos el servidor en un subproceso
    python_exe = sys.executable
    
    # Iniciar el navegador web después de 1.5 segundos
    def launch_browser():
        time.sleep(1.5)
        webbrowser.open(url)
        
    import threading
    threading.Thread(target=launch_browser, daemon=True).start()
    
    try:
        subprocess.run([python_exe, app_path], check=True)
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
    except Exception as e:
        print(f"\nError al ejecutar la aplicación: {e}")

if __name__ == "__main__":
    main()
