var RC = require('ringcentral')
var fs = require('fs')
var async = require("async");
require('dotenv').load()


function RCPlatform(mode) {
  this.token_json = null
  this.extensionId = 0
  var rcsdk = null
  if (mode == "production"){
    rcsdk = new RC({
      server:RC.server.production,
      appKey: process.env.RC_CLIENT_ID_PROD,
      appSecret:process.env.RC_CLIENT_SECRET_PROD
    })
  }else if (mode == "sandbox"){
    rcsdk = new RC({
      server:RC.server.sandbox,
      appKey: process.env.RC_CLIENT_ID_SB,
      appSecret:process.env.RC_CLIENT_SECRET_SB
    })
  }
  this.platform = rcsdk.platform()
  return this
}

RCPlatform.prototype = {
  login: function(code, callback){
    var thisPlatform = this
    this.platform.login({
      code: code,
      redirectUri: process.env.RC_APP_REDIRECT_URL
    })
    .then(function (token) {
      var json = token.json()
      thisPlatform.token_json = json
      return callback(null, json.owner_id)
    })
    .catch(function (e) {
      console.log('PLATFORM LOGIN ERROR ' + e.message || 'Server cannot authorize user');
      return callback(e, e.message)
    });
  },
  logout: function(){
    this.platform.logout()
  },
  setExtensionId: function (extId){
    this.extensionId = extId
  },
  getSDKPlatform: function(){
      return this.platform
  },
  getPlatform: function(callback){
    if (this.platform.loggedIn()){
        callback(null, this.platform)
    }else{
        console.log("BOTH TOKEN TOKENS EXPIRED")
        console.log("CAN'T REFRESH: " + e.message)
        callback("Login", null)
    }
  },
  getTokenJson: function(){
    return this.token_json
  },
  setPlatformToken: function(token){
    this.platform.auth().setData(token)
  },
  storeAccessToken: function (){
    var query = "INSERT INTO users (ext_id, access_token, sub_id, settings)"
    query += " VALUES ($1, $2, $3, $4)"
    var values = [this.extensionId, this.token_json, "", ""]
    query += " ON CONFLICT (ext_id) DO UPDATE SET access_token = '" + this.token_json + "'"
    console.log("TOKEN: " + query)
    pgdb.insert(query, values, (err, result) =>  {
      if (err){
        console.error(err.message);
      }
      console.log("save token: " + result)
    })
  }
}

module.exports = RCPlatform;
