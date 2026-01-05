#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
from pathlib import Path

# ============================================
# CONFIGURACIÓN
# ============================================

# Archivos JSON
NAV_PAGE_FILE = "NavPage.json"
PAGES_FILE = "page.json"

# Nombre del archivo de salida
name_txt = "SoloPaginasDefinirReglas"

# Páginas habilitadas (modifica esta lista según necesites)
paginas_habilitadas = [
        "Definir Reglas",
        "Regla de fatiga"
    ]

# ============================================
# CÓDIGO PRINCIPAL
# ============================================

# Cargar JSONs
with open(NAV_PAGE_FILE, 'r', encoding='utf-8') as f:
    nav_data = json.load(f)

with open(PAGES_FILE, 'r', encoding='utf-8') as f:
    pages_data = json.load(f)

# Crear directorio outputs si no existe
Path("outputs").mkdir(exist_ok=True)

# Asegurar extensión .txt
if not name_txt.endswith('.txt'):
    name_txt += '.txt'

output_path = Path("outputs") / name_txt

# Preparar contenido
content = []

# Si el archivo existe, agregar línea en blanco al inicio
if output_path.exists():
    content.append("")

# 1. Páginas habilitadas
content.append(f"paginas habilitadas: {paginas_habilitadas}")

# 2. Privilege
privilege = nav_data.get('privilege', '')
content.append(f"privilege: \"{privilege}\"")

# 3. Páginas (JSON)
content.append("paginas:")
pages_json = json.dumps(pages_data, indent=4, ensure_ascii=False)
content.append(pages_json)

# Guardar (append si existe, write si es nuevo)
mode = 'a' if output_path.exists() else 'w'
with open(output_path, mode, encoding='utf-8') as f:
    if output_path.exists() and mode == 'a':
        f.write('\n')
    f.write('\n'.join(content))

print(f"✅ Guardado en: {output_path.absolute()}")