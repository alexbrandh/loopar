# Prevención de Errores ORB (Opaque Response Blocking)

## ¿Qué es el error ERR_BLOCKED_BY_ORB?

El error `net::ERR_BLOCKED_BY_ORB` ocurre cuando el navegador bloquea recursos cross-origin que no tienen los headers CORS apropiados. Esto es parte de la política de seguridad ORB (Opaque Response Blocking) del navegador.

## Causas Comunes

1. **URLs públicas de Supabase Storage sin CORS apropiados**
2. **Buckets privados accedidos como públicos**
3. **Headers de seguridad mal configurados (COEP, COOP)**
4. **Falta de signed URLs para recursos privados**

## Soluciones Implementadas

### 1. Configuración de Headers en next.config.js

```javascript
headers: async () => {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'unsafe-none', // Permite recursos cross-origin
        },
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin-allow-popups',
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'cross-origin',
        },
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
      ],
    },
  ];
},
```

### 2. Uso de Signed URLs

```typescript
// En lugar de URLs públicas
const publicUrl = `${supabaseUrl}/storage/v1/object/public/bucket/file`;

// Usar signed URLs
const { data: signedUrl } = await supabase.storage
  .from('bucket')
  .createSignedUrl('file-path', 3600); // 1 hora de expiración
```

### 3. Configuración de Buckets Privados

- Los buckets deben ser privados (`public: false`)
- Usar políticas RLS apropiadas
- Generar signed URLs en el servidor

## Mejores Prácticas

1. **Siempre usar signed URLs para recursos privados**
2. **Configurar headers CORS apropiados**
3. **Mantener buckets privados por defecto**
4. **Implementar políticas RLS restrictivas**
5. **Renovar signed URLs antes de que expiren**

## Checklist de Prevención

- [ ] Headers CORS configurados en next.config.js
- [ ] Buckets configurados como privados
- [ ] Políticas RLS implementadas
- [ ] Signed URLs generadas en el servidor
- [ ] Expiración de URLs manejada apropiadamente
- [ ] Pruebas en diferentes navegadores

## Monitoreo

Para detectar errores ORB temprano:

1. Monitorear logs del navegador
2. Implementar error boundaries
3. Alertas para fallos de carga de imágenes
4. Pruebas automatizadas de CORS