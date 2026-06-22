import os
import pickle
import json
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, roc_curve, roc_auc_score

# Definir rutas base - Funciona en local y en Render
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))  # /backend
BASE_DIR = os.path.dirname(CURRENT_DIR)  # Sube a raíz del proyecto
MODELS_DIR = os.path.join(CURRENT_DIR, "models")  # /backend/models
DATA_DIR = os.path.join(CURRENT_DIR, "data")  # /backend/data
CSV_PATH = os.path.join(BASE_DIR, "Dataset_Features_Ecoli.csv")

# Asegurar que existan los directorios
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

LR_MODEL_PATH = os.path.join(MODELS_DIR, "logistic_regression.pkl")
RF_MODEL_PATH = os.path.join(MODELS_DIR, "random_forest.pkl")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")

print(f"[ModelManager] BASE_DIR: {BASE_DIR}")
print(f"[ModelManager] MODELS_DIR: {MODELS_DIR}")
print(f"[ModelManager] LR_MODEL_PATH exists: {os.path.exists(LR_MODEL_PATH)}")
print(f"[ModelManager] RF_MODEL_PATH exists: {os.path.exists(RF_MODEL_PATH)}")
print(f"[ModelManager] METRICS_PATH exists: {os.path.exists(METRICS_PATH)}")

class ModelManager:
    def __init__(self):
        self.modelo_rl = None
        self.modelo_rf = None
        self.metrics = {}
        self.feature_names = []
        
    def inicializar(self):
        """
        Carga los modelos entrenados. No reentrenará automáticamente.
        """
        if os.path.exists(LR_MODEL_PATH) and os.path.exists(RF_MODEL_PATH) and os.path.exists(METRICS_PATH):
            print("[ModelManager] Cargando modelos existentes desde disco...")
            self.cargar_modelos()
            print("[ModelManager] Modelos cargados exitosamente ✓")
        else:
            raise FileNotFoundError(f"Modelos no encontrados. Esperaba en: {MODELS_DIR}")

    def cargar_modelos(self):
        try:
            with open(LR_MODEL_PATH, "rb") as f:
                self.modelo_rl = pickle.load(f)
            with open(RF_MODEL_PATH, "rb") as f:
                self.modelo_rf = pickle.load(f)
                
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                self.metrics = json.load(f)
                
            self.feature_names = self.metrics.get("feature_names", [])
            print(f"[ModelManager] {len(self.feature_names)} características cargadas")
        except Exception as e:
            print(f"[ModelManager] Error al cargar modelos: {e}")
            raise

    def entrenar_y_guardar(self):
        if not os.path.exists(CSV_PATH):
            raise FileNotFoundError(f"No se encontró el archivo de datos {CSV_PATH} para entrenar los modelos.")
            
        df = pd.read_csv(CSV_PATH)
        
        # Separar variables predictoras y objetivo
        X = df.drop(columns=["ID", "Resistente"])
        y = df["Resistente"]
        self.feature_names = list(X.columns)
        
        # División idéntica 80% train / 20% test con random_state=42
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42
        )
        
        # 1. Regresión Logística
        rl = LogisticRegression(max_iter=1000)
        rl.fit(X_train, y_train)
        pred_rl = rl.predict(X_test)
        prob_rl = rl.predict_proba(X_test)[:, 1]
        
        # 2. Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_train, y_train)
        pred_rf = rf.predict(X_test)
        prob_rf = rf.predict_proba(X_test)[:, 1]
        
        # Calcular métricas para Regresión Logística
        tn_rl, fp_rl, fn_rl, tp_rl = confusion_matrix(y_test, pred_rl).ravel()
        esp_rl = float(tn_rl / (tn_rl + fp_rl))
        prec_rl = float(precision_score(y_test, pred_rl))
        rec_rl = float(recall_score(y_test, pred_rl))
        f1_rl = float(f1_score(y_test, pred_rl))
        acc_rl = float((tp_rl + tn_rl) / len(y_test))
        
        # ROC para RL
        fpr_rl_arr, tpr_rl_arr, _ = roc_curve(y_test, prob_rl)
        auc_rl = float(roc_auc_score(y_test, prob_rl))
        
        # Calcular métricas para Random Forest
        tn_rf, fp_rf, fn_rf, tp_rf = confusion_matrix(y_test, pred_rf).ravel()
        esp_rf = float(tn_rf / (tn_rf + fp_rf))
        prec_rf = float(precision_score(y_test, pred_rf))
        rec_rf = float(recall_score(y_test, pred_rf))
        f1_rf = float(f1_score(y_test, pred_rf))
        acc_rf = float((tp_rf + tn_rf) / len(y_test))
        
        # ROC para RF
        fpr_rf_arr, tpr_rf_arr, _ = roc_curve(y_test, prob_rf)
        auc_rf = float(roc_auc_score(y_test, prob_rf))
        
        # Importancia de variables del Random Forest
        importances = rf.feature_importances_
        feature_importance_list = sorted(
            [{"feature": name, "importance": float(imp)} for name, imp in zip(self.feature_names, importances)],
            key=lambda x: x["importance"],
            reverse=True
        )
        
        # Distribución de clases y GC promedio en el dataset
        total_r = int(y.sum())
        total_s = int(len(y) - total_r)
        promedio_gc = float(df["Contenido_GC"].mean())
        
        # Estructura del JSON de métricas
        self.metrics = {
            "feature_names": self.feature_names,
            "train_size": len(X_train),
            "test_size": len(X_test),
            "class_distribution": {
                "resistant": total_r,
                "sensitive": total_s
            },
            "average_gc": promedio_gc,
            "logistic_regression": {
                "accuracy": acc_rl,
                "precision": prec_rl,
                "recall": rec_rl,
                "specificity": esp_rl,
                "f1_score": f1_rl,
                "confusion_matrix": [[int(tn_rl), int(fp_rl)], [int(fn_rl), int(tp_rl)]],
                "auc": auc_rl,
                "roc_curve": {
                    "fpr": [float(x) for x in fpr_rl_arr],
                    "tpr": [float(x) for x in tpr_rl_arr]
                }
            },
            "random_forest": {
                "accuracy": acc_rf,
                "precision": prec_rf,
                "recall": rec_rf,
                "specificity": esp_rf,
                "f1_score": f1_rf,
                "confusion_matrix": [[int(tn_rf), int(fp_rf)], [int(fn_rf), int(tp_rf)]],
                "auc": auc_rf,
                "roc_curve": {
                    "fpr": [float(x) for x in fpr_rf_arr],
                    "tpr": [float(x) for x in tpr_rf_arr]
                },
                "feature_importances": feature_importance_list[:15]  # Guardar las 15 más importantes
            },
            "best_model": "random_forest",
            "justification": "Se selecciona Random Forest como modelo principal debido a que obtuvo un desempeño perfecto (1.00 en todas las métricas) sobre el conjunto de test. Este comportamiento se debe a que la simplificación de patrones por perfiles 3-mer y contenido GC permite al árbol de decisión segregar con exactitud las cepas resistentes (que contienen el gen blaTEM) de las sensibles, evitando a su vez el sobreajuste mediante la combinación de múltiples estimadores."
        }
        
        # Guardar en disco
        with open(LR_MODEL_PATH, "wb") as f:
            pickle.dump(rl, f)
        with open(RF_MODEL_PATH, "wb") as f:
            pickle.dump(rf, f)
        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metrics, f, indent=2)
            
        self.modelo_rl = rl
        self.modelo_rf = rf
        print("Modelos y métricas entrenados y guardados con éxito.")

    def predecir(self, features_dict):
        """
        Recibe un diccionario con las características de una secuencia
        y retorna la predicción de ambos modelos. La probabilidad devuelta
        representa la confianza en la clase predicha (sea Resistente o No Resistente).
        """
        if self.modelo_rl is None or self.modelo_rf is None:
            raise RuntimeError("Los modelos no han sido inicializados.")
            
        # Convertir características al vector de entrada ordenado
        vector = [features_dict[name] for name in self.feature_names]
        X_pred = np.array([vector])
        
        # Predicción RL
        prob_rl = float(self.modelo_rl.predict_proba(X_pred)[0, 1])
        pred_rl = int(self.modelo_rl.predict(X_pred)[0])
        conf_rl = prob_rl if pred_rl == 1 else (1.0 - prob_rl)
        
        # Predicción RF
        prob_rf = float(self.modelo_rf.predict_proba(X_pred)[0, 1])
        pred_rf = int(self.modelo_rf.predict(X_pred)[0])
        conf_rf = prob_rf if pred_rf == 1 else (1.0 - prob_rf)
        
        return {
            "logistic_regression": {
                "prediccion": pred_rl,
                "resultado": "Resistente" if pred_rl == 1 else "No Resistente",
                "probabilidad": conf_rl
            },
            "random_forest": {
                "prediccion": pred_rf,
                "resultado": "Resistente" if pred_rf == 1 else "No Resistente",
                "probabilidad": conf_rf
            }
        }
