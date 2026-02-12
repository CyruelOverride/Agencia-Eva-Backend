# ⚠️ CONFIGURACIÓN CRÍTICA PARA RENDER

## Error: "Could not read package.json: ENOENT"

Este error ocurre porque Render está buscando el `package.json` en la carpeta incorrecta.

## 🔧 SOLUCIÓN PASO A PASO

### Opción 1: Si el repositorio SOLO contiene el backend

1. Ve a **Settings** → **Build & Deploy**
2. **Root Directory:** DEBE ESTAR **VACÍO** (no poner nada)
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`

### Opción 2: Si el repositorio contiene múltiples proyectos

Si tu repositorio tiene esta estructura:
```
repo/
├── Agencia-Gestion/
├── Agencia-Gestion-Backend/  ← El backend está aquí
└── Bot-Agencia/
```

Entonces:

1. Ve a **Settings** → **Build & Deploy**
2. **Root Directory:** `Agencia-Gestion-Backend`
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`

## ✅ Verificación

Después de configurar, Render debería:
- Encontrar `package.json` en `/opt/render/project/package.json` (no en `/opt/render/project/src/`)
- Ejecutar `npm install` correctamente
- Compilar con `npm run build`
- Iniciar con `npm start`

## 📋 Checklist de Configuración

- [ ] Root Directory configurado correctamente (vacío o `Agencia-Gestion-Backend`)
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Variables de entorno configuradas:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_EXPIRES_IN=24h`
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000` (o dejar que Render lo asigne)

## 🚨 Si el error persiste

1. **Verifica la estructura del repositorio:**
   - El `package.json` debe estar en la raíz de `Agencia-Gestion-Backend/`
   - No debe estar en `Agencia-Gestion-Backend/src/`

2. **Verifica el Root Directory:**
   - Si está vacío, Render buscará en la raíz del repo
   - Si es `Agencia-Gestion-Backend`, Render buscará en esa carpeta

3. **Revisa los logs de build:**
   - Los logs mostrarán dónde está buscando Render
   - Busca líneas como "Running in directory: /opt/render/project/..."

4. **Prueba con un nuevo servicio:**
   - A veces es más fácil crear un nuevo servicio con la configuración correcta

## 📝 Nota Importante

Render busca el `package.json` en:
- `/opt/render/project/` si Root Directory está vacío
- `/opt/render/project/[Root Directory]/` si Root Directory tiene un valor

**NUNCA** debe buscar en `/opt/render/project/src/` a menos que el Root Directory sea `src`, lo cual sería incorrecto.

