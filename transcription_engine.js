var revai = require('rev_ai')
var revai_client = new revai.REVAIClient(process.env.REVAI_APIKEY, "v1", null)

module.exports = {
    transcribe: function(recordingUrl, callback){
      var params = {
        media_url: encodeURI(recordingUrl),
        skip_diarization: "true",
        metadata: "This is a test"
      }
      revai_client.transcribe(params, function(err,resp,body){
        if (!err){
          if (body.status == "in_progress"){
            var jobId = body.id
            var poll = setInterval(function(){
              revai_client.getJobById(jobId, function(err,res,body){
                console.log("polling ... " + body.status)
                if (body.status == "transcribed"){
                  clearInterval(poll)
                  revai_client.getTranscription(body.id, function(err,resp,body){
                    var json = JSON.parse(body)
                    var transcript = ""
                    for (var item of json.monologues){
                      for (var element of item.elements){
                        transcript += element.value
                      }
                    }
                    callback(null, transcript)
                  })
                }else if (body.status == "failed"){
                  clearInterval(poll)
                  callback(body, "Failed! Please try again")
                }
              })
            },5000)
          }else{
            callback(body.status, "")
          }
        }else{
          callback(err, "")
        }
      })
    }
}
