import urllib.request
import urllib.error
import json

url = 'http://127.0.0.1:5000/api/predict'
try:
    with open('d:/INGENIERIA DE SOFTWARE/BIOINFORMATICA/TF - GRUPO 3/Dataset_Features_Ecoli.csv', 'r') as f:
        csv_data = f.read()
    data = json.dumps({'secuencia': csv_data}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    r = urllib.request.urlopen(req)
    res_json = json.loads(r.read().decode('utf-8'))
    
    no_resistant = [x for x in res_json.get("data", []) if x.get("resultado") == "No Resistente"]
    print("Found", len(no_resistant), "No Resistente samples.")
    if no_resistant:
        print("Sample No Resistente:")
        print(json.dumps(no_resistant[0], indent=2))
        
except Exception as ex:
    print("Error:", ex)
