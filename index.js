require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')

const { SERVER_URL, API_TOKEN, TELEGRAM_API_URL } = process.env
const TELEGRAM_API = TELEGRAM_API_URL + '/bot' + API_TOKEN
const URI = `/webhook/${API_TOKEN}`
const WEBHOOK_URL = SERVER_URL + URI

const app = express()
app.use(bodyParser.json())

const init = async () => {
  const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`)
  console.log(res.data)
}

let step = 0

// TODO: move to other file
const processBot = ({ message }) => {
  let payload = {};

  if (step === 0 || message === "/logout") {
    step = 0

    payload = {
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: "To start, please type /start."
    }
  }

  if (message.text === "/start") {
    step++
    payload = {
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: "Welcome to Group 5 Chatbot JS! Are you ready to start?",
      reply_markup: {
        keyboard: [
          [{ 
            text: "Yes, let\'s do it!",
            request_contact: true
          }]
        ],
        one_time_keyboard: true
      }
    }
  }

  return payload
} 


app.post(URI, async (req, res) => {
  console.log(req.body)

 const payload = processBot(req.body)

  await axios.post(`${TELEGRAM_API}/sendMessage`, payload)

  return res.send()
})


app.listen(process.env.PORT || 5000, async () => {
  console.log('🚀 app running on port', process.env.PORT || 5000)
  await init()
})
 