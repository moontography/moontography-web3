# Base image
FROM node:14.13.1

LABEL AUTHOR="Lance Whatley"

# specify working directory
WORKDIR /usr/geoapi

# Install dependencies
COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# Default command
CMD npm start
