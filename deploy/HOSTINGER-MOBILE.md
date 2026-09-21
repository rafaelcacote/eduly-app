# Deploy PWA Eduly — m.agendaedully.com.br

PWA (Expo static) na VPS Hostinger, ao lado dos ambientes Laravel.

| Item | Valor |
|------|--------|
| Domínio | `https://m.agendaedully.com.br` |
| API | `https://demo.agendaedully.com.br` |
| Pasta VPS | `/opt/apps/edully/mobile` |
| Porta host | `127.0.0.1:8084` → container nginx |
| Compose | `edully-mobile` |

## Layout

```text
/opt/apps/edully/
├── staging/      # homolog.agendaedully.com.br :8081
├── production/   # app.agendaedully.com.br     :8082
├── demo/         # demo.agendaedully.com.br    :8083
└── mobile/       # m.agendaedully.com.br       :8084  ← este projeto (eduly-app)
```

## Subir / atualizar

Repo: [rafaelcacote/eduly-app](https://github.com/rafaelcacote/eduly-app) (branch `main`).

**1ª vez na VPS** (se a pasta ainda for só rsync, troque por clone):

```bash
# opcional: backup do que estava
mv /opt/apps/edully/mobile /opt/apps/edully/mobile.bak

git clone -b main https://github.com/rafaelcacote/eduly-app.git /opt/apps/edully/mobile
cd /opt/apps/edully/mobile
cp deploy/mobile/.env.example deploy/mobile/.env
cd deploy/mobile
docker compose up -d --build
```

**Atualizar depois:**

```bash
cd /opt/apps/edully/mobile
git pull origin main
cd deploy/mobile
docker compose up -d --build
```

Nginx (1ª vez — bloco HTTP; certbot gera o 443):

```bash
# Anexar proxy mobile ao edully.conf (se ainda não existir)
grep -q 'm.agendaedully.com.br' /etc/nginx/sites-enabled/edully.conf \
  || cat /opt/apps/edully/mobile/deploy/proxy/nginx-mobile.conf >> /etc/nginx/sites-enabled/edully.conf

nginx -t && systemctl reload nginx
certbot --nginx -d m.agendaedully.com.br --non-interactive --agree-tos --redirect \
  -m admin@agendaedully.com.br || certbot --nginx -d m.agendaedully.com.br
```

## Health check

```bash
curl -I http://127.0.0.1:8084/
curl -I https://m.agendaedully.com.br/
```

## APK (EAS)

No PC, com EAS CLI logado:

```bash
eas build -p android --profile preview
```

A URL da API no APK vem de `eas.json` → `https://demo.agendaedully.com.br`.
