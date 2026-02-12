# Solución: Error "Invalid URL" en DATABASE_URL

## Problema

El error `TypeError: Invalid URL` indica que la variable de entorno `DATABASE_URL` no está configurada correctamente en Render.com o tiene un formato inválido.

## Solución

### Paso 1: Verificar DATABASE_URL en Render

1. Ve al dashboard de Render.com
2. Selecciona tu servicio del backend (`Agencia-Gestion-Backend`)
3. Ve a **Environment** (Variables de Entorno)
4. Verifica que exista la variable `DATABASE_URL`
5. Verifica que el valor sea una URL completa de PostgreSQL, por ejemplo:
   ```
   postgresql://usuario:contraseña@host:puerto/nombre_base_datos
   ```

### Paso 2: Configurar DATABASE_URL correctamente

Si la variable no existe o está mal configurada:

1. En Render, ve a tu base de datos PostgreSQL
2. En la sección **Connections**, copia la **Internal Database URL** o **External Database URL**
3. En el servicio del backend, agrega o actualiza la variable de entorno:
   - **Key**: `DATABASE_URL`
   - **Value**: Pega la URL completa que copiaste

### Paso 3: Formato correcto de DATABASE_URL

La URL debe tener este formato:
```
postgresql://usuario:contraseña@host:puerto/nombre_base_datos
```

Ejemplo:
```
postgresql://agencia_eva_dbb_user:pxqoPAKyjS0SyHbVMYpFLYbEcDbwvd0z@dpg-d632tnv5r7bs739q8j4g-a.virginia-postgres.render.com:5432/agencia_eva_dbb
```

### Paso 4: Verificar que la URL sea válida

El código ahora valida automáticamente que:
- La URL no esté vacía
- La URL comience con `postgres://` o `postgresql://`
- La URL sea parseable como URL válida

Si la validación falla, el código usará las variables individuales (`DB_HOST`, `DB_PORT`, etc.) como fallback.

### Paso 5: Variables de Entorno Alternativas

Si prefieres usar variables individuales en lugar de `DATABASE_URL`, configura:

- `DB_HOST`: Host de la base de datos
- `DB_PORT`: Puerto (generalmente 5432)
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos

### Paso 6: Reiniciar el Servicio

Después de configurar las variables de entorno:

1. Guarda los cambios en Render
2. El servicio se reiniciará automáticamente
3. Verifica los logs para confirmar que la conexión funciona

## Verificación

Después de configurar, deberías ver en los logs:
- ✅ Conexión exitosa a la base de datos
- ✅ Sin errores de "Invalid URL"
- ✅ El servidor iniciando correctamente

## Notas Importantes

- **Nunca** compartas tu `DATABASE_URL` públicamente
- La URL contiene credenciales sensibles
- Render redacta automáticamente las URLs en los logs por seguridad
- Si cambias la contraseña de la base de datos, actualiza `DATABASE_URL`

