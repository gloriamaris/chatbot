require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const quotes = require('./quotes.json')
const validator = require('email-validator')

const { SERVER_URL, API_TOKEN, TELEGRAM_API_URL } = process.env
const TELEGRAM_API = TELEGRAM_API_URL + '/bot' + API_TOKEN
const URI = `/webhook/${API_TOKEN}`
const WEBHOOK_URL = SERVER_URL + URI

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage
  localStorage = new LocalStorage('./scratch')
}

const mailgun = require("mailgun-js")

const app = express()
app.use(bodyParser.json())

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
const accountSid = TWILIO_ACCOUNT_SID
const authToken = TWILIO_AUTH_TOKEN

const client = require('twilio')(accountSid, authToken, {
  logLevel: 'debug'
})

const init = async () => {
  const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}&`)
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

  const status = await client.verify.services(TWILIO_VERIFY_SID)
    .verificationChecks
    .create({ to: '+' + contactNumber, code: code })
    .then(verification_check => verification_check.status)
    .catch(response => {
      console.log('response?????')
      console.log(response)
    })

  return status

}

// Mailgun service
const sendEmail = data => {
  console.log('===== sendEmail')
  console.log(data)
  const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN })

  mg.messages().send(data, function (error, body) {
    console.log(body)
  })
}

const clearStorage = () => {
  localStorage.removeItem('sessionId')
  localStorage.removeItem('sessionName')
  localStorage.removeItem('sessionEmail')
  localStorage.removeItem('sessionReport')
  localStorage.removeItem('contactNumber')
  localStorage.removeItem('currentStep')
}

// TODO: move to other file
const processBot = async (message, step) => {
  console.log('message', message)

  switch (step) {
    case 0:
      clearStorage()
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
      //await sendOTP(message.contact.phone_number)
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Please enter the OTP sent to your phone number."
      }

    // verify OTP
    case 3:
      let status = 'approved'
      if (localStorage.getItem('sessionId')) {
        const validKeywords = ["QUOTES", "/logout"]
        const isInputFound = validKeywords.findIndex(item => item === message.text)

        if (!isInputFound) {
          return {
            chat_id: message.chat.id,
            message_id: message.message_id,
            text: "Sorry, you have entered an invalid keyword. Please try again."
          }  
        }

        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "To get a random quote from presidential candidates, type QUOTES.\nTo logout, type /logout."
        }  
      }
      
      //let status = await verifyOTP(localStorage.getItem('contactNumber'), message.text)
      //console.log(status)
      if (status === 'approved') {
        localStorage.removeItem('contactNumber')
        localStorage.setItem('sessionId', message.from.id)
        
        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "Hello, " + message.from.first_name + "! You are now logged in.\nTo get a random quote from presidential candidates, type QUOTES.\nTo logout, type /logout."
        }
      } else {
        await sendOTP(localStorage.getItem('contactNumber'))
        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "Please enter the OTP sent to your phone number."
        }
      }

    case 4:
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Choose one:",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Ping Lacson",
                callback_data: "lacson"
              },
              {
                text: "Bongbong Marcos",
                callback_data: "marcos"
              },
              {
                text: "Leni Robredo",
                callback_data: "robredo"
              },
              {
                text: "Isko Moreno",
                callback_data: "moreno"
              },
              {
                text: "Manny Pacquiao",
                callback_data: "pacquiao"
              },
            ]
          ],
          one_time_keyboard: true
        }
      }

    case 5:
      let randomNumber = Math.floor(Math.random() * 5)
      let candidate = message.reply_markup.inline_keyboard[0].find(item => item.callback_data === message.selected)
      let quotableQuote = `"${quotes[message.selected][randomNumber]}"\n–– ${candidate.text}`

      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: quotableQuote + "\n\nTo generate report, type REPORT.\nTo generate a new quote, type QUOTES."
      }

    case 6:
      localStorage.setItem('currentStep', 7)
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "What is your name?"
      }

    case 7:
      localStorage.setItem('currentStep', 8)
      localStorage.setItem('sessionName', message.text)
      console.log('======== message')
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "What is your e-mail address?"
      }

    case 8:
      if (validator.validate(message.text)) {
        localStorage.setItem('currentStep', 9)
        localStorage.setItem('sessionEmail', message.text)
        return {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: "What is your report?"
        }
      }

      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Sorry, you have entered an invalid keyword. Please type input a valid e-mail address."
      }



    case 9:
      localStorage.setItem('sessionReport', message.text)
      localStorage.setItem('currentStep', 3)
      let name = localStorage.getItem('sessionName')
      let email = localStorage.getItem('sessionEmail')
      let report = localStorage.getItem('sessionReport')

      sendEmail({
        from: `IS238 Group 5 <${process.env.MAILGUN_FROM}>`,
        to: `${name} <${email}>`,
        subject: `A Report from ${name}`,
        'h:Reply-To': `${name} <${email}>`,
        text: report
      })

      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Thanks! E-mail sent. Please check your Inbox or Spam folder for the report.\n\nTo generate new quotes, type QUOTES.\nTo logout, please type /logout."
      }

    case 10:
      console.log('ERROR PATH ========')
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "Sorry, you have entered an invalid keyword. Please try again."
      }

    default:
      console.log('unsa diay ang step ???? ', step)
      return {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: "To start, please type /start."
      }
  }
}

const getCurrentStep = (message) => {
  const currentStep = +localStorage.getItem('currentStep')

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
    const validKeywords = ["QUOTES", "REPORT", "Choose one:"]
    const isInputFound = validKeywords.findIndex(item => item === message.text)
    console.log({ message: message.text, currentStep })

    if (isInputFound < 0 && currentStep < 6 && currentStep > 9) {
      return 10
    }

    if (message.text === "QUOTES") {
      return 4
    }

    if (message.text === "Choose one:") {
      return 5
    }

    if (message.text === "REPORT") {
      return 6
    }

    if (currentStep) {
      return currentStep
    }

  }

  return step
}

app.post(URI, async (req, res) => {
  const { message, callback_query } = req.body
  let requestData = message

  console.log({ message, callback_query })

  if (callback_query) {
    requestData = {
      ...callback_query.message,
      selected: callback_query.data
    }
  }

  if (message || callback_query) {
    const config = {
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json'
      }
    }

    const currentStep = getCurrentStep(requestData)
    localStorage.setItem('currentStep', currentStep)
    console.log('current step ===', currentStep)
    const payload = await processBot(requestData, currentStep)
    console.log('payload ===', payload)

    await axios.post(`${TELEGRAM_API}/sendMessage`, JSON.stringify(payload), config)
      .catch(e => {
        console.log('===== error')
        console.log(e.response)
      })

    return res.send()
  }

})


app.listen(process.env.PORT || 5000, async () => {
  console.log('🚀 app running on port', process.env.PORT || 5000)
  await init()
})
