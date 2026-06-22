import sys
import os

# Añadir el path raíz del proyecto
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from backend.model_manager import ModelManager

print("Forzando reentrenamiento de modelos...")
mm = ModelManager()
mm.entrenar_y_guardar()
print("Modelos y métricas regenerados con éxito.")
