# Проверка токена Instagram: python3 scripts/check-instagram.py
# Печатает только результат, сам токен на экран не выводит.
import json, pathlib, urllib.error, urllib.parse, urllib.request

env = pathlib.Path(__file__).resolve().parent.parent / ".env.local"
token = ""
for line in env.read_text(encoding="utf-8").splitlines():
    if line.startswith("INSTAGRAM_ACCESS_TOKEN="):
        token = line.split("=", 1)[1].strip()

if not token:
    print("В .env.local пустая строка INSTAGRAM_ACCESS_TOKEN")
else:
    print("Длина токена:", len(token), "| начинается на:", token[:4])
    query = urllib.parse.urlencode({"fields": "username,media_count", "access_token": token})
    try:
        with urllib.request.urlopen("https://graph.instagram.com/me?" + query, timeout=20) as response:
            data = json.load(response)
        print("Токен работает: аккаунт @%s, публикаций: %s" % (data.get("username"), data.get("media_count")))
    except urllib.error.HTTPError as error:
        body = json.loads(error.read().decode() or "{}")
        print("ОШИБКА", error.code, body.get("error", {}).get("message", ""))
    except Exception as error:
        print("Нет связи с Instagram:", error)
