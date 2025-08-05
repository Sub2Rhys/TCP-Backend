FROM node:24

WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
RUN npm install

# Copy the rest of the project into the docker image
COPY . .

# Expose all required ports, and define the application launch CMD.
EXPOSE 8080
CMD ["npm", "run", "start"]
