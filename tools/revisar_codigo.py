"""Revisión estática (sin Kivy): nombres sin definir, importaciones inexistentes, métodos de la lógica y tipos de icono.
Uso: python tools/revisar_codigo.py"""
import ast
import builtins
import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
archivos = sorted(glob.glob(os.path.join(RAIZ, "pijao", "**", "*.py"), recursive=True)) + [os.path.join(RAIZ, "main.py")]
errores = []


def definidos(arbol):
    n = set(dir(builtins)) | {'__file__', '__name__'}
    for x in ast.walk(arbol):
        if isinstance(x, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
            n.add(x.name)
            if not isinstance(x, ast.ClassDef):
                a = x.args
                n.update(v.arg for v in a.args + a.kwonlyargs + a.posonlyargs)
                n.update(v.arg for v in (a.vararg, a.kwarg) if v)
        elif isinstance(x, ast.Lambda):
            a = x.args
            n.update(v.arg for v in a.args + a.kwonlyargs)
            n.update(v.arg for v in (a.vararg, a.kwarg) if v)
        elif isinstance(x, (ast.Import, ast.ImportFrom)):
            n.update((al.asname or al.name).split(".")[0] for al in x.names)
        elif isinstance(x, ast.Name) and isinstance(x.ctx, (ast.Store, ast.Del)):
            n.add(x.id)
        elif isinstance(x, ast.ExceptHandler) and x.name:
            n.add(x.name)
    return n


def nombres_de_modulo(ruta):
    arbol = ast.parse(open(ruta, encoding="utf-8").read())
    nombres = {x.name for x in arbol.body if isinstance(x, (ast.FunctionDef, ast.ClassDef))}
    for x in arbol.body:
        if isinstance(x, ast.Assign):
            for t in x.targets:
                nombres.update(n.id for n in ast.walk(t) if isinstance(n, ast.Name))
    return nombres


# lógica: miembros de Aplicacion
ap = ast.parse(open(os.path.join(RAIZ, "pijao", "servicios", "aplicacion.py"), encoding="utf-8").read())
miembros = set()
for c in [x for x in ap.body if isinstance(x, ast.ClassDef)]:
    for x in c.body:
        if isinstance(x, ast.Assign):
            miembros.update(t.id for t in x.targets if isinstance(t, ast.Name))
    for x in ast.walk(c):
        if isinstance(x, ast.FunctionDef):
            miembros.add(x.name)
        elif isinstance(x, ast.Attribute) and isinstance(x.value, ast.Name) and x.value.id == "self" and isinstance(x.ctx, ast.Store):
            miembros.add(x.attr)
tema = nombres_de_modulo(os.path.join(RAIZ, "pijao", "ui", "tema.py"))
tipos = {m[1:] for m in re.findall(r"def (_\w+)\(self, x, y, s\)", open(os.path.join(RAIZ, "pijao", "ui", "tema.py"), encoding="utf-8").read())}

for ruta in archivos:
    rel = os.path.relpath(ruta, RAIZ)
    src = open(ruta, encoding="utf-8").read()
    try:
        arbol = ast.parse(src)
    except SyntaxError as e:
        errores.append(f"{rel}: sintaxis {e}")
        continue
    d = definidos(arbol)
    for x in ast.walk(arbol):
        if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Load) and x.id not in d:
            errores.append(f"{rel}:{x.lineno}: nombre sin definir '{x.id}'")
        if isinstance(x, ast.ImportFrom) and x.module == "tema" and x.level == 1:
            for al in x.names:
                if al.name not in tema:
                    errores.append(f"{rel}:{x.lineno}: tema no tiene '{al.name}'")
    for m in re.finditer(r"logica\.(\w+)", src):
        if m.group(1) not in miembros | {"db", "remoto", "perfil", "sync"}:
            errores.append(f"{rel}: la lógica no tiene '{m.group(1)}'")
    for m in re.finditer(r"(?:Icono|ItemNav|TileSeccion|BotonRedondo)\(\s*\"(\w+)\"", src):
        if m.group(1) not in tipos | {"mapa_nav"}:
            errores.append(f"{rel}: tipo de icono desconocido '{m.group(1)}'")
    for m in re.finditer(r"\(\"(\w+)\", \"[A-Za-zñÁ-ú ]+\"(?:, \"\w+\"|, None)\)", src if "/ui/" in ruta.replace("\\", "/") else ""):
        if m.group(1) not in tipos | {"mapa_nav"}:
            errores.append(f"{rel}: icono desconocido '{m.group(1)}'")

# llamadas a las piezas de tema.py: argumentos obligatorios y cantidad de posicionales
firmas = {}
for x in ast.parse(open(os.path.join(RAIZ, "pijao", "ui", "tema.py"), encoding="utf-8").read()).body:
    f = x if isinstance(x, ast.FunctionDef) else next((m for m in getattr(x, "body", []) if isinstance(m, ast.FunctionDef) and m.name == "__init__"), None)
    if f:
        a = f.args
        pos = [v.arg for v in a.args if v.arg != "self"]
        firmas[x.name] = (pos, len(pos) - len(a.defaults), a.kwarg is not None, a.vararg is not None, {v.arg for v in a.kwonlyargs})
for ruta in archivos:
    if "/ui/" not in ruta.replace("\\", "/"):
        continue
    for x in ast.walk(ast.parse(open(ruta, encoding="utf-8").read())):
        if isinstance(x, ast.Call) and isinstance(x.func, ast.Name) and x.func.id in firmas:
            pos, req, kw, va, solo = firmas[x.func.id]
            dados = {k.arg for k in x.keywords if k.arg}
            if len(x.args) > len(pos) and not va:
                errores.append(f"{os.path.relpath(ruta, RAIZ)}:{x.lineno}: {x.func.id} recibe demasiados argumentos")
            faltan = [n for n in pos[:req] if n not in dados and pos.index(n) >= len(x.args)]
            if faltan and not any(k.arg is None for k in x.keywords):
                errores.append(f"{os.path.relpath(ruta, RAIZ)}:{x.lineno}: {x.func.id} sin '{faltan[0]}'")
            if x.func.id == "etiqueta" and dados & {"size_hint_y", "text", "font_size", "color", "bold", "valign"}:
                errores.append(f"{os.path.relpath(ruta, RAIZ)}:{x.lineno}: etiqueta ya define {sorted(dados & {'size_hint_y', 'text', 'font_size', 'color', 'bold', 'valign'})}")
            if not kw:
                for k in dados - set(pos) - solo:
                    errores.append(f"{os.path.relpath(ruta, RAIZ)}:{x.lineno}: {x.func.id} no acepta '{k}'")

print("\n".join(errores) if errores else f"Revisión limpia: {len(archivos)} archivos sin nombres sin definir, importaciones rotas ni métodos inexistentes.")
sys.exit(1 if errores else 0)
