const functions = require('firebase-functions');
const request = require('request-promise');

const admin = require('firebase-admin');
admin.initializeApp();

const region = 'asia-east2';
const runtimeOpts = {
  timeoutSeconds: 60,
  memory: "2GB"
};

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer KxUy22JqzXe2fDVLsEecGKMVBqM4nZWHlaWol4yTsIBSJonYZ+nLGfcOUYirdbZgNmonZdHOqjkKPw5za8a3LLOkc3KQv5OoPet4Q7bdF1YcsFietnrn0gqZYKYQwiejywcFzQXo2SpFi1vs/cSJlgdB04t89/1O/w1cDnyilFU=`
};
exports.LineBotDOH = functions.region(region).runWith(runtimeOpts).https.onRequest(async (req, res) =>{
//exports.LineBotDOH = functions.https.onRequest((req, res) => {
  if (req.method === "POST") {
    let event = req.body.events[0];
      switch (event.type) {
        case 'message':
          if (event.message.type === 'image') {
            //reply(req);
            doImage(event);
            //reply(req);
          } else if (event.message.type === 'text' && event.message.text === 'ลงทะเบียนอุปกรณ์') {
              reply(event.replyToken, {
                "type": "text",
                "text": "กรุณาถ่ายรูปอุปกรณ์",
                "quickReply": {
                  "items": [
                    {
                      "type": "action",
                      "action": {
                        "type": "camera",
                        "label": "คลิกเพื่อเปิดกล้อง"
                      }
                    }
                  ]
                }
            });
          }else if (event.message.type === 'text' && event.message.text === 'รายงานสถานะโหนดต่างๆ') {
            let latest = await admin.database().ref('clients').once('value');
            console.log(latest);
            /*
            let latest = await admin.database().ref('logs').once('value')
            //reply(event.replyToken, { type: 'text', text: latest.val() })
            let latest = await admin.firestore().doc('logs/1').get()
            reply(event.replyToken, {
              type:'text',
              text:'ข้อมูลโหนด : '+latest.data().log_node+
                  '\nกระแสไฟฟ้า : '+latest.data().log_current+' แอมป์'+
                  '\nความต่างศักย์ไฟฟ้า : '+latest.data().log_voltage+' โวลต์'+
                  '\nกำลังไฟฟ้า : '+latest.data().log_power+' วัตต์'})
                  */
        }else if (event.message.type === 'text' && event.message.text === 'ลบและแก้ไขข้อมูลอุปกรณ์') {
          await admin.firestore().doc('Nodes/1').collection('uid').doc(event.source.userId).set({})
          reply(event.replyToken, {
            type:'text',
            text:'บันทึกข้อมูลเรียบร้อย' +event.source.userId})
      } 
        else {
            // [8.1]
          }
          break;
        case 'postback': {
          // [8.4]
          break;
        }
    }

  }
  return null;
});


const postToDialogflow = req => {
  req.headers.host = "bots.dialogflow.com";
  return request.post({
    uri: "https://bots.dialogflow.com/line/9245b4db-6082-4457-95c5-4b232bd439ab/webhook",
    headers: req.headers,
    body: JSON.stringify(req.body)
  });
};
const doImage = async (event) => {
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  let url = `${LINE_MESSAGING_API}/${event.message.id}/content`;
  if (event.message.contentProvider.type === 'external') {
    url = event.message.contentProvider.originalContentUrl;
  }
  //reply(event.replyToken, { type: 'text', text: 'ขอคิดแป๊บนะเตง...' });

  let buffer = await request.get({
    headers: LINE_HEADER,
    uri: url,
    encoding: null
  });

  const tempLocalFile = path.join(os.tmpdir(), 'temp.jpg');
  await fs.writeFileSync(tempLocalFile, buffer);

  const bucket = admin.storage().bucket("hw-project-f7b2c.appspot.com");
  await bucket.upload(tempLocalFile, {
    destination: `${event.source.userId+event.timestamp}.jpg`,
    metadata: { cacheControl: 'no-cache' }
  });

  fs.unlinkSync(tempLocalFile)
  reply(event.replyToken, { type: 'text', text: 'ขอคิดแป๊บนะเตง...'});
}
// Reply Message
const reply = (token, payload) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: token,
      messages: [payload]
    })
  })
};
