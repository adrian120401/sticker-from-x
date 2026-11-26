# Sticker from X

Convertí una foto o un GIF de una publicación pública de X en un sticker para WhatsApp. Pegá el enlace, generá el sticker y mantené pulsada la imagen en Safari para copiarla. Las fotos se descargan en PNG y las animaciones en GIF.

La portada selecciona el idioma del dispositivo. Las versiones en español e inglés tienen URLs indexables en `/es` y `/en`.

## Desarrollo local

Instalá Node.js 22 y corré estos comandos.

```powershell
npm ci
npm start
```

Abrí `http://127.0.0.1:8787/`. Para probar desde un celular conectado a la misma red, pasá la IP local de tu computadora con `npm start -- --host <IP-local>`.

El conversor usa FFmpeg. `npm ci` instala el binario incluido en `ffmpeg-static`. `FFMPEG_PATH` permite usar otro binario. La resolución de publicaciones usa [FxEmbed](https://docs.fxembed.com/api/twitter/operations/2statusid/) y las imágenes se descargan desde los CDN de X.

## Vercel

`npm run build` genera las páginas, sus metadatos, el sitemap y el archivo de robots en `dist/`. La función `/api/sticker` sirve las imágenes por URL y el CDN puede reutilizar conversiones recientes. El build obtiene la URL canónica de `VERCEL_PROJECT_PRODUCTION_URL`. Configurá `SITE_URL` si querés indicar un dominio específico.

Activá Web Analytics en el proyecto de Vercel antes de desplegar. El botón **Compartir en X** usa las rutas de campaña `/x` y `/x/es`, visibles en el informe de páginas. La URL compartida también incluye parámetros UTM.

Speed Insights recopila métricas de carga en los navegadores que visitan el sitio publicado. En **Logs** de Vercel, buscá `sticker_conversion` para ver el código de estado, el formato de salida y la duración en milisegundos de cada conversión que ejecutó el servidor.
