import os
import json

HISTORY_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "data", "history.json")

if os.path.exists(HISTORY_PATH):
    print("Reading history file...")
    with open(HISTORY_PATH, "r", encoding="utf-8") as f:
        history = json.load(f)
    
    updated_count = 0
    for rec in history:
        # Check main prediction
        if rec.get("resultado") == "No Resistente" and rec.get("probabilidad", 100) <= 50.0:
            rec["probabilidad"] = round(100.0 - rec["probabilidad"], 2)
            updated_count += 1
            
        # Check details
        detalles = rec.get("detalles", {})
        
        lr_det = detalles.get("logistic_regression", {})
        if lr_det.get("resultado") == "No Resistente" and lr_det.get("probabilidad", 100) <= 50.0:
            lr_det["probabilidad"] = round(100.0 - lr_det["probabilidad"], 2)
            
        rf_det = detalles.get("random_forest", {})
        if rf_det.get("resultado") == "No Resistente" and rf_det.get("probabilidad", 100) <= 50.0:
            rf_det["probabilidad"] = round(100.0 - rf_det["probabilidad"], 2)

    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully updated {updated_count} history records to show predicted confidence.")
else:
    print("History file not found.")
