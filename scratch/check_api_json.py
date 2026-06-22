import urllib.request
import json

try:
    response = urllib.request.urlopen("http://127.0.0.1:5000/api/metrics")
    data = json.loads(response.read().decode('utf-8'))
    print("Keys in response data:")
    print(list(data["data"].keys()))
except Exception as e:
    print("Error:", e)
