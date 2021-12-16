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

app.post(URI, async (req, res) => {
  console.log(req.body)

  const payload = {
    chat_id: req.body.message.chat.id,
    text: req.body.message.text
  }

  const msgPayload = {
    chat_id: req.body.message.chat.id,
    message_id: req.body.message.message_id,
    text: "Welcome to Group 5 Chatbot JS! Are you ready to start?",
    reply_markup: {
      keyboard: [
        [{ text: "Yes, let\'s do it!" }]
      ]
    }
  }

  await axios.post(`${TELEGRAM_API}/sendMessage`, msgPayload)

  return res.send()
})


app.listen(process.env.PORT || 5000, async () => {
  console.log('🚀 app running on port', process.env.PORT || 5000)
  await init()
})
 