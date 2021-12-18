require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')

const { SERVER_URL, API_TOKEN, TELEGRAM_API_URL } = process.env
const TELEGRAM_API = TELEGRAM_API_URL + '/bot' + API_TOKEN
const URI = `/webhook/${API_TOKEN}`
const WEBHOOK_URL = SERVER_URL + URI

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

const app = express()
app.use(bodyParser.json())

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
const accountSid = TWILIO_ACCOUNT_SID
const authToken = TWILIO_AUTH_TOKEN

const client = require('twilio')(accountSid, authToken, {
  logLevel: 'debug'
})

const init = async () => {
  const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`)
                      .catch(e => {
                        console.log('===== error')
                        console.log(e.response.data)
                      })

  console.log(res.data)
}

let step = -1

// Twilio services
// TODO: move to a separate file
const sendOTP = (contactNumber, channel = 'sms') => {
  const { TWILIO_VERIFY_SID } = process.env

  client.verify.services(TWILIO_VERIFY_SID)
        .verifications
        .create({
          to: '+' + contactNumber,
          channel
        })
        .then(verification => console.log(verification.status))
}

const verifyOTP = async (contactNumber, code) => {
  const { TWILIO_VERIFY_SID } = process.env

  return 'approved'
  const status = await client.verify.services(TWILIO_VERIFY_SID)
      .verificationChecks
      .create({to: '+' + contactNumber, code: code})
      .then(verification_check => verification_check.status)
      .catch(response => {
        console.log('response?????')
        console.log(response)
      })

}

/* const processVerification = (contactNumber, code) => {
  const { TWILIO_VERIFY_SID } = process.env
  await client.verify.services(TWILIO_VERIFY_SID)
        .verificationChecks
        .create({
          to: '+' + contactNumber,
          code
        })
        .then(verification_check => {
          if (verification_check.status === '')
        })


} */

// TODO: move to other file
const processBot = async (message, step) => {
  console.log('message', message)

  switch (step) {
    case 0:
      localStorage.removeItem('sessionId')
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "You are now logged out. Please type /start to try again."
      }
    
    case 1:
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Welcome to Chatbot JS! Are you ready to start?",
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

    // send SMS OTP
    case 2:
      localStorage.setItem('contactNumber', message.contact.phone_number)
      await sendOTP(message.contact.phone_number)
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Please enter the OTP sent to your phone number."
      }
    
    // verify OTP
    case 3:
      console.log('step 3 =======')
      const status = await verifyOTP(localStorage.getItem('contactNumber'), message.text)
      console.log(status)
      if (status === 'approved') {
        localStorage.removeItem('contactNumber')
        localStorage.setItem('sessionId', message.from.id)
        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "Hello, " + message.from.first_name + "! You are now logged in.\nTo get a random quote from presidential candidates, type QUOTES.\nTo logout, type /logout."
        }
      } else {
        await sendOTP(message.contact.phone_number)
        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "Please enter the OTP sent to your phone number."
        }
      }
      break

    default:
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "To start, please type /start."
      }
  }
} 

const getCurrentStep = (message) => {

  if (message.text === '/start') {
    return 1
  }

  if (message.text === '/logout') {
    return 0
  }

  // if request_contact is invoked
  if (typeof message.text === 'undefined' & typeof message.contact === 'object') {
    return 2
  }

  if (localStorage.getItem('contactNumber')) {
    return 3
  }

  // if user is logged in
  if (localStorage.getItem('sessionId')) {
    if (message.text === 'QUOTES') {
      return 4
    }
  }

  return step
}

app.post(URI, async (req, res) => {
  const { message } = req.body
  //console.log(req.body)
  const config = {
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
      'Content-Type': 'application/json'
    }
  }

  const currentStep = getCurrentStep(message)
  console.log('current step ===', currentStep)
  const payload = await processBot(message, currentStep)
  console.log('payload ===', payload)

  await axios.post(`${TELEGRAM_API}/sendMessage`, JSON.stringify(payload), config)
            .catch(e => {
              console.log('===== error')
              console.log(e.response.data)
              console.log(e.response)
            })

  return res.send()
})


app.listen(process.env.PORT || 5000, async () => {
  console.log('🚀 app running on port', process.env.PORT || 5000)
  await init()
})
 