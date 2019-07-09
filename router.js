const User = require('./usershandler.js')
require('dotenv').load()
const pgdb = require('./db')
var webhooks = require('./webhooks')

var async = require("async");
var users = []

function getUserIndex(id){
  //console.log("USERS LENGTH:" + users.length)
  for (var i=0; i<users.length; i++){
    var user = users[i]
    if (user != null){
      //console.log("USER ID:" + user.getUserId())
      if (id == user.getUserId()){
        return i
      }
    }
  }
  return -1
}

function getUserIndexByExtensionId(extId){
  //console.log("USERS LENGTH:" + users.length)
  for (var i=0; i<users.length; i++){
    var user = users[i]
    //console.log("EXTENSiON ID:" + user.getExtensionId())
    if (extId == user.getExtensionId()){
      return i
    }
  }
  return -1
}

var router = module.exports = {
  autoLogin: function(){
    var query = "SELECT * FROM vva_users"
    pgdb.read(query, (err, result) => {
        if (err){
            console.log("cannot read vva_users from db")
        }else{
          //console.log(JSON.stringify(result.rows[0]))
          async.each(result.rows,
          function(row, callback){
            if (row['access_token'] != ""){
              console.log(row['access_token'])
              var id = new Date().getTime()
              console.log(id)
              var user = new User(id, "production")
              user.setExtensionId(row['ext_id'])

              user.rc_platform.setPlatformToken(JSON.parse(row['access_token']))
              users.push(user)
            }
            if (row['sub_id'] != ""){
              console.log(row['sub_id'])
            }
            callback(null, row)
          },
          function (err){
            console.log("autoLogin done")
            //callback(err, null)
          })
        }
    });
  },
  loadLogin: function(req, res){
    if (req.session.userId == 0 || req.session.extensionId == 0) {
      var id = new Date().getTime()
      req.session.userId = id;
      var user = new User(id, req.query.env)
      users.push(user)
      var p = user.getPlatform()
      if (p != null){
        res.render('login', {
          authorize_uri: p.loginUrl({
            brandId: process.env.RINGCENTRAL_BRAND_ID,
            redirectUri: process.env.RC_APP_REDIRECT_URL
          }),
          redirect_uri: process.env.RC_APP_REDIRECT_URL,
          token_json: ''
        });
      }
    }else{
      var index = getUserIndex(req.session.userId)
      if (index >= 0)
        router.loadMainPage(req, res)
      else{
        this.forceLogin(req, res)
      }
    }
  },
  forceLogin: function(req, res){
    req.session.destroy();
    res.render('index')
  },
  login: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].login(req, res, function(err, extensionId){
      if (!err){
        for (var i = 0; i < users.length; i++){
          var extId = users[i].getExtensionId()
          var userId = users[i].getUserId()
          if (extId == extensionId && userId != req.session.userId){
            users[i] = null
            users.splice(i, 1);
            break
          }
        }
      }
    })
  },
  logout: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0){
      return this.forceLogin(req, res)
    }
    // reset token from db
    var query = "UPDATE vva_users SET access_token='' WHERE ext_id=" + req.session.extensionId
    pgdb.update(query, (err, result) => {
        if (err){
          console.error(err.message);
        }
        console.log("empty access_token")
    })
    var thisObj = this
    var platform = users[index].getPlatform()
    if (platform != null){
        webhooks.deleteSubscription(platform, req.session.extensionId, function(err, result){
          platform.logout()
            .then(function (token) {
              console.log("logged out")
            })
            .catch(function (e) {
              console.log('Logout err ' + e.message);
            });
          users[index] = null
          users.splice(index, 1);
          thisObj.forceLogin(req, res)
        })
    }else{
        users[index] = null
        users.splice(index, 1);
        thisObj.forceLogin(req, res)
    }
  },
  loadAboutPage: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    res.render('about', {
      userName: users[index].getUserName()
    })
  },
  loadMainPage: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    var query = "SELECT sub_id from vva_users WHERE ext_id=" + req.session.extensionId
    pgdb.read(query, (err, result) => {
        var subscriptionId = ""
        if (!err && result.rows.length > 0){
          subscriptionId = result.rows[0].sub_id
        }
        console.log("enableSubscription")
        var platform = users[index].getPlatform()
        if (platform != null){
          webhooks.enableSubscription(platform, req.session.extensionId, subscriptionId, function(err, result){
            if (err){
              console.log("cannot start subscription.")
            }
            users[index].setSubscriptionId(result)
            var formattedNumber =  formatPhoneNumber(users[index].phoneNumbers[0])
            res.render('main', {
                userName: users[index].getUserName(),
                phoneNumber: formattedNumber,
                userId: req.session.userId,
                extensionId: req.session.extensionId,
                categoryList: users[index].settings.categories,
                agentList: users[index].settings.agents
              })
          })
        }else{
          return this.forceLogin(req, res)
        }
    });
  },
  loadProcessItemPage: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].loadProcessItemPage(req, res)
  },
  loadSettingsPage:  function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].loadSettingsPage(req, res)
  },
  saveSettings: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].saveSettings(req, res)
  },
  updateAgent: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].updateAgent(req, res)
  },
  updateCategory: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].updateCategory(req, res)
  },
  sendSmsMessage: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].sendSmsMessage(req, res)
  },
  updatePhoneReputationDB: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].updatePhoneReputationDB(req, res)
  },
  deleteSelectedItems: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].deleteSelectedItems(req, res)
  },
  readVoiceMail: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].readVoiceMail(req, res)
  },
  pollForVoiceMail: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].pollForVoiceMail(res)
  },
  processVoicemailNotification: function(body, extensionId, subscriptionId){
    var index = getUserIndexByExtensionId(extensionId)
    if (index < 0)
      return
    if (users[index].getSubscriptionId() == subscriptionId)
      users[index].processVoicemailNotification(body)
    else
      console.log("not my subscription")
  },
  setProcessed: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].setProcessed(req, res)
  },
  createVoicemailUri: function(req, res){
    var index = getUserIndex(req.session.userId)
    if (index < 0)
      return this.forceLogin(req, res)
    users[index].createVoicemailUri(req, res)
  }
}

function formatPhoneNumber(phoneNumberString) {
  var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
  var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    var intlCode = (match[1] ? '+1 ' : '')
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('')
  }
  return phoneNumberString
}
