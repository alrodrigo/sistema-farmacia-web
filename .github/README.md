# 🚀 Configuración de CI/CD

## ¿Qué es CI/CD?

**CI/CD** significa **Continuous Integration / Continuous Deployment** (Integración Continua / Despliegue Continuo).

En palabras simples:
- **CI (Integración Continua):** Cada vez que subes código, se verifican automáticamente los errores
- **CD (Despliegue Continuo):** Si todo está bien, se publica automáticamente en producción

## ¿Cómo funciona en nuestro proyecto?

```
1. Haces cambios en tu código local
   ↓
2. Haces commit y push a GitHub
   ↓
3. GitHub Actions se activa automáticamente
   ↓
4. Despliega tu código a Firebase Hosting
   ↓
5. Tu sitio web se actualiza automáticamente
   ✅ ¡Todo listo!
```

## 📋 Configuración Inicial (Solo una vez)

### Paso 1: Obtener las credenciales de Firebase

```bash
# En tu terminal, ejecuta:
firebase login:ci
```

Esto te dará un **token** como este:
```
1//0abc123xyz...
```

### Paso 2: Agregar el token a GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. Click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**
5. Agrega estos secrets:

| Name | Value |
|------|-------|
| `FIREBASE_SERVICE_ACCOUNT_SISTEMA_FARMACIA_WEB` | (El token que obtuviste) |

### Paso 3: ¡Listo!

Ahora cada vez que hagas `git push origin main`, GitHub Actions desplegará automáticamente.

## 📊 Ver el estado del Deploy

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Verás todos los deploys con su estado:
   - ✅ Verde = Deploy exitoso
   - ❌ Rojo = Algo falló
   - 🟡 Amarillo = En proceso

## 🔧 Personalización

Si quieres cambiar cuándo se despliega, edita `.github/workflows/firebase-hosting.yml`:

```yaml
on:
  push:
    branches:
      - main           # Despliega cuando subes a main
      - production     # Puedes agregar más ramas
```

## 🚨 Troubleshooting

### Error: "Permission denied"
- Verifica que agregaste el secret correctamente en GitHub

### Error: "Firebase project not found"
- Verifica que el `projectId` en el workflow sea correcto

### El deploy no se activa
- Verifica que estés haciendo push a la rama `main`
- Revisa la pestaña Actions para ver si hay errores

## 📚 Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Hosting with GitHub Actions](https://github.com/FirebaseExtended/action-hosting-deploy)

---

**¿Preguntas?** Consulta con tu mentor o abre un issue en GitHub.
