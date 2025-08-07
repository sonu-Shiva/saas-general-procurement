FROM node:20
ENV APPDIR='/opt/app'
WORKDIR /opt/app
COPY . /opt/app/
RUN npm install
RUN apt-get update && apt-get install -y supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
ARG BUILDCMD="npm run build"
RUN ${BUILDCMD}
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]