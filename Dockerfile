# 1. Usar a imagem oficial do Puppeteer (já tem Node + Chrome + Dependências)
FROM ghcr.io/puppeteer/puppeteer:latest

# 2. Define que vamos trabalhar na pasta /app lá dentro
WORKDIR /app

# 3. Copia os arquivos de configuração (package.json)
# O usuario "pptruser" é padrão dessa imagem de segurança
COPY --chown=pptruser:pptruser package*.json ./

# 4. Instala as dependências (Fastify)
RUN npm install

# 5. Copia o resto do seu código
COPY --chown=pptruser:pptruser . .

# 6. Expõe a porta 3000 para fora da caixa
EXPOSE 3000

# 7. Comando para rodar
CMD ["node", "server.js"]