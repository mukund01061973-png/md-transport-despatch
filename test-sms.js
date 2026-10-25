const twilio = require('twilio');

const accountSid = 'YOUR_ACCOUNT_SID';
const authToken = 'YOUR_AUTH_TOKEN';
const fromNumber = 'YOUR_TWILIO_NUMBER';
const toNumber = '+447795681747';

const client = twilio(accountSid, authToken);

async function testSend() {
  try {
    console.log('Sending test SMS to ' + toNumber + '...');
    const message = await client.messages.create({
      body: 'MD Transport: SMS gateway test successful.',
      from: fromNumber,
      to: toNumber
    });
    console.log('SUCCESS! SMS SID:', message.sid);
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

testSend();
