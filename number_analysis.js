var request=require('request');
const pgdb = require('./db')
var async = require("async");

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
  },
  createDemoPhoneReputation: function(callback){
    createDemoPhoneReputation(callback)
  }
}

function storePhoneReputation(phoneNumber, item){
  var query = "INSERT INTO phonereputation VALUES ($1, $2, $3, $4, $5, $6, $7)"
  var timestamp = new Date().getTime()
  var values = [phoneNumber, item.reputation_level, item.reputation_details.score, item.reputation_details.type, item.reputation_details.category, item.report_count, timestamp]
  query += " ON CONFLICT (phone_number) DO UPDATE SET"
  query += " reputation_level='" + item.reputation_level + "'"
  query += ", reputation_score='" + item.reputation_details.score + "'"
  query += ", reputation_type='" + item.reputation_details.type + "'"
  query += ", reputation_category='" + item.reputation_details.category + "'"
  query += ", report_count='" + item.report_count + "'"
  console.log(values)
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

function createDemoPhoneReputation(callback){
  var demoData = [
    { phoneNumber:"9294749128",level:4, score:91, type:"NuisanceType", category:"Telemarketer", count:74, timestamp:"1556206427822" },
    { phoneNumber:"2157108508",level:4, score:91, type:"RiskType", category:"VacationScam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"5084330816",level:4, score:91, type:"RiskType", category:"VacationScam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"4088511000",level:3, score:54, type:"NotApplicable", category:"Debt Collector", count:32, timestamp:"1556206427822" },
    { phoneNumber:"2069735132",level:3, score:1, type:"NotApplicable", category:"Political Call", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6502246623",level:2, score:91, type:"RiskType", category:"Phone Survey", count:32, timestamp:"1556206427822" },
    { phoneNumber:"2816488775",level:4, score:91, type:"RiskType", category:"Phishing", count:32, timestamp:"1556206427822" },
    { phoneNumber:"2025730012",level:3, score:91, type:"RiskType", category:"Extortion", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6502958113",level:4, score:91, type:"RiskType", category:"IRS Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"7574323544",level:3, score:54, type:"RiskType", category:"Tech Support Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6196583462",level:3, score:1, type:"NotApplicable", category:"Lucky Winner Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6502241277",level:2, score:91, type:"RiskType", category:"Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6507431904",level:3, score:91, type:"RiskType", category:"NonProfit", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6507291497",level:3, score:91, type:"RiskType", category:"TollFree Pumping", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6504099098",level:3, score:91, type:"Spam", category:"Other Spam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6505387008",level:3, score:54, type:"RiskType", category:"Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"4085942101",level:3, score:1, type:"NotApplicable", category:"Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6507123430",level:2, score:91, type:"RiskType", category:"Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6504099043",level:3, score:91, type:"RiskType", category:"Scam", count:32, timestamp:"1556206427822" },
    { phoneNumber:"6506949812",level:1, score:91, type:"Not Spam", category:"Clean", count:32, timestamp:"1556206427822" },
    { phoneNumber:"17242680235",level:3, score:91, type:"NotApplicable", category:"Other Spam", count:32, timestamp:"1556206427822" }
  ]
  var query = "SELECT * FROM phonereputation"
  console.log(query)
  pgdb.read(query, (err, result) => {
      if (err){
          console.log("cannot read phone reputation from db")
          callback("err", "Error")
      }else{
        if (result.rows.length == 0){
          async.each(demoData,
              function(item, moveon){
                var query = "INSERT INTO phonereputation VALUES ($1, $2, $3, $4, $5, $6, $7)"
                var values = [item.phoneNumber, item.level, item.score, item.type, item.category, item.count, item.timestamp]
                query += " ON CONFLICT (phone_number) DO UPDATE SET"
                query += " reputation_level=" + item.level
                query += ", reputation_score=" + item.score
                query += ", reputation_type='" + item.type + "'"
                query += ", reputation_category='" + item.category + "'"
                query += ", report_count=" + item.count
                query += ", last_update='" + item.timestamp + "'"
                console.log(values)
                pgdb.insert(query, values, (err, result) =>  {
                  if (err){
                    console.error(err.message);
                  }
                  console.log("stored phone reputation")
                  moveon(null, result)
                })
              },
              function (err){
                callback(null, "Done")
              })
        }else{
          callback(null, "Existed")
        }
      }
  })
}
/*
"9294749128"	4	91	"NuisanceType"	"Telemarketer"	74	"1556206427822"
"2157108508"	4	91	"RiskType"	"VacationScam"	59	"1558372065850"
"5084330816"	4	54	"RiskyType"	"VacationScam"	32	"1556205456706"
"4088511000"	3	54	"NotApplicable"	"Debt Collector"	32	"1556205459280"
"2069735132"	3	1	"NotApplicable"	"Political Call"	32	"1558367764817"
"6502246623"	3	1	"RiskyType"	"Phone Survey"	32	"1556206299332"
"2816488775"	3	91	"RiskyType"	"Phishing"	32	"1558371978733"
"2025730012"	3	1	"RiskyType"	"Extortion"	32	"1558371282591"
"6502958113"	3	1	"RiskyType"	"IRS Scam"	32	"1558372044681"
"7574323544"	3	91	"RiskyType"	"Tech Support Scam"	32	"1558372087549"
"6196583462"	3	54	"RiskyType"	"Lucky Winner Scam"	32	"1558372004742"
"6502241277"	3	1	"RiskyType"	"Scam"	32	"1558372121153"
"6507431904"	3	1	"NotApplicable"	"NonProfit"	32	"1558372025705"
"6507291497"	3	1	"RiskyType"	"TollFree Pumping"	32	"1558384498534"
"6504099098"	3	54	"Spam"	"Other Spam"	32	"1558384461308"
"6505387008"	3	54	"RiskyType"	"Scam"	32	"1558372107153"
"4085942101"	3	54	"RiskyType"	"Scam"	32	"1558371677844"
"6507123430"	3	54	"RiskyType"	"Scam"	32	"1558371951943"
"6504099043"	3	1	"RiskyType"	"Scam"	32	"1558384445969"
"6506949812"	3	54	"RiskyType"	"Scam"	32	"1558384478405"
"+17242680235"	1	54	"NotApplicable"	"Not Spam"	32	"1556205457325"
"+16502245476"	1	54	"NotSpam"	"Not Spam"	32	"1556143715351"
"+16505130930"	1	1	"NotSpam"	"Not Spam"	32	"1559580976997"
"4157754436"	1	1	"UncertainType"		0	"1560209926985"
"+17205980685"	1	1	"UncertainType"		0	"1560452417142"
"+16197619503"	1	1	"UncertainType"		0	"1560455336986"
"+14088070826"	1	1	"UncertainType"		0	"1560982327104"
"16502245476"	4	0		"Scam"	1	"1561075611377"
"+17752204114"	3	0	"null"	"Spam"	1	"1562799866240"
*/
