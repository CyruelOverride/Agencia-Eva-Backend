# Solución de Errores de Despliegue

## Error 1: "Could not read package.json: ENOENT"

**Causa:** Render está buscando el `package.json` en la carpeta incorrecta (`/opt/render/project/src/`).

**Solución:**
1. Ve a **Settings** → **Build & Deploy** en Render
2. **Root Directory:** 
   - Si el repo solo tiene el backend: **DEJAR VACÍO**
   - Si el repo tiene múltiples proyectos: poner `Agencia-Gestion-Backend` (sin `src/`)
3. Guarda y haz un nuevo deploy

## Error 2: "No overload matches this call" en jwt.sign()

**Causa:** TypeScript no puede inferir correctamente el tipo de `expiresIn`.

**Solución:** Ya está corregido en el código. El método `generateToken` ahora usa `SignOptions` explícitamente.

## Verificación Post-Corrección

Después de corregir el Root Directory, Render debería:
- ✅ Encontrar `package.json` en `/opt/render/project/package.json`
- ✅ Ejecutar `npm install` correctamente
- ✅ Compilar con `npm run build` sin errores
- ✅ Iniciar con `npm start`

## Configuración Final en Render

```
Root Directory: (vacío o Agencia-Gestion-Backend)
Build Command: npm install && npm run build
Start Command: npm start
```

## Variables de Entorno Requeridas

```
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=10000
```

