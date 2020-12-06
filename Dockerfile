FROM node:latest
ARG CLIENT_ID
ARG CLIENT_SECRET
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "index.js --id=" + CLIENT_ID + " --secret=" + CLIENT_SECRET]