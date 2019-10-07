FROM node:lts
MAINTAINER giy <giy.back@gmail.com>

RUN apt-get update
RUN apt-get install -y sudo
RUN apt-get install -y vim
RUN apt-get install -y git 

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# RUN git clone https://github.com/morfant/xyfi_sound.git

COPY . .

EXPOSE 8080


# Edit requirements-dev.txt for install pip extensions
# ADD ./requirements-dev.txt /fv_flask_server

# for ping test
#RUN apt-get install -y iputils-ping

ENTRYPOINT ["node", "server.js"]
