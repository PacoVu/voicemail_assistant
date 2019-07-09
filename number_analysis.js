var request=require('request');
const pgdb = require('./db')

module.exports = {
  spamNumberDetectionLocal: function(phoneNumber, callback){
    console.log("spamNumberDetection: " + phoneNumber)
    readPhoneReputation(phoneNumber, function(err, result){
      if (err){
        callback("notfound", result)
      }else{
        console.log("Spam info found. Use local db")
        callback(null, result)
      }
    })
  },
  spamNumberDetectionRemote: function(phoneNumber, callback){
      var url = "https://proapi.whitepages.com/3.0/phone_reputation?api_key=" + process.env.WHITEPAGES_PHONE_REPUTATION_APIKEY
      url += "&phone=" + phoneNumber
      request.get(url, function(err, res, body){
          if(err){
            callback(err, "")
          }else if(res.statusCode == 200 ){
            var jsonObj = JSON.parse(body)
            var phoneNumberInfo = {}
            if (jsonObj.hasOwnProperty("reputation_level"))
              phoneNumberInfo['reputation_level'] = jsonObj.reputation_level
            else
              phoneNumberInfo['reputation_level'] = 0
            if (jsonObj.hasOwnProperty("reputation_details"))
              phoneNumberInfo['reputation_details'] = jsonObj.reputation_details
            else{
              phoneNumberInfo['reputation_details'] = {
                score: 0,
                type: null,
                category: null
                }
            }
            if (jsonObj.hasOwnProperty("volume_score"))
              phoneNumberInfo['volume_score'] = jsonObj.volume_score
            else
              phoneNumberInfo['volume_score'] = 0
            if (jsonObj.hasOwnProperty("report_count"))
              phoneNumberInfo['report_count'] = jsonObj.report_count
            else
              phoneNumberInfo['report_count'] = 0

            phoneNumberInfo['phone_number'] = phoneNumber
            storePhoneReputation(phoneNumber, phoneNumberInfo)
            callback(null, phoneNumberInfo)
          }else{
            callback("failed", "")
          }
        });
  },
  addPhoneReputation: function(phoneNumber, item){
      storePhoneReputation(phoneNumber, item)
  },
  detectMobileNumberLocal: function(phoneNumber, callback){
      // can use phone_intel service from Whitepages pro
      // or lookup from own customer database
      var query = "SELECT phone_number_type FROM customers WHERE phone_number='" + phoneNumber +"'"
      console.log(query)
      pgdb.read(query, (err, result) => {
          if (err){
              console.log("cannot read sub_id from db")
              callback("err", null)
          }else{
            console.log(JSON.stringify(result.rows))
            if (result.rows.length > 0){
              var row = result.rows[0]
              callback(null, row['phone_number_type'])
            }else{
              console.log("Not found")
              callback("err", null)
            }
          }
      })
  },
  detectMobileNumberRemote: function(phoneNumber, callback){
      // can use phone_intel service from Whitepages pro
      // or lookup from own customer database
      var url = "https://proapi.whitepages.com/3.1/phone?api_key=" + process.env.WHITEPAGES_REVERSE_PHONE_APIKEY
      url += "&phone=" + phoneNumber
      request.get(url, function(err, res, body){
          if(err){
            callback(err, "")
          }else if(res.statusCode == 200 ){
            var jsonObj = JSON.parse(body)
            console.log(jsonObj.line_type)
            if (jsonObj.line_type == "Mobile" || jsonObj.line_type == "NonFixedVOIP")
              callback(null, "mobile")
            else
              callback(null, "landline")
          }else{
            callback(res.statusCode, "")
          }
        });
  },
  isCustomerPhoneNumber: function(customerTable, phoneNumber, callback){
      var query = "SELECT first_name, last_name, phone_number_type FROM " + customerTable + " WHERE phone_number='" + phoneNumber +"'"
      pgdb.read(query, (err, result) => {
          response = {}
          if (err){
              response['customer'] = false
              callback(null, response)
          }else{
            if (result.rows.length > 0){
              response['customer'] = true
              response['number_type'] = result.rows[0].phone_number_type
              response['fullName'] = result.rows[0].first_name + " " + result.rows[0].last_name
              callback(null, response)
            }else{
              response['customer'] = false
              callback(null, response)
            }
          }
      })
  }
}

function storePhoneReputation(phoneNumber, item){
  var query = "INSERT INTO phonereputation VALUES ($1, $2, $3, $4, $5, $6, $7)"
  var timestamp = new Date().getTime()
  var values = [phoneNumber, item.reputation_level, item.reputation_details.score, item.reputation_details.type, item.reputation_details.category, timestamp]
  query += " ON CONFLICT DO NOTHING"
  pgdb.insert(query, values, (err, result) =>  {
    if (err){
      console.error(err.message);
    }
    console.log("stored phone reputation")
  })
}

function updatePhoneReputation(phoneNumber, item){
  var timestamp = new Date().getTime()
  var query = "UPDATE phonereputation SET last_update=" + timestamp + " WHERE phone_number='" + phoneNumber + "'"
  console.log("CAT: " + item.reputation_details.category)
  var values = [phoneNumber, item.reputation_level, item.reputation_details.score, item.reputation_details.type, item.reputation_details.category, timestamp]
  console.log("VALUE: " + JSON.stringify(values))
  console.log("storePhoneReputation: " + query)
  pgdb.update(query, (err, result) => {
    if (err){
      console.error(err.message);
    }
    console.log("processed set to true")
    res.send({"status":"ok","message":"This voicemail is processed."})
  })
}

function readPhoneReputation(phoneNumber, callback){
  var query = "SELECT * FROM phonereputation WHERE phone_number='" + phoneNumber + "'"
  console.log(query)
  pgdb.read(query, (err, result) => {
      if (err){
          console.log("cannot read phone reputation from db")
          callback("err", {})
      }else{
        console.log("saved phone reputation")
        console.log(JSON.stringify(result.rows))
        if (result.rows.length > 0){
          var row = result.rows[0]
          var item = {
            reputation_level: row['reputation_level'],
            reputation_details: {
                score: row['reputation_score'],
                type: row['reputation_type'],
                category: row['reputation_category']
              },
            volume_score: row['volume_score'],
            report_count: row['report_count'],
            phone_number: row['phone_number']
          }
          callback(null, item)
        }else{
          console.log("Not found")
          callback("err", {})
        }
      }
  })
}
