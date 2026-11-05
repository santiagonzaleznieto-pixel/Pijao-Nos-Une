"""Crea la cuenta de Administrador (una sola vez). Uso: python crear_admin.py
Solo necesita Python 3. La URL y la clave anon son públicas por diseño."""
import getpass
import json
import urllib.error
import urllib.request

URL = "https://hxodqzorvvlkzensrsjr.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4b2Rxem9ydnZsa3plbnNyc2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTYwMDEsImV4cCI6MjEwNzY3MjAwMX0.1OpCL88hLiIduD4ybUsO4QZ_erx26DOdKrpqNZ1iBi0"

correo = input("Tu correo: ").strip()
nombre = input("Tu nombre completo: ").strip()
token = input("Código de instalación (32 caracteres, pégalo tal cual): ").strip().replace(" ", "")
print(f"  (recibí {len(token)} caracteres)")
clave = getpass.getpass("Contraseña (mínimo 12 caracteres): ")
clave2 = getpass.getpass("Repite la contraseña: ")
if clave != clave2:
    raise SystemExit("Las contraseñas no coinciden. Vuelve a empezar.")
if len(clave) < 12:
    raise SystemExit("La contraseña debe tener al menos 12 caracteres.")

cuerpo = json.dumps({"email": correo, "password": clave,
                     "data": {"bootstrap_token": token, "nombre_completo": nombre}}).encode()
req = urllib.request.Request(URL + "/auth/v1/signup", data=cuerpo, method="POST",
                             headers={"apikey": ANON, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=30):
        print("Listo. Revisa tu correo, confirma la cuenta y luego entra a la app.")
except urllib.error.HTTPError as e:
    msg = e.read().decode("utf-8", "ignore")
    if "Instalaci" in msg or e.code == 500:
        print("El código de instalación no coincide. Revisa que sean 32 caracteres exactos.")
    else:
        print("No se pudo crear la cuenta:", msg[:300])
