var path = require('path')
var util = require('util')

require('dotenv').load();

var express = require('express');
var session = require('express-session');

var app = express();
app.use(session({ secret: 'this-is-a-secret-token', cookie: { maxAge: 24 * 60 * 60 * 1000 }}));
var bodyParser = require('body-parser');
var urlencoded = bodyParser.urlencoded({extended: false})

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(urlencoded);

var port = process.env.PORT || 5000

var server = require('http').createServer(app);
server.listen(port);
console.log("listen to port " + port)
var router = require('./router');

app.get('/', function (req, res) {
  if (req.session.extensionId != 0)
    router.logout(req, res)
  else{
    res.render('index')
  }
})
app.get('/index', function (req, res) {
  if (req.query.n != undefined && req.query.n == 1){
    router.logout(req, res)
  }else {
    res.render('index')
  }
})

app.get('/login', function (req, res) {
  req.session.cookie = { maxAge: 24 * 60 * 60 * 1000 }
  if (!req.session.hasOwnProperty("userId"))
    req.session.userId = 0;
    if (!req.session.hasOwnProperty("extensionId"))
      req.session.extensionId = 0;
  router.loadLogin(req, res)
})

app.get('/logout', function (req, res) {
  router.logout(req, res)
})

app.get('/loadmainpage', function (req, res) {
  if (req.session.extensionId != 0)
    router.loadMainPage(req, res)
  else{
    res.render('index')
  }
})

app.get('/about', function (req, res) {
  //router.loadAboutPage(req, res)
  res.render('about')
})

app.get('/oauth2callback', function(req, res){
  router.login(req, res)
})

app.post('/webhookcallback', function(req, res) {
    if(req.headers.hasOwnProperty("validation-token")) {
        res.setHeader('Validation-Token', req.headers['validation-token']);
        res.statusCode = 200;
        res.end();
    }else{
        var body = []
        req.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            var jsonObj = JSON.parse(body)
            if (jsonObj.event.indexOf('/voicemail') > -1)
              router.processVoicemailNotification(jsonObj.body, jsonObj.ownerId, jsonObj.subscriptionId)
        });
    }
})

app.get('/getcontent', function (req, res) {
  router.createVoicemailUri(req, res)
})

app.get('/markspam', function (req, res) {
  router.updatePhoneReputationDB(req, res)
})

app.get('/openitem', function (req, res) {
  router.loadProcessItemPage(req, res)
})

app.post('/sendsms', function (req, res) {
  router.sendSmsMessage(req, res)
})

app.post('/updatephonesource', function (req, res) {
  router.updatePhoneSource(req, res)
})

app.get('/settings', function (req, res) {
  router.loadSettingsPage(req, res)
})

app.post('/savesettings', function (req, res) {
  router.saveSettings(req, res)
})
app.post('/updateagent', function (req, res) {
  router.updateAgent(req, res)
})
app.post('/updatecategory', function (req, res) {
  router.updateCategory(req, res)
})

app.get('/deleteitem', function (req, res) {
  router.deleteSelectedItems(req, res)
})

app.get('/setprocessed', function (req, res) {
  router.setProcessed(req, res)
})

app.get('/read', function (req, res) {
  router.readVoiceMail(req, res)
})

app.get('/poll', function (req, res) {
  router.pollForVoiceMail(req, res)
})

// implement autologin
//router.autoLogin()
