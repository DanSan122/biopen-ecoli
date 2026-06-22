import sys
import os

# Añadir el path del backend
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from model_manager import ModelManager

print("Forzando reentrenamiento de modelos...")
mm = ModelManager()
mm.entrenar_y_guardar()
print("Modelos y métricas regenerados con éxito.")
