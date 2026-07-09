FROM node:22-apline AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . . 

RUN npm rin build


FROM node:22-alpine


WORKDIR /app

ENV NODE_ENV production

COPY package*.json ./

RUN npm ci --omit=dev


COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]