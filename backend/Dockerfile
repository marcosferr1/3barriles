FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npm run setup && npm start"]
