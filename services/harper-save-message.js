let axios = require('axios');

function harperSaveMessage(message, username, room) {
  // const dbUrl = process.env.HARPERDB_URL;
  // const dbPw = process.env.HARPERDB_PW;
 const dbUrl = "https://klenty-noormd.harperdbcloud.com"
const dbPw = "Basic a2xlbnR5Om5DNGxiTGUvNFsyVg=="
  if (!dbUrl || !dbPw) return null;
 console.log(dbUrl, dbPw, 'savemsg') 

  let data = JSON.stringify({
    operation: 'insert',
    schema: 'realtime_chat_app',
    table: 'messages',
    records: [
      {
        message,
        username,
        room,
      },
    ],
  });

  let config = {
    method: 'post',
    url: dbUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: dbPw,
    },
    data: data,
  };

  return new Promise((resolve, reject) => {
    axios(config)
      .then(function (response) {
        resolve(JSON.stringify(response.data));
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

module.exports = harperSaveMessage;
