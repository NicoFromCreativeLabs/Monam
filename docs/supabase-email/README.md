# Correos de Supabase con SMTP propio

Por defecto Supabase manda los correos de cuenta con su servicio de prueba: pocos
correos por hora para todo el proyecto, remitente genérico y texto en inglés. Con un
SMTP propio salen de `monam.mx`, sin ese límite, y con el diseño de MONÂM.

## 1. Elegir proveedor (recomendado: Resend)

Cualquier proveedor SMTP sirve (Resend, Brevo, Postmark, Amazon SES). Resend es el
más simple: su plan gratis alcanza de sobra para un estudio (revisa los límites
vigentes en su página de precios).

1. Crea la cuenta en resend.com con un correo del negocio.
2. **Domains → Add Domain** → `mail.monam.mx` (subdominio, para separar la reputación del
   correo de cuentas del de `monam.mx`). Ya está creado y **verificado** (región us-east-1).
3. Resend muestra unos registros DNS (SPF, DKIM y uno de retorno). Agrégalos donde
   esté el DNS de `monam.mx` (el registrador o Netlify DNS) y pulsa **Verify**. Puede
   tardar de minutos a unas horas.
4. DMARC: `monam.mx` ya tiene uno (GoDaddy), que cubre el subdominio. No hay que agregar otro.
   Los MX de Google Workspace están en `@` y no chocan con el MX de `send.mail`.
5. **API Keys → Create API Key** con permiso **Sending access** y dominio `mail.monam.mx`.
   Cópiala: solo se muestra una vez. Es la contraseña del SMTP. No uses una llave de acceso
   completo para esto, y bórrala de Resend cuando termines la configuración.

## 2. Poner el SMTP en Supabase

Supabase → tu proyecto → **Authentication → Emails → SMTP Settings** (en versiones
anteriores: Project Settings → Auth) → activa **Enable custom SMTP**:

| Campo | Valor |
|---|---|
| Sender email | `no-reply@mail.monam.mx` (debe ser del dominio verificado en Resend) |
| Sender name | `MONÂM Skin Studio` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la API key de Resend |

Con otro proveedor, usa el host, puerto, usuario y contraseña que él indique.

## 3. Subir el límite de correos

Supabase → **Authentication → Rate Limits** → "Rate limit for sending emails". Con SMTP
propio ya se puede cambiar; súbelo (por ejemplo a 100 por hora). El tope real pasa a
ser el de tu proveedor.

## 4. Pegar las plantillas

Supabase → **Authentication → Emails → Templates**. Para cada una, pega el HTML de esta
carpeta y cambia el asunto:

| Plantilla de Supabase | Archivo | Asunto sugerido |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | Confirma tu correo — MONÂM |
| Reset password | `recovery.html` | Crea o restablece tu contraseña — MONÂM |
| Change email address | `change-email.html` | Confirma tu nuevo correo — MONÂM |

**Importante:** los enlaces de estas plantillas apuntan a `/auth/confirm` de la app
(`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`), que es lo que
espera `app/auth/confirm/route.ts`. Con las plantillas originales de Supabase el enlace
usa otro formato y el flujo de la app no encaja. Las plantillas de "Invite user" y
"Magic link" no se usan hoy: las altas de personal mandan el correo de "Reset password".

## 5. Revisar URLs

**Authentication → URL Configuration**:
- **Site URL:** `https://monam.mx` (las plantillas usan `{{ .SiteURL }}`).
- **Redirect URLs:** `https://monam.mx/**` y, para pruebas locales, `http://localhost:3000/**`.

Ojo: el proyecto de Supabase es el mismo para producción y para pruebas locales, así que
un correo pedido desde `localhost` también trae el enlace a `monam.mx`.

## 6. Probar

1. Pide "¿Olvidaste tu contraseña?" desde `/login` con tu correo.
2. Revisa que llegue a la bandeja de entrada (no a spam), desde `MONÂM Skin Studio`.
3. Abre el enlace: debe llevarte a `/auth/update-password`.
4. Si llega a spam, revisa en Resend que el dominio esté **Verified** (SPF y DKIM).
