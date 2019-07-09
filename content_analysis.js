const MonkeyLearn = require('monkeylearn')
const ml = new MonkeyLearn(process.env.MONKEYLEARN_APIKEY)
let urgency_model_id = 'cl_Aiu8dfYF'
let support_model_id = 'cl_zBbUZ6dU'


module.exports = {
  classifyUrgency: function(transcript, callback){
    let data = [transcript]
    ml.classifiers.classify(urgency_model_id, data).then(res => {
        var body = res.body[0]
        var result = {}
        if (body.error == false){
          var classification = body.classifications[0]
          result['status'] = classification.tag_name
          var scaled = (classification.confidence * 10)
          if (classification.tag_name == "Urgent"){
            result['confidence'] = Math.ceil((scaled / 2) + 5)
          }else{
            result['confidence'] = Math.ceil(scaled / 2)
          }
        }else{
          console.log("Error: " + JSON.stringify(body))
        }
        callback(null, result)
    })
  },
  classifyCategory: function(transcript, callback){
    let data = [transcript]
    ml.classifiers.classify(support_model_id, data).then(res => {
        var body = res.body[0]
        var result = null
        if (body.error == false){
          var confidence_score = 0
          for (var item of body.classifications){
            if (item.confidence > confidence_score){
              result = {
                category: item.tag_name,
                confidence: item.confidence
              }
              console.log(JSON.stringify(result))
              confidence_score = item.confidence
            }
          }
        }else{
          console.log("Error: " + JSON.stringify(body))
        }
        callback(null, result)
    })
  }
}

var topicSample = []
// "I was billed twice for the service and this is the second time it has happened. Can you please look into this matter right away?"
