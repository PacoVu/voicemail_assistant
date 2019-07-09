const pgdb = require('./db')
module.exports = {
    deleteSubscription: function(platform, extId, callback){
      var query = "SELECT sub_id FROM vva_users WHERE ext_id=" + extId
      pgdb.read(query, (err, result) => {
          if (!err){
            var row = result.rows[0]
            if (row['sub_id'] != ""){
              console.log(row['sub_id'])
              deleteSubscription(platform, row['sub_id'], function(err, result){
                callback(null, true)
                var query = "UPDATE vva_users SET sub_id='' WHERE ext_id=" + extId
                console.log("UPDATE Sub Id: " + query)
                pgdb.update(query, (err, result) => {
                  if (err){
                    console.error(err.message);
                  }
                  console.log("subscription id reset")
                })
              })
            }
          }
      });
    },
    enableSubscription: function (platform, extId, subscriptionId, callback){
      if (subscriptionId == "")
        startWebhookSubscription(platform, extId, callback)
      else{
        deleteSubscription(platform, subscriptionId, function(err, result){
          startWebhookSubscription(platform, extId, callback)
        })
      }
    }
}

function startWebhookSubscription(platform, extId, callback) {
  var _eventFilters = [
    '/restapi/v1.0/account/~/extension/~/voicemail',
  ];
  platform.post('/subscription',
      {
          eventFilters: _eventFilters,
          deliveryMode: {
              transportType: 'WebHook',
              address: process.env.DELIVERY_MODE_ADDRESS
          }
      })
      .then(function(response) {
          console.log("Ready to receive voicemail notification via WebHook.")
          var jsonObj = response.json();
          callback(null, jsonObj.id)
          var query = "UPDATE vva_users SET sub_id='" + jsonObj.id + "' WHERE ext_id=" + extId
          console.log("UPDATE Sub Id: " + query)
          pgdb.update(query, (err, result) => {
            if (err){
              console.error(err.message);
            }
            console.log("save subId: " + result)
          })
      })
      .catch(function(e) {
        console.error(e.message);
        callback(e.message, "")
      });
}

function checkRegisteredSubscription(platform, subscriptionId, callback) {
    platform.get('/subscription')
        .then(function (response) {
          var data = response.json();
          if (data.records.length > 0){
            for(var record of data.records) {
              if (record.id == subscriptionId) {
                if (record.deliveryMode.transportType == "WebHook"){
                  if (record.status != "Active"){
                    console.log("subscription is not active. Renew it")
                    p.post('/subscription/' + record.id + "/renew")
                      .then(function (response) {
                        console.log("updated: " + record.id)
                        callback(null, subscriptionId)
                      })
                      .catch(function(e) {
                        console.error(e);
                        callback(e.message, "Cannot renew")
                      });
                  }else {
                    console.log("subscription is active. Good to go.")
                    console.log("sub status: " + record.status)
                    callback(null, subscriptionId)
                  }
                }
              }
            }
          }else{
            // no existing subscription for this service. Not likely getting here
            console.log("No subscription for this service => Create one")
            //startWebhookSubscription(platform, "")
            callback("NotFound", "")
          }
        })
        .catch(function(e) {
          console.error(e);
          callback(e.message, "")
        });
}
/*
function removeAllRegisteredSubscription(platform, extId) {
    console.log("removeAllRegisteredSubscription")
    var query = "SELECT sub_id FROM vva_users WHERE ext_id=" + extId
    console.log(query)
    pgdb.read(query, (err, result) => {
        if (!err){
          var row = result.rows[0]
          if (row['sub_id'] != ""){
            console.log(row['sub_id'])
            deleteSubscription(platform, row['sub_id'])
            var query = "UPDATE vva_users SET sub_id='' WHERE ext_id=" + extId
            console.log("UPDATE Sub Id: " + query)
            pgdb.update(query, (err, result) => {
              if (err){
                console.error(err.message);
              }
              console.log("subscription id reset")
            })
          }
        }
    });
}
*/
function deleteSubscription(p, subscriptionId, callback) {
    p.delete('/subscription/' + subscriptionId)
      .then(function (response) {
        console.log("subscription deleted")
        callback(null, "subscription deleted")
      })
      .catch(function(e) {
        console.log("cannot delete subscription")
        callback(e, "cannot delete subscription")
      });
}
