# chatbot
Chatbot for telegram for is238 using node js

## Basic Setup
Install [ngrok] (https://dashboard.ngrok.com/get-started/setup)

## Create an .env file
Create an environment file `.env` on the root folder with the following parameters:
```
API_TOKEN=<telegram token>
SERVER_URL=<ngrok url for local development>
TELEGRAM_API_URL=https://api.telegram.org
```
# Generating environment values
## Telegram token
Generate a Telegram token by searching for BotFather on Telegram. Instructions [here](https://www.siteguarding.com/en/how-to-get-telegram-bot-api-token).

## Ngrok URL
Execute this command:
```
ngrok http 5000
```

Plug those on the .env file.

# How to run
Install the necessary dependencies:
```
npm install
```

Run the server using:
```
npm run dev
```

If the code works, link should be working on the `t.me/<link>` link provided by BotFather.

