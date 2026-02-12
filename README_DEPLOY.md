# Guía de Despliegue en Render

## Configuración en Render

### 1. Crear un nuevo Web Service

1. Ve a tu dashboard de Render
2. Click en "New +" → "Web Service"
3. Conecta tu repositorio o sube el código

### 2. Configuración del Build

**Root Directory:** Debe estar vacío o apuntar a la raíz del proyecto (no a `src/`)

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

### 3. Variables de Entorno

Configurar las siguientes variables de entorno en Render:

```
DATABASE_URL=postgresql://agencia_eva_dbb_user:pxqoPAKyjS0SyHbVMYpFLYbEcDbwvd0z@dpg-d632tnv5r7bs739q8j4g-a.virginia-postgres.render.com/agencia_eva_dbb
JWT_SECRET=tu-secret-key-muy-segura-cambiar-en-produccion
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=10000
```

**Nota:** Render usa el puerto 10000 por defecto, pero también puedes usar la variable `PORT` que Render proporciona automáticamente.

### 4. Configuración Avanzada (si es necesario)

Si Render sigue buscando en `src/`, verifica:

1. **Root Directory:** Debe estar vacío (no poner `src/` ni ninguna ruta)
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`

### 5. Inicializar Base de Datos

Después del primer despliegue, ejecuta el script de inicialización:

1. Ve a la consola de Render (Shell)
2. Ejecuta:
```bash
npm run init:admin
```

O conecta directamente a la base de datos y ejecuta el script SQL:
```bash
psql $DATABASE_URL -f database/create_admin_table.sql
```

## Solución de Problemas

### Error: "Could not read package.json"

**Causa:** Render está buscando el `package.json` en una ubicación incorrecta.

**Solución:**
1. Verifica que el **Root Directory** esté vacío en la configuración de Render
2. Asegúrate de que el `package.json` esté en la raíz del repositorio
3. Si el proyecto está en una subcarpeta, configura el **Root Directory** correctamente

### Error: "Module not found"

**Causa:** Las dependencias no se instalaron correctamente.

**Solución:**
1. Verifica que el `package.json` tenga todas las dependencias
2. Asegúrate de que el Build Command incluya `npm install`
3. Revisa los logs de build en Render

### Error: "Cannot find module 'dist/server/api.js'"

**Causa:** TypeScript no se compiló correctamente.

**Solución:**
1. Verifica que el Build Command incluya `npm run build`
2. Revisa los errores de compilación en los logs
3. Asegúrate de que `tsconfig.json` esté configurado correctamente

## Verificación Post-Despliegue

1. Verifica que el servicio esté corriendo: `https://tu-servicio.onrender.com`
2. Prueba el endpoint de health: `GET /api/auth/login` (debe devolver error 400, no 404)
3. Inicializa el admin: Ejecuta `npm run init:admin` desde la consola de Render

## URL del Backend

Una vez desplegado, la URL será algo como:
```
https://agencia-gestion-backend.onrender.com
```

Esta URL debe configurarse en el frontend como `API_BASE_URL`.

