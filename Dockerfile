FROM node:20
ENV APPDIR='/opt/app'
WORKDIR /opt/app
COPY . /opt/app/
RUN npm install
ARG BUILDCMD="npm run build"
RUN ${BUILDCMD}
CMD ["supervisord"]