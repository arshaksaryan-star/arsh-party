# Проверка ключа VK: python3 scripts/check-vk.py
# Печатает только результат, сам ключ на экран не выводит.
import json, pathlib, urllib.parse, urllib.request

env = pathlib.Path(__file__).resolve().parent.parent / ".env.local"
token = ""
for line in env.read_text(encoding="utf-8").splitlines():
    if line.startswith("VK_SERVICE_TOKEN="):
        token = line.split("=", 1)[1].strip()

if not token:
    print("В .env.local пустая строка VK_SERVICE_TOKEN")
else:
    print("Длина ключа:", len(token))
    query = urllib.parse.urlencode({"domain": "arshparty", "count": 1, "v": "5.199", "access_token": token})
    with urllib.request.urlopen("https://api.vk.com/method/wall.get?" + query, timeout=20) as response:
        data = json.load(response)
    error = data.get("error")
    if error:
        print("ОШИБКА", error["error_code"], error["error_msg"])
    else:
        print("Ключ работает, постов получено:", len(data["response"]["items"]))
