FROM node:18

WORKDIR /app

COPY . .
RUN npm install
ENV NODE_ENV production

COPY add-file-env.sh /usr/local/bin/add-file-env.sh
RUN chmod +x /usr/local/bin/add-file-env.sh

RUN npm run build

ENTRYPOINT ["/bin/bash", "./add-file-env.sh"]
CMD ["npm", "run", "start:prod"]
EXPOSE 4000