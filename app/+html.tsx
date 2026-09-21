import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML para todas as páginas web.
 * Usado para configurar o PWA (manifest, meta tags) durante o static rendering.
 * Este componente roda apenas em Node.js no build, sem acesso a APIs do browser.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA Manifest - permite instalar o app no celular */}
        <link rel="manifest" href="/manifest.json" />

        {/* Cores da barra de status no mobile */}
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Eduly" />

        <ScrollViewStyleReset />
      </head>
      <body style={{ margin: 0, backgroundColor: '#f0f9ff' }}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Captura o evento o quanto antes — o React pode montar depois dele.
              window.__edulyDeferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(event) {
                event.preventDefault();
                window.__edulyDeferredInstallPrompt = event;
                window.dispatchEvent(new Event('eduly-install-ready'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
